import { useState } from "react";
import { Camera } from "./Components/Camera";
import { HandDrawnCircle } from "./Components/HandDrawnCircle";
import { Star, DEFAULT_STAGE_COLOR } from "./Components/Star";
import { useCamera } from "./hooks/useCamera";
import { useWebcamStream } from "./hooks/useWebcamStream";
import {
  STAR_COUNT,
  buildStarGifUrls,
  type StarRecordingResult,
} from "./utils/starGifs";
import { CameraMask } from "./Components/CameraMask";
import { RecordVideoPrompt } from "./Components/RecordVideoPrompt";

const CAMERA_FRAME_WIDTH = 900;
const CAMERA_FRAME_HEIGHT = 600;
const STAR_STAGE_WIDTH = CAMERA_FRAME_WIDTH;
const STAR_STAGE_HEIGHT = 240;
const RECORD_PROMPT_OFFSET = CAMERA_FRAME_WIDTH / 2;

function App() {
  const {
    videoRef,
    attachVideoRef,
    isReady: isWebcamReady,
    error: webcamError,
  } = useWebcamStream();
  const [hasRecording, setHasRecording] = useState(false);
  const [starGifUrls, setStarGifUrls] = useState<(string | null)[]>(
    Array.from({ length: STAR_COUNT }, () => null),
  );
  const [starFaceRegions, setStarFaceRegions] = useState<
    StarRecordingResult["faceRegions"]
  >([]);
  const [isCreatingStarGifs, setIsCreatingStarGifs] = useState(false);
  const [starGifError, setStarGifError] = useState<string | null>(null);

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
    videoRef,
    isWebcamReady,
    onRecordingStart: handleRecordingStart,
    onRecordingComplete: handleRecordingComplete,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {webcamError ? (
        <p className="mb-4 text-sm text-red-700">{webcamError}</p>
      ) : null}
      <video
        ref={attachVideoRef}
        muted
        playsInline
        autoPlay
        className="pointer-events-none fixed h-px w-px opacity-0"
      />
      <div className="relative flex w-full justify-center">
        <div
          className="relative overflow-visible"
          style={{ width: CAMERA_FRAME_WIDTH, height: CAMERA_FRAME_HEIGHT }}
        >
          <CameraMask
            className="h-full w-full"
            width={CAMERA_FRAME_WIDTH}
            height={CAMERA_FRAME_HEIGHT}
            videoRef={videoRef}
            canvasRef={camera.canvasRef}
            isVideoReady={isWebcamReady}
            isModelLoading={camera.isModelLoading}
          >
            <Camera
              canvasRef={camera.canvasRef}
              isModelLoading={camera.isModelLoading}
              hideCanvas
            />
          </CameraMask>

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

        <RecordVideoPrompt
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `calc(50% + ${RECORD_PROMPT_OFFSET}px + 2.5rem)` }}
          hidden={camera.controls.isRecording || camera.controls.isModelLoading}
        />
      </div>

      {/* <CameraControls className="mt-4" {...camera.controls} /> */}

      <Star
        hasRecording={hasRecording}
        starGifUrls={starGifUrls}
        faceRegions={starFaceRegions}
        isCreatingGifs={isCreatingStarGifs}
        captureError={starGifError}
        stageWidth={STAR_STAGE_WIDTH}
        stageHeight={STAR_STAGE_HEIGHT}
        stageColor={DEFAULT_STAGE_COLOR}
      />
    </div>
  );
}

export default App;
