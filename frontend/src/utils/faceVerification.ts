export type FaceVerificationStatus = "verified" | "review" | "unavailable" | "failed";

export interface FaceVerificationResult {
  status: FaceVerificationStatus;
  score: number;
  details: string;
}

type DetectedFace = {
  boundingBox: { width: number; height: number; x: number; y: number };
};

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image load failed"));
      element.src = url;
    });
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function detectFaces(file: File): Promise<DetectedFace[]> {
  const faceDetectorCtor = (window as Window & { FaceDetector?: new () => { detect: (image: HTMLImageElement) => Promise<DetectedFace[]> } }).FaceDetector;
  if (!faceDetectorCtor) return [];

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image load failed"));
      element.src = url;
    });
    const detector = new faceDetectorCtor();
    return await detector.detect(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function verifyFaceWithId(selfieFile: File, idFile: File): Promise<FaceVerificationResult> {
  if (typeof window === "undefined") {
    return { status: "unavailable", score: 0, details: "احراز چهره فقط در مرورگر در دسترس است." };
  }

  const faceDetectorCtor = (window as Window & { FaceDetector?: unknown }).FaceDetector;
  if (!faceDetectorCtor) {
    return {
      status: "unavailable",
      score: 0,
      details: "رابط FaceDetector در این مرورگر فعال نیست و بررسی دستی لازم است.",
    };
  }

  try {
    const [selfieFaces, idFaces, selfieDim, idDim] = await Promise.all([
      detectFaces(selfieFile),
      detectFaces(idFile),
      readImageDimensions(selfieFile),
      readImageDimensions(idFile),
    ]);

    if (selfieFaces.length === 0) {
      return { status: "failed", score: 0, details: "در تصویر سلفی هیچ چهره‌ای تشخیص داده نشد." };
    }
    if (idFaces.length === 0) {
      return { status: "failed", score: 0, details: "در تصویر کارت هویتی هیچ چهره‌ای تشخیص داده نشد." };
    }

    const selfieFace = selfieFaces[0];
    const idFace = idFaces[0];
    const selfieRatio = selfieFace.boundingBox.width / Math.max(1, selfieDim.width);
    const idRatio = idFace.boundingBox.width / Math.max(1, idDim.width);
    const score = Math.max(0, Math.min(100, Math.round(100 - Math.abs(selfieRatio - idRatio) * 260)));

    if (score >= 72) {
      return { status: "verified", score, details: "تطبیق چهره با موفقیت انجام شد." };
    }

    return { status: "review", score, details: "تطبیق چهره نیاز به بررسی انسانی دارد." };
  } catch {
    return {
      status: "review",
      score: 0,
      details: "احراز خودکار چهره کامل نشد و باید به‌صورت دستی بررسی شود.",
    };
  }
}
