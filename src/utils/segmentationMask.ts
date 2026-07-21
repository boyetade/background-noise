import type { BodySegmenter } from "@tensorflow-models/body-segmentation";

type Segmentation = Awaited<
  ReturnType<BodySegmenter["segmentPeople"]>
>[number];

const PERSON_ALPHA_THRESHOLD = 128;

export async function createAlignedPersonMask(
  segmentations: Segmentation[],
  width: number,
  height: number,
): Promise<ImageData> {
  const mask = new ImageData(width, height);

  if (segmentations.length === 0) {
    return mask;
  }

  const rawMask = await segmentations[0].mask.toImageData();

  if (rawMask.width === width && rawMask.height === height) {
    for (let i = 0; i < rawMask.data.length; i += 4) {
      mask.data[i + 3] =
        rawMask.data[i + 3] >= PERSON_ALPHA_THRESHOLD ? 255 : 0;
    }
    return mask;
  }

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = rawMask.width;
  sourceCanvas.height = rawMask.height;
  sourceCanvas.getContext("2d")!.putImageData(rawMask, 0, 0);

  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = width;
  scaledCanvas.height = height;
  const scaledCtx = scaledCanvas.getContext("2d")!;
  scaledCtx.drawImage(sourceCanvas, 0, 0, width, height);

  const scaledMask = scaledCtx.getImageData(0, 0, width, height);
  for (let i = 0; i < scaledMask.data.length; i += 4) {
    mask.data[i + 3] =
      scaledMask.data[i + 3] >= PERSON_ALPHA_THRESHOLD ? 255 : 0;
  }

  return mask;
}

export function isPersonPixel(mask: ImageData, index: number): boolean {
  return mask.data[index + 3] >= PERSON_ALPHA_THRESHOLD;
}

export function isBackgroundPixel(mask: ImageData, index: number): boolean {
  return !isPersonPixel(mask, index);
}
