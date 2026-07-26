import { useEffect, useState, type RefObject } from "react";
import { Texture } from "pixi.js";

export function useVideoTexture(
  videoRef: RefObject<HTMLVideoElement | null>,
  isReady: boolean,
) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const videoTexture = Texture.from(video, true);

    setTexture(videoTexture);

    return () => {
      videoTexture.destroy(true);
      setTexture(null);
    };
  }, [isReady, videoRef]);

  return texture;
}
