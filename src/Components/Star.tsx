import { useMemo } from "react";
import { FACE_REGION_LABELS, type FaceRegion } from "../utils/faceZoom";
import {
  STAR_COUNT,
  STAR_FRAME_SLICES,
  STAR_OUTPUT_SIZE,
} from "../utils/starGifs";

const STAGE_PADDING_Y = 40;
const STAGE_PADDING_X = 10;
const STAGE_WIDTH = 640;
const STAGE_HEIGHT = 300;
const MIN_STAR_SPACING = 5;
const MAX_PLACEMENT_ATTEMPTS = 500;

type StarPosition = {
  x: number;
  y: number;
};

type StarBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function starsOverlapWithSpacing(
  a: StarPosition,
  b: StarPosition,
  size: number,
  spacing: number,
): boolean {
  return (
    a.x < b.x + size + spacing &&
    b.x < a.x + size + spacing &&
    a.y < b.y + size + spacing &&
    b.y < a.y + size + spacing
  );
}

function isValidStarPosition(
  position: StarPosition,
  placed: StarPosition[],
  size: number,
  spacing: number,
  bounds: StarBounds,
): boolean {
  if (
    position.x < bounds.minX ||
    position.y < bounds.minY ||
    position.x > bounds.maxX ||
    position.y > bounds.maxY
  ) {
    return false;
  }

  return !placed.some((existing) =>
    starsOverlapWithSpacing(position, existing, size, spacing),
  );
}

function createFallbackStarPositions(bounds: StarBounds): StarPosition[] {
  const cellWidth = STAR_OUTPUT_SIZE + MIN_STAR_SPACING;
  const cellHeight = STAR_OUTPUT_SIZE + MIN_STAR_SPACING;
  const cols = Math.max(
    1,
    Math.floor((bounds.maxX - bounds.minX + MIN_STAR_SPACING) / cellWidth),
  );

  return Array.from({ length: STAR_COUNT }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      x: bounds.minX + col * cellWidth,
      y: bounds.minY + row * cellHeight,
    };
  });
}

type StarProps = {
  hasRecording: boolean;
  starGifUrls: (string | null)[];
  faceRegions: FaceRegion[];
  isCreatingGifs: boolean;
  captureError: string | null;
};

function createPlacementBounds(): StarBounds {
  return {
    minX: STAGE_PADDING_X,
    minY: STAGE_PADDING_Y,
    maxX: STAGE_WIDTH - STAGE_PADDING_X - STAR_OUTPUT_SIZE,
    maxY: STAGE_HEIGHT - STAGE_PADDING_Y - STAR_OUTPUT_SIZE,
  };
}

function createRandomStarPositions(): StarPosition[] {
  const bounds = createPlacementBounds();
  const placed: StarPosition[] = [];

  for (let starIndex = 0; starIndex < STAR_COUNT; starIndex += 1) {
    let position: StarPosition | null = null;

    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
      const candidate: StarPosition = {
        x: bounds.minX + Math.random() * Math.max(0, bounds.maxX - bounds.minX),
        y: bounds.minY + Math.random() * Math.max(0, bounds.maxY - bounds.minY),
      };

      if (
        isValidStarPosition(
          candidate,
          placed,
          STAR_OUTPUT_SIZE,
          MIN_STAR_SPACING,
          bounds,
        )
      ) {
        position = candidate;
        break;
      }
    }

    if (!position) {
      return createFallbackStarPositions(bounds);
    }

    placed.push(position);
  }

  return placed;
}

export const Star = ({
  hasRecording,
  starGifUrls,
  faceRegions,
  isCreatingGifs,
  captureError,
}: StarProps) => {
  const createdGifCount = starGifUrls.filter(Boolean).length;
  const placementKey = faceRegions.join(",");

  const starPositions = useMemo(() => {
    if (!hasRecording || !placementKey) {
      return [];
    }

    return createRandomStarPositions();
  }, [hasRecording, placementKey]);

  return (
    <div>
      <p>Star crop GIFs (frames 2–5, 6–10, 11–15)</p>

      {!hasRecording && (
        <p className="text-gray-500">
          Record a video to see star-shaped GIF previews — each star shows a
          different part of your face.
        </p>
      )}

      {hasRecording && isCreatingGifs && (
        <p className="text-gray-500">Creating star GIFs...</p>
      )}

      {hasRecording && !isCreatingGifs && createdGifCount > 0 && (
        <p className="text-gray-500">
          Showing {createdGifCount} star GIF
          {createdGifCount === 1 ? "" : "s"}, one per face region.
        </p>
      )}

      {captureError && <p className="text-red-600">{captureError}</p>}

      {hasRecording && (
        <div className="mt-2">
          <div
            className="relative overflow-hidden bg-stage"
            style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
          >
            {starGifUrls.map((gifUrl, index) => {
              const position = starPositions[index];
              if (!position) {
                return null;
              }

              return (
                <div
                  key={index}
                  className="absolute"
                  style={{
                    left: position.x,
                    top: position.y,
                    width: STAR_OUTPUT_SIZE,
                    height: STAR_OUTPUT_SIZE,
                  }}
                >
                  {gifUrl ? (
                    <img
                      src={gifUrl}
                      alt={`Star crop GIF ${index + 1}`}
                      width={STAR_OUTPUT_SIZE}
                      height={STAR_OUTPUT_SIZE}
                      className="block"
                    />
                  ) : (
                    <div
                      className="border border-dashed border-white/60 bg-black/10"
                      style={{
                        width: STAR_OUTPUT_SIZE,
                        height: STAR_OUTPUT_SIZE,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="mt-2 flex flex-col gap-1"
            style={{ width: STAGE_WIDTH }}
          >
            {starGifUrls.map((_, index) => {
              const { frameStart, frameEnd } = STAR_FRAME_SLICES[index];
              const regionLabel = faceRegions[index]
                ? FACE_REGION_LABELS[faceRegions[index]]
                : null;

              return (
                <p key={index} className="m-0 text-sm text-gray-500">
                  Star {index + 1}
                  {regionLabel
                    ? ` · ${regionLabel} (frames ${frameStart}-${frameEnd})`
                    : ""}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
