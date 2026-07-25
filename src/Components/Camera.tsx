import type { RefObject } from "react";

type CameraProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isModelLoading: boolean;
  className?: string;
  previewClassName?: string;
};

export function Camera({
  canvasRef,
  isModelLoading,
  className,
  previewClassName,
}: CameraProps) {
  return (
    <div className={className}>
      <div className={previewClassName}>
        {isModelLoading && <p>Loading person and face detection models...</p>}

        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          className="block h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
