import { useCallback, useEffect, useRef, useState } from "react";

type UseWebcamStreamOptions = {
  constraints?: MediaStreamConstraints;
};

export function useWebcamStream(options: UseWebcamStreamOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const constraints = options.constraints;

  const attachVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setIsVideoMounted(node !== null);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!isVideoMounted || !video) {
      return;
    }

    let cancelled = false;

    const markReady = () => {
      if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        setIsReady(true);
      }
    };

    const handleCanPlay = () => {
      markReady();
    };

    const handleLoadedMetadata = () => {
      markReady();
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    const startStream = async () => {
      setError(null);
      setIsReady(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          constraints ?? { video: true, audio: false },
        );

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
        markReady();
      } catch (streamError) {
        if (cancelled) {
          return;
        }

        setError(
          streamError instanceof Error
            ? streamError.message
            : "Could not access the webcam",
        );
      }
    };

    void startStream();

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      video.pause();
      video.srcObject = null;
      setIsReady(false);
    };
  }, [isVideoMounted, constraints]);

  return { videoRef, attachVideoRef, isReady, error };
}
