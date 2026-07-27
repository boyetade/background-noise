import { useMemo, type ReactNode } from "react";
import {
  createPaperMaskPolygon,
  pointsToSvgPath,
} from "../utils/paperMaskPolygon";
import { PAPER_MASK_FILL } from "./CameraMask";

export { PAPER_MASK_FILL as PAPER_COLOR };

type PaperCameraFrameProps = {
  width: number;
  height: number;
  seed?: number;
  paperColor?: string;
  className?: string;
  children?: ReactNode;
};

export function PaperCameraFrame({
  width,
  height,
  seed = 11,
  paperColor = PAPER_MASK_FILL,
  className,
  children,
}: PaperCameraFrameProps) {
  const clipPath = useMemo(() => {
    const polygon = createPaperMaskPolygon(width, height, { seed });
    return pointsToSvgPath(polygon);
  }, [width, height, seed]);

  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{
        width,
        height,
        clipPath: `path("${clipPath}")`,
        backgroundColor: paperColor,
      }}
    >
      {children}
    </div>
  );
}
