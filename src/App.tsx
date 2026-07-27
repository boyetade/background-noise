import { useEffect, useRef, useState } from "react";
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
import { PaperCameraFrame } from "./Components/PaperCameraFrame";
import { AppBackground } from "./Components/AppBackground";
import { RecordVideoPrompt } from "./Components/RecordVideoPrompt";

const CAMERA_FRAME_WIDTH = 750;
const CAMERA_FRAME_HEIGHT = 500;
const CAMERA_MASK_LEFT = 82;
const CAMERA_MASK_TOP = 58;
const RECORD_BUTTON_GAP = 10;
const PAPER_FRAME_EXTRA_HEIGHT = 72;
const STAR_STAGE_WIDTH = CAMERA_FRAME_WIDTH;
const STAR_STAGE_HEIGHT = 240;
const RECORD_PROMPT_OFFSET = CAMERA_FRAME_WIDTH / 2;
const RECORDING_COUNTDOWN_SECONDS = 3;

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
  const [recordingCountdown, setRecordingCountdown] = useState<number | null>(
    null,
  );

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

  const startRecordingRef = useRef(camera.controls.onStartRecording);

  useEffect(() => {
    startRecordingRef.current = camera.controls.onStartRecording;
  }, [camera.controls.onStartRecording]);

  useEffect(() => {
    if (recordingCountdown === null) {
      return;
    }

    const timerId = window.setTimeout(() => {
      if (recordingCountdown <= 1) {
        setRecordingCountdown(null);
        startRecordingRef.current();
        return;
      }

      setRecordingCountdown(recordingCountdown - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [recordingCountdown]);

  const handleRecordClick = () => {
    if (
      recordingCountdown !== null ||
      camera.controls.isRecording ||
      camera.controls.isModelLoading
    ) {
      return;
    }

    setRecordingCountdown(RECORDING_COUNTDOWN_SECONDS);
  };

  const isRecordUiLocked =
    camera.controls.isRecording ||
    camera.controls.isModelLoading ||
    recordingCountdown !== null;

  const isStarReady = hasRecording && !isCreatingStarGifs;

  return (
    <>
      <AppBackground />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
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

        {!isStarReady ? (
          <div className="relative flex w-full justify-center">
            <PaperCameraFrame width={900} height={800}>
              <CameraMask
                style={{
                  position: "absolute",
                  left: CAMERA_MASK_LEFT,
                  top: CAMERA_MASK_TOP,
                }}
                width={CAMERA_FRAME_WIDTH}
                height={CAMERA_FRAME_HEIGHT}
                videoRef={videoRef}
                canvasRef={camera.canvasRef}
                isVideoReady={isWebcamReady}
                isModelLoading={camera.isModelLoading}
                countdown={recordingCountdown}
                showPaperOutline={false}
              />

              <HandDrawnCircle
                className="absolute left-1/2 z-20 -translate-x-1/2"
                style={{
                  top: CAMERA_MASK_TOP + CAMERA_FRAME_HEIGHT + RECORD_BUTTON_GAP,
                }}
                radius={26}
                onClick={handleRecordClick}
                disabled={isRecordUiLocked}
                isRecording={camera.controls.isRecording}
              />
            </PaperCameraFrame>

            <RecordVideoPrompt
              className="absolute -translate-y-1/2"
              style={{
                top: `calc(50% - ${PAPER_FRAME_EXTRA_HEIGHT / 2}px)`,
                left: `calc(50% + ${RECORD_PROMPT_OFFSET}px + 2.5rem)`,
              }}
              hidden={isRecordUiLocked}
            />
          </div>
        ) : (
          <Star
            key={starFaceRegions.join(",")}
            hasRecording={hasRecording}
            starGifUrls={starGifUrls}
            faceRegions={starFaceRegions}
            captureError={starGifError}
            stageWidth={STAR_STAGE_WIDTH}
            stageHeight={STAR_STAGE_HEIGHT}
            stageColor={DEFAULT_STAGE_COLOR}
          />
        )}
      </div>
    </>
  );
}

export default App;
