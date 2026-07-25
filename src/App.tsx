import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera } from "./Components/Camera";
import { CameraControls } from "./Components/CameraControls";
import { HandDrawnRectOutline } from "./Components/HandDrawnRectOutline";
import { HandDrawnCircle } from "./Components/HandDrawnCircle";
import { Star } from "./Components/Star";
import { useCamera } from "./hooks/useCamera";
import {
  STAR_COUNT,
  buildStarGifUrls,
  type StarRecordingResult,
} from "./utils/starGifs";

const CAMERA_FRAME_WIDTH = 900;
const CAMERA_FRAME_HEIGHT = 600;

function App() {
  const webcamRef = useRef<Webcam>(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [starGifUrls, setStarGifUrls] = useState<(string | null)[]>(
    Array.from({ length: STAR_COUNT }, () => null),
  );
  const [starFaceRegions, setStarFaceRegions] = useState<
    StarRecordingResult["faceRegions"]
  >([]);
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
    setStarFaceRegions([]);
    setStarGifError(null);
    setIsCreatingStarGifs(false);
  };

  const handleRecordingComplete = (recordingResult: StarRecordingResult) => {
    setHasRecording(true);
    setStarFaceRegions(recordingResult.faceRegions);
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

  const camera = useCamera({
    webcamRef,
    isWebcamReady,
    onRecordingStart: handleRecordingStart,
    onRecordingComplete: handleRecordingComplete,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div
        className="relative overflow-visible"
        style={{ width: CAMERA_FRAME_WIDTH, height: CAMERA_FRAME_HEIGHT }}
      >
        <HandDrawnRectOutline
          width={CAMERA_FRAME_WIDTH}
          height={CAMERA_FRAME_HEIGHT}
          seed={1}
        >
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.9}
            width={500}
            height={500}
            onUserMedia={() => setIsWebcamReady(true)}
            className="pointer-events-none absolute h-px w-px opacity-0"
          />

          <Camera
            canvasRef={camera.canvasRef}
            isModelLoading={camera.isModelLoading}
            className="h-full"
            previewClassName="relative h-full min-h-0"
          />
        </HandDrawnRectOutline>

        <HandDrawnCircle
          className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 translate-y-[calc(50%-55px)]"
          radius={26}
          onClick={camera.controls.onStartRecording}
          disabled={
            camera.controls.isRecording || camera.controls.isModelLoading
          }
          isRecording={camera.controls.isRecording}
        />
      </div>

      <CameraControls className="mt-4" {...camera.controls} />

      <Star
        hasRecording={hasRecording}
        starGifUrls={starGifUrls}
        faceRegions={starFaceRegions}
        isCreatingGifs={isCreatingStarGifs}
        captureError={starGifError}
      />
    </div>
  );
}

export default App;
