import "../pixi/setup";
import { Application } from "@pixi/react";
import { useCallback, useMemo } from "react";
import type { Graphics } from "pixi.js";
import { type FaceRegion } from "../utils/faceZoom";
import { STAR_COUNT, STAR_OUTPUT_SIZE } from "../utils/starGifs";

export const DEFAULT_STAGE_WIDTH = 800;
export const DEFAULT_STAGE_HEIGHT = 200;
export const DEFAULT_STAGE_COLOR = "#73061a";

const STAGE_PADDING_Y = 40;
const STAGE_PADDING_X = 10;
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
  stageWidth?: number;
  stageHeight?: number;
  stageColor?: string | number;
};

function createPlacementBounds(
  stageWidth: number,
  stageHeight: number,
): StarBounds {
  return {
    minX: STAGE_PADDING_X,
    minY: STAGE_PADDING_Y,
    maxX: stageWidth - STAGE_PADDING_X - STAR_OUTPUT_SIZE,
    maxY: stageHeight - STAGE_PADDING_Y - STAR_OUTPUT_SIZE,
  };
}

function createRandomStarPositions(
  stageWidth: number,
  stageHeight: number,
): StarPosition[] {
  const bounds = createPlacementBounds(stageWidth, stageHeight);
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

function drawStageRect(
  graphics: Graphics,
  width: number,
  height: number,
  fillColor: string | number,
) {
  graphics.clear();
  graphics.rect(0, 0, width, height);
  graphics.fill({ color: fillColor, alpha: 1 });
}

export const Star = ({
  hasRecording,
  starGifUrls,
  faceRegions,
  captureError,
  stageWidth = DEFAULT_STAGE_WIDTH,
  stageHeight = DEFAULT_STAGE_HEIGHT,
  stageColor = DEFAULT_STAGE_COLOR,
}: StarProps) => {
  const placementKey = faceRegions.join(",");

  const starPositions = useMemo(() => {
    if (!hasRecording || !placementKey) {
      return [];
    }

    return createRandomStarPositions(stageWidth, stageHeight);
  }, [hasRecording, placementKey, stageWidth, stageHeight]);

  const drawStage = useCallback(
    (graphics: Graphics) => {
      drawStageRect(graphics, stageWidth, stageHeight, stageColor);
    },
    [stageWidth, stageHeight, stageColor],
  );

  return (
    <div>
      {captureError && <p className="text-red-600">{captureError}</p>}

      {hasRecording && (
        <div className="mt-2">
          <div
            className="relative"
            style={{ width: stageWidth, height: stageHeight }}
          >
            <Application
              width={stageWidth}
              height={stageHeight}
              backgroundAlpha={0}
              antialias
              eventMode="none"
              autoStart
              className="absolute inset-0 block h-full w-full"
            >
              <pixiGraphics draw={drawStage} />
            </Application>

            {starGifUrls.map((gifUrl, index) => {
              const position = starPositions[index];
              if (!position) {
                return null;
              }

              return (
                <div
                  key={index}
                  className="absolute z-10"
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
        </div>
      )}
    </div>
  );
};
