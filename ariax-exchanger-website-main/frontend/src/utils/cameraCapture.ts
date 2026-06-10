import { KYC_IMAGE_MAX_BYTES } from "./kycAttachments";

export async function previewToFile(preview: string, filename = "image.jpg"): Promise<File | null> {
  if (!preview) return null;
  try {
    const response = await fetch(preview);
    const blob = await response.blob();
    const type = blob.type || "image/jpeg";
    return new File([blob], filename, { type, lastModified: Date.now() });
  } catch {
    return null;
  }
}

export function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  filename: string,
  quality = 0.92
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("خطا در ثبت تصویر"));
          return;
        }
        resolve(new File([blob], filename, { type: "image/jpeg", lastModified: Date.now() }));
      },
      "image/jpeg",
      quality
    );
  });
}

/** Reduce JPEG quality until the file fits KYC size limits. */
export async function canvasToKycJpegFile(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<File> {
  for (const quality of [0.92, 0.85, 0.75, 0.65, 0.55]) {
    const file = await canvasToJpegFile(canvas, filename, quality);
    if (file.size <= KYC_IMAGE_MAX_BYTES) return file;
  }
  throw new Error("تصویر گرفته‌شده بیش از حد مجاز است؛ دوباره با نور بهتر تلاش کنید");
}
