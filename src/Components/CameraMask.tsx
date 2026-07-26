import "../pixi/setup";
import { Application, useTick } from "@pixi/react";
import { useCallback, useMemo, type ReactNode, type RefObject } from "react";
import type { Graphics, Texture } from "pixi.js";
import { useCanvasTexture } from "../hooks/useCanvasTexture";
import { useVideoTexture } from "../hooks/useVideoTexture";
import {
  createPaperMaskPolygon,
  pointsToSvgPath,
  type Point,
} from "../utils/paperMaskPolygon";

export const PAPER_MASK_FILL = "#f3ecdf";

type CameraMaskProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isVideoReady: boolean;
  isModelLoading: boolean;
  width?: number;
  height?: number;
  seed?: number;
  fillColor?: string | number;
  strokeColor?: string | number;
  mirror?: boolean;
  className?: string;
  children?: ReactNode;
};

function drawPaperPolygon(
  graphics: Graphics,
  points: Point[],
  fillColor: string | number,
  strokeColor: string | number,
  fillAlpha: number,
) {
  if (points.length < 3) {
    return;
  }

  graphics.clear();
  graphics.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    graphics.lineTo(points[index].x, points[index].y);
  }

  graphics.closePath();
  graphics.fill({ color: fillColor, alpha: fillAlpha });
  graphics.setStrokeStyle({
    color: strokeColor,
    width: 1,
    alpha: 0.35,
    cap: "round",
    join: "round",
  });
  graphics.stroke();
}

function getCoverScale(
  texture: Texture,
  viewWidth: number,
  viewHeight: number,
) {
  if (texture.width <= 0 || texture.height <= 0) {
    return 1;
  }

  return Math.max(viewWidth / texture.width, viewHeight / texture.height);
}

function FeedSprite({
  texture,
  width,
  height,
  mirror,
}: {
  texture: Texture;
  width: number;
  height: number;
  mirror: boolean;
}) {
  useTick(() => {
    const resource = texture.source.resource;
    if (resource instanceof HTMLCanvasElement) {
      texture.source.update();
    }
  });

  const coverScale = getCoverScale(texture, width, height);

  return (
    <pixiSprite
      texture={texture}
      anchor={0.5}
      x={width / 2}
      y={height / 2}
      scale={{
        x: mirror ? -coverScale : coverScale,
        y: coverScale,
      }}
    />
  );
}

export function CameraMask({
  videoRef,
  canvasRef,
  isVideoReady,
  isModelLoading,
  width = 700,
  height = 550,
  seed = 11,
  fillColor = PAPER_MASK_FILL,
  strokeColor = "#c9bfb0",
  mirror = true,
  className,
  children,
}: CameraMaskProps) {
  const useCanvasFeed = isVideoReady && !isModelLoading;
  const canvasTexture = useCanvasTexture(canvasRef, useCanvasFeed);
  const videoTexture = useVideoTexture(videoRef, isVideoReady);
  const feedTexture = canvasTexture ?? videoTexture;
  const feedMirror = canvasTexture ? false : mirror;

  const polygon = useMemo(
    () => createPaperMaskPolygon(width, height, { seed }),
    [width, height, seed],
  );

  const clipPath = useMemo(() => pointsToSvgPath(polygon), [polygon]);

  const draw = useCallback(
    (graphics: Graphics) => {
      drawPaperPolygon(
        graphics,
        polygon,
        fillColor,
        strokeColor,
        feedTexture ? 0 : 1,
      );
    },
    [polygon, fillColor, strokeColor, feedTexture],
  );

  return (
    <div
      className={className}
      style={{
        width,
        height,
        clipPath: `path("${clipPath}")`,
      }}
    >
      {children ? <div className="sr-only">{children}</div> : null}

      <Application
        width={width}
        height={height}
        backgroundAlpha={0}
        antialias
        eventMode="none"
        autoStart
        className="block h-full w-full"
      >
        {feedTexture ? (
          <FeedSprite
            texture={feedTexture}
            width={width}
            height={height}
            mirror={feedMirror}
          />
        ) : null}
        <pixiGraphics draw={draw} />
      </Application>
    </div>
  );
}
