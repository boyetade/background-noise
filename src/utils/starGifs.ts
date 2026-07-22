import { createGifFromDataUrls } from "./createGifFromFrames";
import { cropImageDataToStar } from "./starCrop";

export const STAR_COUNT = 3;
export const FRAMES_PER_STAR = 5;
export const STAR_OUTPUT_SIZE = 300;

export type StarRecordingResult = {
  frames: ImageData[];
  rotations: number[];
};

function splitFramesAcrossStars(frames: ImageData[]): ImageData[][] {
  return Array.from({ length: STAR_COUNT }, (_, starIndex) =>
    frames.slice(
      starIndex * FRAMES_PER_STAR,
      starIndex * FRAMES_PER_STAR + FRAMES_PER_STAR,
    ),
  );
}

export async function buildStarGifUrls(
  recordingResult: StarRecordingResult,
): Promise<(string | null)[]> {
  const frameGroups = splitFramesAcrossStars(recordingResult.frames);

  return Promise.all(
    frameGroups.map(async (group, starIndex) => {
      if (group.length === 0) {
        return null;
      }

      const croppedFrames = group.map((frame) =>
        cropImageDataToStar(
          frame,
          STAR_OUTPUT_SIZE,
          recordingResult.rotations[starIndex] ?? 0,
        ),
      );

      return createGifFromDataUrls(
        croppedFrames,
        STAR_OUTPUT_SIZE,
        STAR_OUTPUT_SIZE,
      );
    }),
  );
}

export function createStarRecordingResult(
  frames: ImageData[],
): StarRecordingResult {
  return {
    frames,
    rotations: Array.from(
      { length: STAR_COUNT },
      () => Math.random() * Math.PI * 2,
    ),
  };
}
