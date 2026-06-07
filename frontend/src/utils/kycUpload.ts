/** اعتبارسنجی آپلود تصویر کارت ملی / شناسنامه — مرحله اول ثبت‌نام */
export const KYC_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const KYC_IMAGE_ACCEPT = "image/jpeg,image/png,.jpg,.jpeg,.png";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png"]);

export function validateKycIdImage(file: File | null): string | null {
  if (!file) return "تصویر کارت ملی یا شناسنامه الزامی است";

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_MIME.has(file.type) && !ALLOWED_EXT.has(ext)) {
    return "فقط فایل‌های JPG و PNG مجاز هستند";
  }
  if (file.size > KYC_IMAGE_MAX_BYTES) {
    return "حجم فایل حداکثر ۵ مگابایت باشد";
  }
  return null;
}

export function formatKycFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} مگابایت`;
}
