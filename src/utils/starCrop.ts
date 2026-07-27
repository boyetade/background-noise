import { Texture } from "pixi.js";

const STAR_POINTS = 5;
const STAR_INNER_RATIO = 0.5;

export const STAR_GIF_BACKGROUND = "#73061a";

export const STAR_BACKGROUND_COLORS = [
  STAR_GIF_BACKGROUND,
  "#2b48d9",
  "#1a5c3a",
  "#5c1a4a",
  "#8b4513",
  "#1e3a5f",
  "#6b2d5c",
  "#3d2b1f",
] as const;

export function pickNextStarBackgroundColor(currentColor: string): string {
  const current = currentColor.toLowerCase();
  const options = STAR_BACKGROUND_COLORS.filter(
    (color) => color.toLowerCase() !== current,
  );

  return (
    options[Math.floor(Math.random() * options.length)] ?? STAR_GIF_BACKGROUND
  );
}

function traceStarPath(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  points: number,
  innerRadius: number,
  outerRadius: number,
  rotationRadians = 0,
) {
  const step = Math.PI / points;
  let rotation = -Math.PI / 2 + rotationRadians;

  ctx.moveTo(
    centerX + outerRadius * Math.cos(rotation),
    centerY + outerRadius * Math.sin(rotation),
  );

  for (let i = 0; i < points; i += 1) {
    rotation += step;
    ctx.lineTo(
      centerX + innerRadius * Math.cos(rotation),
      centerY + innerRadius * Math.sin(rotation),
    );
    rotation += step;
    ctx.lineTo(
      centerX + outerRadius * Math.cos(rotation),
      centerY + outerRadius * Math.sin(rotation),
    );
  }

  ctx.closePath();
}

function cropCanvasToStar(
  sourceCanvas: HTMLCanvasElement,
  outputSize: number,
  rotationRadians = 0,
  backgroundColor: string = STAR_GIF_BACKGROUND,
): string {
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputSize;
  outputCanvas.height = outputSize;

  const ctx = outputCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create star crop canvas context");
  }

  const outerRadius = outputSize / 2;
  const innerRadius = outerRadius * STAR_INNER_RATIO;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, outputSize, outputSize);

  ctx.beginPath();
  traceStarPath(
    ctx,
    outputSize / 2,
    outputSize / 2,
    STAR_POINTS,
    innerRadius,
    outerRadius,
    rotationRadians,
  );
  ctx.clip();
  ctx.drawImage(sourceCanvas, 0, 0, outputSize, outputSize);

  return outputCanvas.toDataURL("image/png");
}

export function captureMirroredVideoFrame(
  video: HTMLVideoElement,
  outputSize: number,
): HTMLCanvasElement | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.translate(outputSize, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, outputSize, outputSize);

  return canvas;
}

export function cropVideoFrameToStar(
  video: HTMLVideoElement,
  outputSize = 300,
): string | null {
  const frameCanvas = captureMirroredVideoFrame(video, outputSize);
  if (!frameCanvas) {
    return null;
  }

  return cropCanvasToStar(frameCanvas, outputSize);
}

export function cropImageDataToStar(
  imageData: ImageData,
  outputSize = 300,
  rotationRadians = 0,
  backgroundColor: string = STAR_GIF_BACKGROUND,
): string {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = imageData.width;
  sourceCanvas.height = imageData.height;

  const sourceCtx = sourceCanvas.getContext("2d");
  if (!sourceCtx) {
    throw new Error("Could not create source canvas context");
  }

  sourceCtx.putImageData(imageData, 0, 0);

  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = outputSize;
  scaledCanvas.height = outputSize;

  const scaledCtx = scaledCanvas.getContext("2d");
  if (!scaledCtx) {
    throw new Error("Could not create scaled canvas context");
  }

  scaledCtx.drawImage(sourceCanvas, 0, 0, outputSize, outputSize);

  return cropCanvasToStar(scaledCanvas, outputSize, rotationRadians, backgroundColor);
}

export function createStarPreviewTexture(dataUrl: string): Texture {
  return Texture.from(dataUrl);
}
