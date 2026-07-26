import type { RefObject } from "react";

type CameraProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isModelLoading: boolean;
  className?: string;
  previewClassName?: string;
  hideCanvas?: boolean;
};

export function Camera({
  canvasRef,
  isModelLoading,
  className,
  previewClassName,
  hideCanvas = false,
}: CameraProps) {
  return (
    <div className={className}>
      <div className={previewClassName}>
        {isModelLoading && <p>Loading person and face detection models...</p>}

        <canvas
          ref={canvasRef}
          className={
            hideCanvas
              ? "pointer-events-none absolute h-px w-px opacity-0"
              : "block h-full w-full object-cover"
          }
        />
      </div>
    </div>
  );
}
