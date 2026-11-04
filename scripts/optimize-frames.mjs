/**
 * Converts the source video frames (large 1920x1080 PNGs) into web-ready WebP
 * variants used by the scroll-driven hero.
 *
 * Usage: npm run frames
 *
 * Source : assets/chimiBaconFrames/*.png  (kept outside public/)
 * Output : public/frames/chimibacon/<width>/frame_001.webp ...
 *
 * Frames are renumbered sequentially from the sorted source list, so gaps in
 * the original numbering (069, 074) do not create holes in the sequence.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "assets", "chimiBaconFrames");
const OUT_DIR = path.join(ROOT, "public", "frames", "chimibacon");

/** Desktop keeps enough resolution for a cinematic full-bleed hero. Mobile
 * gets a lighter variant to keep GPU memory and decoding time low. */
const VARIANTS = [
  { width: 1600, quality: 74 },
  { width: 960, quality: 70 },
];

const CONCURRENCY = 4;

async function mapLimit(items, limit, fn) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function main() {
  let entries;
  try {
    entries = await fs.readdir(SRC_DIR);
  } catch {
    throw new Error(`Source folder not found: ${SRC_DIR}`);
  }

  const sources = entries.filter((name) => /\.png$/i.test(name)).sort();
  if (!sources.length) throw new Error(`No PNG frames found in ${SRC_DIR}`);

  console.log(`Found ${sources.length} source frames.`);

  for (const variant of VARIANTS) {
    const dir = path.join(OUT_DIR, String(variant.width));
    await fs.mkdir(dir, { recursive: true });

    await mapLimit(sources, CONCURRENCY, async (name, index) => {
      const input = path.join(SRC_DIR, name);
      const output = path.join(dir, `frame_${String(index + 1).padStart(3, "0")}.webp`);
      try {
        await fs.access(output);
        return; // already generated; delete the folder to force a rebuild
      } catch {
        // generate below
      }
      await sharp(input)
        .rotate()
        .resize({ width: variant.width, withoutEnlargement: true, fit: "inside" })
        .webp({ quality: variant.quality, effort: 4, smartSubsample: true })
        .toFile(output);
      if ((index + 1) % 15 === 0 || index === sources.length - 1) {
        console.log(`  ${variant.width}px: ${index + 1}/${sources.length}`);
      }
    });

    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".webp"));
    let bytes = 0;
    for (const file of files) bytes += (await fs.stat(path.join(dir, file))).size;
    console.log(
      `  ${variant.width}px ready: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`,
    );
  }

  const meta = await sharp(path.join(SRC_DIR, sources[0])).metadata();
  console.log(
    `Sequence: ${sources.length} frames, source ${meta.width}x${meta.height} (aspect ${(meta.width / meta.height).toFixed(4)}).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
