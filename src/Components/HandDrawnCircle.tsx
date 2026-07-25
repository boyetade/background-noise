import "../pixi/setup";
import { Application } from "@pixi/react";
import { useCallback, useMemo } from "react";
import type { Graphics } from "pixi.js";

type Point = {
  x: number;
  y: number;
};

type HandDrawnCircleProps = {
  radius: number;
  strokeColor?: string | number;
  scribbleColor?: string | number;
  strokeWidth?: number;
  scribbleWidth?: number;
  padding?: number;
  seed?: number;
  className?: string;
  disabled?: boolean;
  isRecording?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
};

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createInnerScribblePath(
  center: number,
  innerRadius: number,
  seed: number,
  pointCount = 40,
): Point[] {
  const random = createSeededRandom(seed);
  const points: Point[] = [];

  let angle = random() * Math.PI * 2;
  let distance = innerRadius * (0.25 + random() * 0.35);

  for (let index = 0; index < pointCount; index += 1) {
    angle += (random() * 2 - 1) * 1.5;
    distance += (random() * 2 - 1) * innerRadius * 0.18;
    distance = Math.max(
      innerRadius * 0.08,
      Math.min(innerRadius * 0.95, distance),
    );

    points.push({
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    });
  }

  return points;
}

function createInnerScribblePaths(
  center: number,
  innerRadius: number,
  seed: number,
  strokeCount = 7,
): Point[][] {
  return Array.from({ length: strokeCount }, (_, index) =>
    createInnerScribblePath(
      center,
      innerRadius,
      seed + index * 1543,
      36 + (index % 3) * 8,
    ),
  );
}

function drawCircleOutline(
  graphics: Graphics,
  center: number,
  radius: number,
  strokeColor: string | number,
  strokeWidth: number,
) {
  graphics.setStrokeStyle({
    width: strokeWidth,
    color: strokeColor,
    alpha: 1,
  });
  graphics.circle(center, center, radius);
  graphics.stroke();
}

function drawScribblePath(
  graphics: Graphics,
  path: Point[],
  strokeColor: string | number,
  strokeWidth: number,
) {
  if (path.length < 2) {
    return;
  }

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

  graphics.stroke();
}

export function HandDrawnCircle({
  radius,
  strokeColor = "#000000",
  scribbleColor = "#ff0000",
  strokeWidth = 2,
  scribbleWidth = 2,
  padding = 8,
  seed = 7,
  className = "",
  disabled = false,
  isRecording = false,
  ariaLabel = "Record 8 second video",
  onClick,
}: HandDrawnCircleProps) {
  const activeStrokeWidth = isRecording ? strokeWidth + 1 : strokeWidth;
  const canvasSize = useMemo(
    () => Math.ceil(radius * 2 + activeStrokeWidth + padding),
    [radius, activeStrokeWidth, padding],
  );
  const center = canvasSize / 2;
  const innerRadius = Math.max(radius - activeStrokeWidth - 4, radius * 0.45);

  const scribblePaths = useMemo(
    () => createInnerScribblePaths(center, innerRadius, seed),
    [center, innerRadius, seed],
  );

  const draw = useCallback(
    (graphics: Graphics) => {
      graphics.clear();
      drawCircleOutline(
        graphics,
        center,
        radius,
        strokeColor,
        activeStrokeWidth,
      );

      for (const path of scribblePaths) {
        drawScribblePath(graphics, path, scribbleColor, scribbleWidth);
      }
    },
    [
      center,
      radius,
      strokeColor,
      activeStrokeWidth,
      scribblePaths,
      scribbleColor,
      scribbleWidth,
    ],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={isRecording}
      className={`cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ width: canvasSize, height: canvasSize }}
    >
      <Application
        width={canvasSize}
        height={canvasSize}
        backgroundAlpha={0}
        antialias
        eventMode="none"
        autoStart
        className="pointer-events-none block h-full w-full"
      >
        <pixiGraphics draw={draw} />
      </Application>
    </button>
  );
}
