import type { Pixels } from "../types.ts";

export interface DecodedImage { readonly pixels: Pixels; readonly url: string; readonly revoke: boolean; }

export const decodeImage = async (source: Blob | string): Promise<DecodedImage> => {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const blob = typeof source === "string" ? await fetch(source).then(response => response.blob()) : source;
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) throw new Error("Canvas is unavailable.");
    ctx.clearRect(0, 0, width, height); ctx.drawImage(bitmap, 0, 0, width, height); bitmap.close();
    const image = ctx.getImageData(0, 0, width, height);
    return { pixels: { width, height, data: image.data }, url, revoke: typeof source !== "string" };
  } catch (error) { if (typeof source !== "string") URL.revokeObjectURL(url); throw error; }
};
