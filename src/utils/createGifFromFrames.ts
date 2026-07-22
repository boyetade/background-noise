import gifshot from "gifshot";

const FRAME_DURATION = 5;

function imageDataToDataUrl(
  imageData: ImageData,
  flipHorizontal = true,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not get canvas context for GIF frame conversion");
  }

  if (flipHorizontal) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function createGifFromImages(
  images: string[],
  gifWidth: number,
  gifHeight: number,
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (images.length === 0) {
    return Promise.reject(new Error("No frames available to create a GIF"));
  }

  if (!gifshot.isSupported() || !gifshot.isExistingImagesGIFSupported()) {
    return Promise.reject(
      new Error("GIF creation is not supported in this browser"),
    );
  }

  return new Promise((resolve, reject) => {
    gifshot.createGIF(
      {
        images,
        gifWidth,
        gifHeight,
        frameDuration: FRAME_DURATION,
        numWorkers: 2,
        progressCallback: onProgress ?? (() => {}),
      },
      (result) => {
        if (result.error || !result.image) {
          reject(new Error(result.errorMsg ?? "Failed to create GIF"));
          return;
        }

        resolve(result.image);
      },
    );
  });
}

export function createGifFromFrames(
  frames: ImageData[],
  onProgress?: (progress: number) => void,
): Promise<string> {
  const firstFrame = frames[0];
  const images = frames.map((frame) => imageDataToDataUrl(frame));

  return createGifFromImages(
    images,
    firstFrame.width,
    firstFrame.height,
    onProgress,
  );
}

export function createGifFromDataUrls(
  images: string[],
  gifWidth: number,
  gifHeight: number,
  onProgress?: (progress: number) => void,
): Promise<string> {
  return createGifFromImages(images, gifWidth, gifHeight, onProgress);
}
