import type { Face } from "@tensorflow-models/face-landmarks-detection";

export const FACE_REGIONS = ["leftEye", "rightEye", "nose", "mouth"] as const;
export type FaceRegion = (typeof FACE_REGIONS)[number];

export const FACE_REGION_LABELS: Record<FaceRegion, string> = {
  leftEye: "left eye",
  rightEye: "right eye",
  nose: "nose",
  mouth: "mouth",
};

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const REGION_KEYPOINT_NAMES: Record<FaceRegion, string[]> = {
  leftEye: ["leftEye"],
  rightEye: ["rightEye"],
  nose: ["noseTip"],
  mouth: ["mouthCenter", "lips"],
};

const REGION_BOX_FRACTIONS: Record<
  FaceRegion,
  { x: number; y: number; width: number; height: number }
> = {
  leftEye: { x: 0.05, y: 0.12, width: 0.45, height: 0.28 },
  rightEye: { x: 0.5, y: 0.12, width: 0.45, height: 0.28 },
  nose: { x: 0.28, y: 0.38, width: 0.44, height: 0.28 },
  mouth: { x: 0.18, y: 0.62, width: 0.64, height: 0.3 },
};

const MIN_REGION_SIZE = 48;
const ZOOM_PADDING = 1.6;

function boundsFromNamedKeypoints(
  face: Face,
  names: string[],
): CropRect | null {
  const points = face.keypoints.filter(
    (keypoint) => keypoint.name && names.includes(keypoint.name),
  );

  if (points.length === 0) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function boundsFromFaceBox(face: Face, region: FaceRegion): CropRect {
  const { xMin, yMin, width, height } = face.box;
  const fraction = REGION_BOX_FRACTIONS[region];

  return {
    x: xMin + width * fraction.x,
    y: yMin + height * fraction.y,
    width: width * fraction.width,
    height: height * fraction.height,
  };
}

function ensureMinimumSize(rect: CropRect, minSize: number): CropRect {
  const width = Math.max(rect.width, minSize);
  const height = Math.max(rect.height, minSize);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

export function getFaceRegionRect(face: Face, region: FaceRegion): CropRect {
  const keypointBounds = boundsFromNamedKeypoints(
    face,
    REGION_KEYPOINT_NAMES[region],
  );
  const baseRect = keypointBounds ?? boundsFromFaceBox(face, region);

  return ensureMinimumSize(baseRect, MIN_REGION_SIZE);
}

export function expandCropRect(
  rect: CropRect,
  canvasWidth: number,
  canvasHeight: number,
  padding = ZOOM_PADDING,
): CropRect {
  const paddedWidth = rect.width * padding;
  const paddedHeight = rect.height * padding;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  let x = centerX - paddedWidth / 2;
  let y = centerY - paddedHeight / 2;
  let width = paddedWidth;
  let height = paddedHeight;

  if (x < 0) {
    width += x;
    x = 0;
  }

  if (y < 0) {
    height += y;
    y = 0;
  }

  if (x + width > canvasWidth) {
    width = canvasWidth - x;
  }

  if (y + height > canvasHeight) {
    height = canvasHeight - y;
  }

  return {
    x,
    y,
    width: Math.max(width, MIN_REGION_SIZE),
    height: Math.max(height, MIN_REGION_SIZE),
  };
}

export function drawZoomedRegion(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  region: CropRect,
): void {
  const crop = expandCropRect(region, sourceWidth, sourceHeight);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    ctx.canvas.width,
    ctx.canvas.height,
  );
}

export const FRAMES_PER_ZOOM_SHIFT = 5;

export function pickDistinctFaceRegions(count: number): FaceRegion[] {
  const shuffled = [...FACE_REGIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, FACE_REGIONS.length));
}

export function pickRandomFaceRegion(exclude?: FaceRegion): FaceRegion {
  const options = exclude
    ? FACE_REGIONS.filter((region) => region !== exclude)
    : FACE_REGIONS;

  return options[Math.floor(Math.random() * options.length)];
}
