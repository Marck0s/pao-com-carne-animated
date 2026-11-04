import * as THREE from "three";
import { HERO_FRAME_ASPECT } from "@/lib/hero-frames";
import {
  releaseFrameTextureSource,
  type FrameStream,
} from "./frame-stream";

/**
 * Three.js renderer for the scroll-driven frame sequence.
 *
 * The DOM stage (sticky canvas, height, backdrop) is owned by the page. This
 * module only renders the current frame into the supplied canvas and exposes
 * an imperative API: no React state and no per-frame re-renders.
 */

export type FrameFitMode = "auto" | "cover" | "strip";

export interface FrameFitInfo {
  /** Resolved mode ("auto" is never returned). */
  mode: Exclude<FrameFitMode, "auto">;
  viewportAspect: number;
  planeWidth: number;
  planeHeight: number;
  planeX: number;
  planeY: number;
  focalY: number;
}

export interface FrameSceneOptions {
  canvas: HTMLCanvasElement;
  source: FrameStream;
  fit?: FrameFitMode;
  /** Strip width in viewport widths (default 150 = 150vw). */
  stripWidthVw?: number;
  /** Vertical centre of the strip, 0 = top, 1 = bottom (default 0.44). */
  stripCenterY?: number;
  /** Exponential smoothing time constant in ms (default 105). */
  smoothingMs?: number;
  /** Device pixel ratio cap (default 1.5). */
  maxPixelRatio?: number;
  onReady?: () => void;
  onError?: (error: unknown) => void;
  onProgress?: (loaded: number, total: number) => void;
}

export interface FrameScene {
  setTargetFrame(index: number): void;
  setActive(active: boolean): void;
  resize(): void;
  getDisplayedFrame(): number;
  getFit(): FrameFitInfo;
  dispose(): void;
}

const COVER_FOCAL_Y = 0.46;
const DEFAULT_STRIP_WIDTH_VW = 150;
const DEFAULT_STRIP_CENTER_Y = 0.44;
const DEFAULT_SMOOTHING_MS = 105;
const DEFAULT_MAX_PIXEL_RATIO = 1.5;

/**
 * React StrictMode runs effect cleanup -> setup on the same canvas in one
 * commit. `forceContextLoss()` is permanent for a canvas, so a synchronous
 * call in cleanup would kill the remounted scene. Track the latest scene that
 * claimed each canvas and only release the context once the canvas has stayed
 * abandoned for a microtask.
 */
const canvasClaims = new WeakMap<HTMLCanvasElement, object>();

export function createFrameScene(options: FrameSceneOptions): FrameScene {
  const { canvas, source } = options;
  const claim = {};
  canvasClaims.set(canvas, claim);

  const fitOption: FrameFitMode = options.fit ?? "auto";
  const stripWidthVw = Math.max(1, options.stripWidthVw ?? DEFAULT_STRIP_WIDTH_VW);
  const stripCenterY = clamp(options.stripCenterY ?? DEFAULT_STRIP_CENTER_Y, 0, 1);
  const smoothingMs = Math.max(16, options.smoothingMs ?? DEFAULT_SMOOTHING_MS);
  const maxPixelRatio = Math.max(0.5, options.maxPixelRatio ?? DEFAULT_MAX_PIXEL_RATIO);

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.OrthographicCamera | null = null;
  let geometry: THREE.PlaneGeometry | null = null;
  let material: THREE.MeshBasicMaterial | null = null;
  let mesh: THREE.Mesh | null = null;

  let currentTexture: THREE.Texture | null = null;
  let currentFit: FrameFitInfo = defaultFit();

  let rafId = 0;
  let active = true;
  let disposed = false;
  let failed = false;
  let contextLost = false;
  let dirty = true;
  let readyFired = false;

  let displayedFrame = 0;
  let targetFrame = 0;
  let lastTime = 0;

  let resizeObserver: ResizeObserver | null = null;
  let dprMedia: MediaQueryList | null = null;

  // ------------------------------------------------------------------- errors

  function reportError(error: unknown): void {
    if (disposed) return;
    try {
      options.onError?.(error);
    } catch {
      // Never let an error handler break the render loop.
    }
  }

  function handleContextLost(event: Event): void {
    event.preventDefault();
    if (disposed || contextLost) return;
    contextLost = true;
    stopLoop();
    reportError(new Error("WebGL context lost"));
  }

  // --------------------------------------------------------------------- fit

  function defaultFit(): FrameFitInfo {
    return {
      mode: "cover",
      viewportAspect: HERO_FRAME_ASPECT,
      planeWidth: HERO_FRAME_ASPECT,
      planeHeight: 1,
      planeX: 0,
      planeY: 0,
      focalY: COVER_FOCAL_Y,
    };
  }

  /**
   * All units are "viewport heights": the camera has top=0.5 / bottom=-0.5,
   * so the viewport is 1 unit tall and `aspect` units wide.
   */
  function resolveFit(width: number, height: number): FrameFitInfo {
    const viewportAspect = height > 0 ? width / height : HERO_FRAME_ASPECT;
    const mode: Exclude<FrameFitMode, "auto"> =
      fitOption === "auto" ? (height > width ? "strip" : "cover") : fitOption;

    if (mode === "strip") {
      let planeWidth = (stripWidthVw / 100) * viewportAspect;
      let planeHeight = planeWidth / HERO_FRAME_ASPECT;

      // "Contained fully vertically": never overflow the viewport in strip mode.
      if (planeHeight > 1) {
        planeHeight = 1;
        planeWidth = planeHeight * HERO_FRAME_ASPECT;
      }

      // Prefer the 44% optical centre, but never push the image outside the
      // viewport when there is no vertical slack.
      const maxY = Math.max(0, (1 - planeHeight) / 2);

      return {
        mode,
        viewportAspect,
        planeWidth,
        planeHeight,
        planeX: 0,
        planeY: clamp(0.5 - stripCenterY, -maxY, maxY),
        focalY: stripCenterY,
      };
    }

    // Cover: keep the image aspect, crop the overflowing axis, and bias the
    // crop so the subject around y=0.46 stays centred.
    const scale = Math.max(1, viewportAspect / HERO_FRAME_ASPECT);
    const planeHeight = scale;
    const planeWidth = HERO_FRAME_ASPECT * scale;

    // The focal offset may only use the available vertical slack; otherwise a
    // nearly-16:9 viewport would reveal a transparent strip at one edge.
    const maxY = Math.max(0, (planeHeight - 1) / 2);

    return {
      mode,
      viewportAspect,
      planeWidth,
      planeHeight,
      planeX: 0,
      planeY: clamp(planeHeight * (COVER_FOCAL_Y - 0.5), -maxY, maxY),
      focalY: COVER_FOCAL_Y,
    };
  }

  function applyFit(): void {
    if (!mesh) return;
    mesh.scale.set(currentFit.planeWidth, currentFit.planeHeight, 1);
    mesh.position.set(currentFit.planeX, currentFit.planeY, 0);
  }

  // ------------------------------------------------------------------ render

  function applyTexture(texture: THREE.Texture): void {
    if (!material || !renderer) return;

    // Only the null -> texture transition changes the shader defines; swapping
    // one texture for another just updates the sampler uniform.
    const needsProgramUpdate = material.map === null;

    currentTexture = texture;
    material.map = texture;
    if (needsProgramUpdate) material.needsUpdate = true;

    try {
      // Upload first, then release the CPU-side bitmap. THREE ignores
      // UNPACK_FLIP_Y for ImageBitmap, so createImageBitmap() already applied
      // the orientation expected by the default texture flipY.
      renderer.initTexture(texture);
      releaseFrameTextureSource(texture);
    } catch (error) {
      reportError(error);
    }
  }

  function render(): void {
    if (!renderer || !scene || !camera || disposed || failed || contextLost) return;

    try {
      renderer.render(scene, camera);
    } catch (error) {
      failed = true;
      stopLoop();
      reportError(error);
      return;
    }

    if (currentTexture && !readyFired) {
      readyFired = true;
      try {
        options.onReady?.();
      } catch (error) {
        reportError(error);
      }
    }
  }

  function loop(now: number): void {
    rafId = 0;
    if (disposed || failed || contextLost || !active) return;

    const dt = lastTime === 0 ? 16.7 : Math.min(Math.max(now - lastTime, 0), 100);
    lastTime = now;

    const distance = targetFrame - displayedFrame;
    if (Math.abs(distance) > 0.001) {
      const alpha = 1 - Math.exp(-dt / smoothingMs);
      displayedFrame += distance * alpha;
      if (Math.abs(targetFrame - displayedFrame) < 0.01) displayedFrame = targetFrame;
    } else if (displayedFrame !== targetFrame) {
      displayedFrame = targetFrame;
    }

    const resolved = Math.round(displayedFrame);
    const requested = source.getTexture(resolved);

    let shouldRender = false;
    if (requested && requested !== currentTexture) {
      applyTexture(requested);
      shouldRender = true;
    } else if (!currentTexture) {
      // First paint: use the closest decoded frame so the canvas never goes
      // blank while the exact requested frame is still in flight.
      const fallback = source.getNearest(resolved);
      if (fallback) {
        applyTexture(fallback);
        shouldRender = true;
      }
    }
    if (dirty) {
      dirty = false;
      shouldRender = true;
    }
    if (shouldRender) render();

    const settling = Math.abs(targetFrame - displayedFrame) > 0.001;
    const targetReady = requested !== null;

    // Idle: stop the RAF until setTargetFrame / setActive / resize wakes it up.
    if (!settling && targetReady && !dirty) {
      lastTime = 0;
      return;
    }

    rafId = requestAnimationFrame(loop);
  }

  function startLoop(): void {
    if (disposed || failed || contextLost || !active || rafId !== 0) return;
    if (typeof requestAnimationFrame !== "function") return;
    lastTime = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop(): void {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    lastTime = 0;
  }

  // ------------------------------------------------------------------- resize

  function measureSize(): { width: number; height: number } | null {
    const parent = canvas.parentElement;
    let width = parent?.clientWidth ?? 0;
    let height = parent?.clientHeight ?? 0;

    if (width < 1 || height < 1) {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }

    if (width < 1 || height < 1) {
      if (typeof window === "undefined") return null;
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
    }

    if (width < 1 || height < 1) return null;
    return { width, height };
  }

  function resize(): void {
    if (disposed || failed || contextLost || !renderer || !camera) return;

    const size = measureSize();
    if (!size) return;

    const { width, height } = size;
    const deviceDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const dpr = Math.min(Math.max(deviceDpr, 0.5), maxPixelRatio);

    if (Math.abs(renderer.getPixelRatio() - dpr) > 0.001) {
      renderer.setPixelRatio(dpr);
    }
    renderer.setSize(width, height, false);

    const aspect = width / height;
    camera.left = -aspect / 2;
    camera.right = aspect / 2;
    camera.top = 0.5;
    camera.bottom = -0.5;
    camera.updateProjectionMatrix();

    currentFit = resolveFit(width, height);
    applyFit();

    dirty = true;
    startLoop();
  }

  function handleWindowResize(): void {
    resize();
  }

  function handleDprChange(): void {
    resize();
    watchDpr();
  }

  function watchDpr(): void {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    if (dprMedia) {
      dprMedia.removeEventListener("change", handleDprChange);
      dprMedia = null;
    }

    const dpr = window.devicePixelRatio || 1;
    dprMedia = window.matchMedia(`(resolution: ${dpr}dppx)`);
    if (typeof dprMedia.addEventListener === "function") {
      dprMedia.addEventListener("change", handleDprChange);
    }
  }

  // -------------------------------------------------------------------- public

  function setTargetFrame(index: number): void {
    if (disposed || failed || !Number.isFinite(index)) return;

    const next = Math.max(0, Math.min(source.count - 1, Math.round(index)));
    const previous = targetFrame;
    targetFrame = next;

    if (next !== previous) {
      source.setFocus(next, next > previous ? 1 : -1);
      startLoop();
    }
  }

  function setActive(nextActive: boolean): void {
    if (disposed || failed) return;
    active = Boolean(nextActive);
    if (active) startLoop();
    else stopLoop();
  }

  function getDisplayedFrame(): number {
    return Math.round(displayedFrame);
  }

  function getFit(): FrameFitInfo {
    return currentFit;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;

    stopLoop();

    resizeObserver?.disconnect();
    resizeObserver = null;

    if (typeof window !== "undefined") {
      window.removeEventListener("resize", handleWindowResize);
    }
    if (dprMedia) {
      dprMedia.removeEventListener("change", handleDprChange);
      dprMedia = null;
    }

    canvas.removeEventListener("webglcontextlost", handleContextLost);

    source.setProgressListener?.(null);

    currentTexture = null;
    material?.dispose();
    geometry?.dispose();
    scene?.clear();

    material = null;
    geometry = null;
    mesh = null;
    scene = null;
    camera = null;

    if (renderer) {
      const rendererToDispose = renderer;
      renderer = null;

      try {
        rendererToDispose.dispose();
      } catch {
        // Already disposed.
      }

      // Skip the loss if a StrictMode/HMR remount reclaimed this canvas before
      // the microtask ran: forceContextLoss() would permanently poison the
      // context used by the new scene.
      const releaseContext = () => {
        if (canvasClaims.get(canvas) !== claim) return;
        canvasClaims.delete(canvas);
        try {
          rendererToDispose.forceContextLoss();
        } catch {
          // Context may already be gone.
        }
      };

      if (typeof queueMicrotask === "function") queueMicrotask(releaseContext);
      else void Promise.resolve().then(releaseContext);
    } else if (canvasClaims.get(canvas) === claim) {
      canvasClaims.delete(canvas);
    }
  }

  // --------------------------------------------------------------------- init

  const browser = typeof window !== "undefined" && typeof document !== "undefined";

  if (browser) {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setClearColor(0x000000, 0);

      const gl = renderer.getContext();
      if (gl && typeof gl.isContextLost === "function" && gl.isContextLost()) {
        throw new Error("WebGL context is unavailable");
      }

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
      camera.position.set(0, 0, 1);
      camera.lookAt(0, 0, 0);

      geometry = new THREE.PlaneGeometry(1, 1);
      material = new THREE.MeshBasicMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      canvas.addEventListener("webglcontextlost", handleContextLost, false);

      source.setProgressListener?.(options.onProgress ?? null);
      source.setFocus(0, 1);
      void source.prime().catch(reportError);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(canvas.parentElement ?? canvas);
      }
      window.addEventListener("resize", handleWindowResize, { passive: true });
      watchDpr();

      resize();
      startLoop();
    } catch (error) {
      failed = true;
      stopLoop();
      reportError(error);
    }
  } else {
    failed = true;
  }

  return {
    setTargetFrame,
    setActive,
    resize,
    getDisplayedFrame,
    getFit,
    dispose,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
