import type { FaceRegion } from "./faceZoom";
import { createGifFromDataUrls } from "./createGifFromFrames";
import { cropImageDataToStar } from "./starCrop";

export const STAR_COUNT = 3;
export const FRAMES_PER_STAR = 5;
export const STAR_OUTPUT_SIZE = 300;

export const STAR_FRAME_SLICES = [
  { frameStart: 2, frameEnd: 5, startIndex: 1, endIndex: 5 },
  { frameStart: 6, frameEnd: 10, startIndex: 5, endIndex: 10 },
  { frameStart: 11, frameEnd: 15, startIndex: 10, endIndex: 15 },
] as const;

export type StarRecordingResult = {
  frames: ImageData[];
  faceRegions: FaceRegion[];
  starRotations: number[];
};

function splitFramesAcrossStars(frames: ImageData[]): ImageData[][] {
  return STAR_FRAME_SLICES.map(({ startIndex, endIndex }) =>
    frames.slice(startIndex, endIndex),
  );
}

export function createStarRecordingResult(
  frames: ImageData[],
  faceRegions: FaceRegion[],
): StarRecordingResult {
  return {
    frames,
    faceRegions: faceRegions.slice(0, STAR_COUNT),
    starRotations: Array.from(
      { length: STAR_COUNT },
      () => Math.random() * Math.PI * 2,
    ),
  };
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
          recordingResult.starRotations[starIndex] ?? 0,
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
