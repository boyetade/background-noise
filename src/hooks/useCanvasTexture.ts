import { useEffect, useState, type RefObject } from "react";
import { Texture } from "pixi.js";

export function useCanvasTexture(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let animationFrameId = 0;
    let canvasTexture: Texture | null = null;

    const tryCreateTexture = () => {
      if (cancelled) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        animationFrameId = requestAnimationFrame(tryCreateTexture);
        return;
      }

      canvasTexture = Texture.from(canvas, true);
      setTexture(canvasTexture);
    };

    tryCreateTexture();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
      canvasTexture?.destroy(true);
      setTexture(null);
    };
  }, [canvasRef, enabled]);

  return enabled ? texture : null;
}
