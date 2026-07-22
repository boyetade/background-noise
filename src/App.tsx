import "./App.css";
import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera } from "./Components/Camera";
import { Star } from "./Components/Star";
import {
  STAR_COUNT,
  buildStarGifUrls,
  createStarRecordingResult,
} from "./utils/starGifs";

function App() {
  const webcamRef = useRef<Webcam>(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [starGifUrls, setStarGifUrls] = useState<(string | null)[]>(
    Array.from({ length: STAR_COUNT }, () => null),
  );
  const [isCreatingStarGifs, setIsCreatingStarGifs] = useState(false);
  const [starGifError, setStarGifError] = useState<string | null>(null);

  useEffect(() => {
    const checkVideoReady = () => {
      const video = webcamRef.current?.video;
      if (video && video.readyState >= video.HAVE_ENOUGH_DATA) {
        setIsWebcamReady(true);
      }
    };

    checkVideoReady();
    const intervalId = window.setInterval(checkVideoReady, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleRecordingStart = () => {
    setHasRecording(false);
    setStarGifUrls(Array.from({ length: STAR_COUNT }, () => null));
    setStarGifError(null);
    setIsCreatingStarGifs(false);
  };

  const handleRecordingComplete = (frames: ImageData[]) => {
    const recordingResult = createStarRecordingResult(frames);
    setHasRecording(true);
    setIsCreatingStarGifs(true);
    setStarGifError(null);
    setStarGifUrls(Array.from({ length: STAR_COUNT }, () => null));

    void buildStarGifUrls(recordingResult)
      .then((gifs) => {
        setStarGifUrls(gifs);
      })
      .catch((error) => {
        setStarGifError(
          error instanceof Error ? error.message : "Star GIF creation failed",
        );
      })
      .finally(() => {
        setIsCreatingStarGifs(false);
      });
  };

  return (
    <div>
      <h1>Hello World</h1>

      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        screenshotQuality={0.9}
        width={500}
        height={500}
        onUserMedia={() => setIsWebcamReady(true)}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      <Camera
        webcamRef={webcamRef}
        isWebcamReady={isWebcamReady}
        onRecordingStart={handleRecordingStart}
        onRecordingComplete={handleRecordingComplete}
      />
      <Star
        hasRecording={hasRecording}
        starGifUrls={starGifUrls}
        isCreatingGifs={isCreatingStarGifs}
        captureError={starGifError}
      />
    </div>
  );
}

export default App;
