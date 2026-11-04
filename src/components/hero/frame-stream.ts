import * as THREE from "three";
import {
  HERO_FRAME_COUNT,
  clampFrameIndex,
  heroFrameUrl,
  type HeroFrameVariant,
} from "@/lib/hero-frames";

/**
 * Blob prefetch + decode pipeline for the hero frame sequence.
 *
 * - All compressed blobs are queued; the first `primeCount` (plus the frames
 *   near the focus) win before the background prefetch.
 * - Blobs stay in a byte-capped LRU so re-decoding a recently visited frame
 *   does not hit the network again.
 * - Bitmaps are decoded only around the current focus (max 2 at a time) and
 *   uploaded as THREE textures inside a small LRU window.
 */

export type FrameProgressListener = (loaded: number, total: number) => void;
export type FrameTextureListener = (texture: THREE.Texture, index: number) => void;
export type FrameErrorListener = (error: unknown, index?: number) => void;

export interface FrameStreamOptions {
  variant: HeroFrameVariant;
  count?: number;
  /** Textures kept on each side of the focus (desktop 5 => 11 textures, mobile 3 => 7). */
  textureRadius?: number;
  /** Blobs kept on each side of the focus for instant re-decoding. */
  prefetchRadius?: number;
  /** First N frames fetched before the rest of the background queue. */
  primeCount?: number;
  maxConcurrentFetches?: number;
  maxConcurrentDecodes?: number;
  onProgress?: FrameProgressListener;
  onTextureReady?: FrameTextureListener;
  onError?: FrameErrorListener;
}

export interface FrameStream {
  readonly count: number;
  readonly variant: HeroFrameVariant;
  getTexture(index: number): THREE.Texture | null;
  getNearest(index: number): THREE.Texture | null;
  setFocus(index: number, direction?: number): void;
  prime(): Promise<void>;
  dispose(): void;
  /** Internal hook used by frame-scene to surface download progress. */
  setProgressListener?(listener: FrameProgressListener | null): void;
}

const DEFAULT_PRIME_COUNT = 8;
const DEFAULT_MAX_FETCHES = 4;
const DEFAULT_MAX_DECODES = 2;
const MAX_BLOB_CACHE_BYTES = 5 * 1024 * 1024;
const TEXTURE_SOURCE_RELEASE_KEY = "__heroFrameReleaseSource";

const DESKTOP_TEXTURE_RADIUS = 5; // 11 textures
const MOBILE_TEXTURE_RADIUS = 3; // 7 textures
const DESKTOP_PREFETCH_RADIUS = 8;
const MOBILE_PREFETCH_RADIUS = 5;

interface BlobEntry {
  blob: Blob;
  lastUsed: number;
}

interface TextureEntry {
  texture: THREE.Texture;
  lastUsed: number;
}

interface DecodedSource {
  image: ImageBitmap | HTMLImageElement;
  release: () => void;
}

export function createFrameStream(options: FrameStreamOptions): FrameStream {
  const variant = options.variant;
  const count = Math.max(
    1,
    Math.min(HERO_FRAME_COUNT, Math.floor(options.count ?? HERO_FRAME_COUNT)),
  );

  const isMobile = variant === "mobile";
  const textureRadius = Math.max(
    1,
    Math.floor(options.textureRadius ?? (isMobile ? MOBILE_TEXTURE_RADIUS : DESKTOP_TEXTURE_RADIUS)),
  );
  const prefetchRadius = Math.max(
    textureRadius,
    Math.floor(options.prefetchRadius ?? (isMobile ? MOBILE_PREFETCH_RADIUS : DESKTOP_PREFETCH_RADIUS)),
  );
  const primeCount = Math.max(0, Math.floor(options.primeCount ?? DEFAULT_PRIME_COUNT));
  const maxConcurrentFetches = Math.max(
    1,
    Math.floor(options.maxConcurrentFetches ?? DEFAULT_MAX_FETCHES),
  );
  const maxConcurrentDecodes = Math.max(
    1,
    Math.floor(options.maxConcurrentDecodes ?? DEFAULT_MAX_DECODES),
  );
  const maxTextures = textureRadius * 2 + 1;

  let disposed = false;

  let focus = 0;
  let direction = 1;
  /** Most recently handed to the scene; never evicted before the scene swaps. */
  let lastServedIndex = -1;
  let textureTick = 0;
  let blobTick = 0;

  const blobs = new Map<number, BlobEntry>();
  let blobBytes = 0;

  const textures = new Map<number, TextureEntry>();

  const completed = new Set<number>();
  const failedFetches = new Set<number>();
  const failedDecodes = new Set<number>();
  const demand = new Set<number>();

  const fetchPending = new Set<number>();
  const fetchInFlight = new Map<number, AbortController>();
  let activeFetches = 0;

  const decodePending = new Set<number>();
  const decodeInFlight = new Set<number>();
  let activeDecodes = 0;

  let streamProgress = options.onProgress ?? null;
  let sceneProgress: FrameProgressListener | null = null;

  let firstTextureReady = false;
  let primeResolve: (() => void) | null = null;
  let primePromise: Promise<void> | null = null;

  function normalizeIndex(index: number): number {
    if (!Number.isFinite(index)) return 0;
    return Math.min(count - 1, clampFrameIndex(index));
  }

  function emitProgress(): void {
    if (disposed) return;
    const snapshot = completed.size;
    try {
      streamProgress?.(snapshot, count);
      sceneProgress?.(snapshot, count);
    } catch (error) {
      options.onError?.(error);
    }
  }

  function reportError(error: unknown, index?: number): void {
    if (disposed) return;
    try {
      options.onError?.(error, index);
    } catch {
      // A broken error handler must not stop the stream.
    }
  }

  function isAbortError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: unknown }).name === "AbortError"
    );
  }

  // ---------------------------------------------------------------- blob queue

  function fetchScore(index: number): number {
    const distance = Math.abs(index - focus);
    let score = distance;

    // The LCP partner frame and its neighbours always win.
    if (index < primeCount) score -= 1000;
    if (demand.has(index)) score -= 500;
    if (distance <= textureRadius) score -= 200;
    else if (distance <= prefetchRadius) score -= 50;

    // When scrubbing, fetch slightly ahead instead of behind.
    if (direction > 0 && index < focus) score += 4;
    else if (direction < 0 && index > focus) score += 4;

    return score;
  }

  function pumpFetches(): void {
    if (disposed) return;

    while (activeFetches < maxConcurrentFetches) {
      let best: number | null = null;
      let bestScore = Number.POSITIVE_INFINITY;

      for (const index of fetchPending) {
        if (blobs.has(index) || fetchInFlight.has(index) || failedFetches.has(index)) {
          fetchPending.delete(index);
          continue;
        }
        const score = fetchScore(index);
        if (score < bestScore) {
          best = index;
          bestScore = score;
        }
      }

      if (best === null) break;
      fetchPending.delete(best);
      startFetch(best);
    }

    maybeResolvePrime();
  }

  function startFetch(index: number): void {
    const controller = new AbortController();
    fetchInFlight.set(index, controller);
    activeFetches += 1;

    void (async () => {
      try {
        const response = await fetch(heroFrameUrl(index, variant), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Frame ${index + 1} failed with HTTP ${response.status}`);
        }
        const blob = await response.blob();
        if (disposed || controller.signal.aborted) return;

        storeBlob(index, blob);
        const wasNew = !completed.has(index);
        completed.add(index);
        if (wasNew) emitProgress();

        // A blob arriving for the visible area should turn into a texture now.
        if (Math.abs(index - focus) <= textureRadius || demand.has(index)) {
          ensureDecode(index);
        }
      } catch (error) {
        if (!disposed && !isAbortError(error)) {
          failedFetches.add(index);
          demand.delete(index);
          reportError(error, index);
        }
      } finally {
        if (fetchInFlight.get(index) === controller) fetchInFlight.delete(index);
        activeFetches = Math.max(0, activeFetches - 1);
        if (!disposed) {
          pumpFetches();
          pumpDecodes();
        }
      }
    })();
  }

  function storeBlob(index: number, blob: Blob): void {
    const previous = blobs.get(index);
    if (previous) blobBytes -= previous.blob.size;

    blobs.set(index, { blob, lastUsed: ++blobTick });
    blobBytes += blob.size;
    evictBlobs();
  }

  function isProtectedBlob(index: number): boolean {
    return (
      Math.abs(index - focus) <= prefetchRadius ||
      index === lastServedIndex ||
      decodePending.has(index) ||
      decodeInFlight.has(index)
    );
  }

  function evictBlobs(): void {
    if (blobBytes <= MAX_BLOB_CACHE_BYTES) return;

    const candidates: number[] = [];
    for (const index of blobs.keys()) {
      if (!isProtectedBlob(index)) candidates.push(index);
    }
    // Evict the farthest-from-focus blobs first.
    candidates.sort((a, b) => Math.abs(b - focus) - Math.abs(a - focus));

    for (const index of candidates) {
      if (blobBytes <= MAX_BLOB_CACHE_BYTES) break;
      const entry = blobs.get(index);
      if (!entry) continue;
      blobs.delete(index);
      blobBytes -= entry.blob.size;
    }
  }

  // -------------------------------------------------------------- decode queue

  function requestBlob(index: number): void {
    if (disposed || blobs.has(index) || failedFetches.has(index)) return;
    fetchPending.add(index);
    pumpFetches();
  }

  function ensureDecode(index: number): void {
    if (disposed || index < 0 || index >= count) return;
    if (
      textures.has(index) ||
      decodePending.has(index) ||
      decodeInFlight.has(index) ||
      failedDecodes.has(index)
    ) {
      return;
    }

    demand.add(index);
    const entry = blobs.get(index);
    if (!entry) {
      requestBlob(index);
      return;
    }

    entry.lastUsed = ++blobTick;
    decodePending.add(index);
    pumpDecodes();
  }

  function decodeScore(index: number): number {
    const distance = Math.abs(index - focus);
    let score = distance;
    if (index === focus) score -= 100;
    else if (demand.has(index)) score -= 50;
    if (direction > 0 && index < focus) score += 2;
    else if (direction < 0 && index > focus) score += 2;
    return score;
  }

  function pumpDecodes(): void {
    if (disposed) return;

    while (activeDecodes < maxConcurrentDecodes) {
      let best: number | null = null;
      let bestScore = Number.POSITIVE_INFINITY;

      for (const index of decodePending) {
        if (textures.has(index) || decodeInFlight.has(index) || failedDecodes.has(index)) {
          decodePending.delete(index);
          demand.delete(index);
          continue;
        }

        const entry = blobs.get(index);
        if (!entry) {
          decodePending.delete(index);
          requestBlob(index);
          continue;
        }

        const score = decodeScore(index);
        if (score < bestScore) {
          best = index;
          bestScore = score;
        }
      }

      if (best === null) break;
      decodePending.delete(best);
      startDecode(best);
    }

    pumpFetches();
    maybeResolvePrime();
  }

  function startDecode(index: number): void {
    const entry = blobs.get(index);
    if (!entry) {
      requestBlob(index);
      return;
    }

    entry.lastUsed = ++blobTick;
    activeDecodes += 1;
    decodeInFlight.add(index);

    void decodeBlob(entry.blob)
      .then((source) => {
        if (disposed) {
          source.release();
          return;
        }

        const texture = createTexture(source);
        const keep =
          Math.abs(index - focus) <= textureRadius ||
          index === lastServedIndex ||
          demand.has(index);
        if (!keep) {
          releaseTextureSource(texture);
          texture.dispose();
          return;
        }

        const existing = textures.get(index);
        if (existing) {
          releaseTextureSource(texture);
          texture.dispose();
          return;
        }

        textures.set(index, { texture, lastUsed: ++textureTick });
        demand.delete(index);
        pruneTextures();

        if (!firstTextureReady) {
          firstTextureReady = true;
          primeResolve?.();
          primeResolve = null;
        }

        try {
          options.onTextureReady?.(texture, index);
        } catch (error) {
          reportError(error, index);
        }
      })
      .catch((error: unknown) => {
        if (disposed) return;
        failedDecodes.add(index);
        demand.delete(index);
        reportError(error, index);
      })
      .finally(() => {
        decodeInFlight.delete(index);
        activeDecodes = Math.max(0, activeDecodes - 1);
        if (!disposed) {
          pumpDecodes();
          pumpFetches();
        }
        maybeResolvePrime();
      });
  }

  /**
   * Never leave `prime()` pending forever when the network fails completely.
   * It resolves as soon as a real texture exists, or when there is no work
   * left that could produce one.
   */
  function maybeResolvePrime(): void {
    if (firstTextureReady || disposed || !primeResolve) return;
    const busy =
      activeFetches > 0 ||
      fetchInFlight.size > 0 ||
      fetchPending.size > 0 ||
      activeDecodes > 0 ||
      decodeInFlight.size > 0 ||
      decodePending.size > 0 ||
      textures.size > 0;
    if (busy) return;
    primeResolve();
    primeResolve = null;
  }

  async function decodeBlob(blob: Blob): Promise<DecodedSource> {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: "flipY",
        premultiplyAlpha: "none",
        colorSpaceConversion: "none",
      });
      return {
        image: bitmap,
        release: () => {
          try {
            bitmap.close();
          } catch {
            // Already closed.
          }
        },
      };
    }

    // Fallback for browsers without createImageBitmap.
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    try {
      image.decoding = "async";
      image.src = objectUrl;
      await image.decode();
      return { image, release: () => undefined };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function createTexture(source: DecodedSource): THREE.Texture {
    const texture = new THREE.Texture(source.image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.premultiplyAlpha = false;
    texture.needsUpdate = true;
    texture.userData[TEXTURE_SOURCE_RELEASE_KEY] = source.release;
    return texture;
  }

  // ----------------------------------------------------------- texture window

  function pruneTextures(): void {
    for (const [index] of textures) {
      if (Math.abs(index - focus) > textureRadius && index !== lastServedIndex) {
        disposeTexture(index);
      }
    }

    while (textures.size > maxTextures) {
      let victim: number | null = null;
      let oldest = Number.POSITIVE_INFINITY;
      for (const [index, entry] of textures) {
        if (index === lastServedIndex) continue;
        if (entry.lastUsed < oldest) {
          oldest = entry.lastUsed;
          victim = index;
        }
      }
      if (victim === null) break;
      disposeTexture(victim);
    }
  }

  function disposeTexture(index: number): void {
    const entry = textures.get(index);
    if (!entry) return;
    textures.delete(index);
    releaseTextureSource(entry.texture);
    entry.texture.dispose();
    demand.delete(index);
  }

  // ------------------------------------------------------------------- public

  function getTexture(index: number): THREE.Texture | null {
    if (disposed) return null;
    const target = normalizeIndex(index);
    const entry = textures.get(target);
    if (!entry) return null;
    entry.lastUsed = ++textureTick;
    lastServedIndex = target;
    return entry.texture;
  }

  function getNearest(index: number): THREE.Texture | null {
    if (disposed) return null;
    const target = normalizeIndex(index);

    let bestIndex = -1;
    let bestEntry: TextureEntry | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const [textureIndex, entry] of textures) {
      const distance = Math.abs(textureIndex - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = textureIndex;
        bestEntry = entry;
      }
    }

    if (!bestEntry) return null;
    bestEntry.lastUsed = ++textureTick;
    lastServedIndex = bestIndex;
    return bestEntry.texture;
  }

  function setFocus(index: number, nextDirection = 1): void {
    if (disposed) return;

    const target = normalizeIndex(index);
    const previousFocus = focus;
    focus = target;
    if (Number.isFinite(nextDirection) && nextDirection !== 0) {
      direction = nextDirection > 0 ? 1 : -1;
    }

    // Drop far-away pending decodes, then prioritise the new window in the
    // direction the user is scrolling.
    for (const pending of decodePending) {
      if (Math.abs(pending - focus) > textureRadius) decodePending.delete(pending);
    }
    for (const demanded of demand) {
      if (Math.abs(demanded - focus) > textureRadius) demand.delete(demanded);
    }

    if (target !== previousFocus) pruneTextures();
    evictBlobs();

    const offsets: number[] = [0];
    for (let offset = 1; offset <= textureRadius; offset += 1) {
      if (direction >= 0) offsets.push(offset, -offset);
      else offsets.push(-offset, offset);
    }
    for (const offset of offsets) ensureDecode(focus + offset);

    // Re-admit missing blobs in the prefetch band (they may have been evicted).
    const from = Math.max(0, focus - prefetchRadius);
    const to = Math.min(count - 1, focus + prefetchRadius);
    for (let i = from; i <= to; i += 1) {
      if (!blobs.has(i) && !failedFetches.has(i)) fetchPending.add(i);
    }

    pumpFetches();
    pumpDecodes();
  }

  function prime(): Promise<void> {
    if (disposed || firstTextureReady) return Promise.resolve();
    if (!primePromise) {
      primePromise = new Promise<void>((resolve) => {
        primeResolve = resolve;
      });
    }
    ensureDecode(0);
    maybeResolvePrime();
    return primePromise;
  }

  function setProgressListener(listener: FrameProgressListener | null): void {
    sceneProgress = listener;
    if (listener) {
      try {
        listener(completed.size, count);
      } catch (error) {
        reportError(error);
      }
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;

    for (const controller of fetchInFlight.values()) {
      controller.abort();
    }
    fetchInFlight.clear();
    fetchPending.clear();
    decodePending.clear();
    decodeInFlight.clear();
    demand.clear();
    failedFetches.clear();
    failedDecodes.clear();

    for (const index of [...textures.keys()]) {
      disposeTexture(index);
    }
    textures.clear();
    blobs.clear();
    completed.clear();
    blobBytes = 0;

    primeResolve?.();
    primeResolve = null;
    primePromise = null;
    streamProgress = null;
    sceneProgress = null;
  }

  // Kick off the background prefetch immediately. The first frames and the
  // focus window are prioritised by fetchScore().
  for (let i = 0; i < count; i += 1) fetchPending.add(i);
  emitProgress();
  setFocus(0, 1);

  return {
    count,
    variant,
    getTexture,
    getNearest,
    setFocus,
    prime,
    dispose,
    setProgressListener,
  };
}

/**
 * Releases the ImageBitmap backing a stream texture. frame-scene calls this
 * right after renderer.initTexture() has uploaded the pixels to the GPU.
 */
export function releaseFrameTextureSource(texture: THREE.Texture): void {
  const release = texture.userData?.[TEXTURE_SOURCE_RELEASE_KEY] as unknown;
  if (typeof release !== "function") return;
  try {
    (release as () => void)();
  } catch {
    // Ignore double-close / detached bitmaps.
  }
  delete texture.userData[TEXTURE_SOURCE_RELEASE_KEY];
}

function releaseTextureSource(texture: THREE.Texture): void {
  releaseFrameTextureSource(texture);
}
