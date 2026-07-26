import "../pixi/setup";
import { Application, useTick } from "@pixi/react";
import { useCallback, useMemo, useRef, type ReactNode } from "react";
import type { Graphics } from "pixi.js";
import { createHandDrawnRectPaths, type Point } from "../utils/handDrawnRect";
import { CameraViewfinderOverlay } from "./CameraViewfinderOverlay";

export const OUTLINE_FRAME_COUNT = 3;
export const OUTLINE_FRAME_DURATION_MS = 300;
export const OUTLINE_DEFAULT_INSET = 12;

type HandDrawnRectOutlineProps = {
  width: number;
  height: number;
  seed?: number;
  strokeColor?: string | number;
  strokeWidth?: number;
  jitter?: number;
  inset?: number;
  contentInset?: number;
  isRecording?: boolean;
  recordingSecondsLeft?: string;
  capturedFrameCount?: number;
  maxFrames?: number;
  children?: ReactNode;
};

function drawPath(
  graphics: Graphics,
  path: Point[],
  strokeColor: string | number,
  strokeWidth: number,
) {
  if (path.length === 0) {
    return;
  }

  graphics.clear();
  graphics.setStrokeStyle({
    width: strokeWidth,
    color: strokeColor,
    cap: "round",
    join: "round",
    alpha: 1,
  });

  graphics.moveTo(path[0].x, path[0].y);

  for (let index = 1; index < path.length; index += 1) {
    graphics.lineTo(path[index].x, path[index].y);
  }

  graphics.closePath();
  graphics.stroke();
}

type AnimatedHandDrawnRectProps = {
  paths: Point[][];
  strokeColor: string | number;
  strokeWidth: number;
};

function AnimatedHandDrawnRect({
  paths,
  strokeColor,
  strokeWidth,
}: AnimatedHandDrawnRectProps) {
  const frameIndexRef = useRef(0);
  const elapsedRef = useRef(0);
  const graphicsRef = useRef<Graphics | null>(null);

  const renderFrame = useCallback(
    (frameIndex: number) => {
      const graphics = graphicsRef.current;
      if (!graphics) {
        return;
      }

      drawPath(graphics, paths[frameIndex] ?? [], strokeColor, strokeWidth);
    },
    [paths, strokeColor, strokeWidth],
  );

  const draw = useCallback(
    (graphics: Graphics) => {
      graphicsRef.current = graphics;
      renderFrame(frameIndexRef.current);
    },
    [renderFrame],
  );

  const handleTick = useCallback(
    (ticker: { deltaMS: number }) => {
      elapsedRef.current += ticker.deltaMS;

      if (elapsedRef.current < OUTLINE_FRAME_DURATION_MS) {
        return;
      }

      elapsedRef.current = 0;
      frameIndexRef.current = (frameIndexRef.current + 1) % paths.length;
      renderFrame(frameIndexRef.current);
    },
    [paths.length, renderFrame],
  );

  useTick(handleTick);

  return <pixiGraphics draw={draw} />;
}

export function HandDrawnRectOutline({
  width,
  height,
  seed = 1,
  strokeColor = "#000000",
  strokeWidth = 2.5,
  jitter = 3,
  inset = OUTLINE_DEFAULT_INSET,
  contentInset,
  isRecording = false,
  recordingSecondsLeft,
  capturedFrameCount,
  maxFrames,
  children,
}: HandDrawnRectOutlineProps) {
  const resolvedContentInset = contentInset ?? inset;
  const paths = useMemo(
    () =>
      createHandDrawnRectPaths(0, 0, width, height, {
        seed,
        jitter,
        inset,
        passes: OUTLINE_FRAME_COUNT,
      }),
    [width, height, seed, jitter, inset],
  );

  return (
    <div className="relative" style={{ width, height }}>
      <div
        className="absolute overflow-hidden"
        style={{
          top: resolvedContentInset,
          right: resolvedContentInset,
          bottom: resolvedContentInset,
          left: resolvedContentInset,
        }}
      >
        {children}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <Application
          width={width}
          height={height}
          backgroundAlpha={0}
          antialias
          eventMode="none"
          autoStart
          className="block h-full w-full"
        >
          <AnimatedHandDrawnRect
            paths={paths}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
          />
        </Application>
      </div>

      <CameraViewfinderOverlay
        isRecording={isRecording}
        recordingSecondsLeft={recordingSecondsLeft}
        capturedFrameCount={capturedFrameCount}
        maxFrames={maxFrames}
        inset={resolvedContentInset}
      />
    </div>
  );
}
