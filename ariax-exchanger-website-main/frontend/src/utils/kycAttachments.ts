export const KYC_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const KYC_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const KYC_IMAGE_ACCEPT = "image/jpeg,image/png,.jpg,.jpeg,.png";
export const KYC_DOCUMENT_ACCEPT = "image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf";

const IMAGE_MIME = new Set(["image/jpeg", "image/png"]);
const DOCUMENT_MIME = new Set(["image/jpeg", "image/png", "application/pdf"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png"]);
const DOCUMENT_EXT = new Set(["jpg", "jpeg", "png", "pdf"]);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatKycFileSize(bytes: number): string {
  return formatBytes(bytes);
}

export function validateKycImage(file: File | null, label = "تصویر"): string | null {
  if (!file) return `${label} الزامی است`;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!IMAGE_MIME.has(file.type) && !IMAGE_EXT.has(extension)) {
    return `فقط فایل‌های JPG و PNG برای ${label} مجاز هستند`;
  }
  if (file.size > KYC_IMAGE_MAX_BYTES) {
    return `${label} باید حداکثر ۵ مگابایت باشد`;
  }
  return null;
}

export function validateKycDocument(file: File | null, label = "مدرک"): string | null {
  if (!file) return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!DOCUMENT_MIME.has(file.type) && !DOCUMENT_EXT.has(extension)) {
    return `فقط فایل‌های JPG، PNG و PDF برای ${label} مجاز هستند`;
  }
  if (file.size > KYC_DOCUMENT_MAX_BYTES) {
    return `${label} باید حداکثر ۱۰ مگابایت باشد`;
  }
  return null;
}
