// Shrinks a banner in the browser before it uploads, so creators on cheap
// phones and expensive data load it fast (campaign creation plan, screen 4).
// The longest side becomes at most 1280px, saved as WebP (JPEG where the
// browser can't write WebP), stepping the quality down until it's under
// about 200KB.

const MAX_SIDE = 1280;
const TARGET_BYTES = 200 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressBanner(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare the image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let best: Blob | null = null;
  for (const quality of [0.82, 0.72, 0.6, 0.5]) {
    let blob = await toBlob(canvas, "image/webp", quality);
    // Older Safari ignores WebP and hands back a PNG
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (!blob) continue;
    best = blob;
    if (blob.size <= TARGET_BYTES) break;
  }
  if (!best) throw new Error("This browser can't prepare the image.");

  // Never make a small file bigger
  if (best.size >= file.size && ["image/webp", "image/jpeg"].includes(file.type) && scale === 1) return file;
  const extension = best.type === "image/webp" ? "webp" : "jpg";
  return new File([best], `banner.${extension}`, { type: best.type });
}
