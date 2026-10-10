// Browser-side: shrink a photo before upload (smaller upload, same readability). Client components only.
export type ShrunkImage = { name: string; mediaType: "image/jpeg"; data: string; preview: string };

export async function shrinkImage(file: File, maxSide = 1400): Promise<ShrunkImage> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  URL.revokeObjectURL(url);
  return { name: file.name, mediaType: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl };
}
