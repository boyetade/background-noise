import { useEffect, useRef, useState } from "react";
import { HandDrawnCircle } from "./Components/HandDrawnCircle";
import { Star } from "./Components/Star";
import { useCamera } from "./hooks/useCamera";
import { useWebcamStream } from "./hooks/useWebcamStream";
import {
  STAR_COUNT,
  buildStarGifUrls,
  STAR_GIF_BACKGROUND,
  pickNextStarBackgroundColor,
  type StarRecordingResult,
} from "./utils/starGifs";
import { CameraMask } from "./Components/CameraMask";
import { PaperCameraFrame } from "./Components/PaperCameraFrame";
import { AppBackground } from "./Components/AppBackground";
import { RecordVideoPrompt } from "./Components/RecordVideoPrompt";
import { BoxedWordsText } from "./Components/BoxedWordsText";

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
  const [starRecordingResult, setStarRecordingResult] =
    useState<StarRecordingResult | null>(null);
  const [stageColor, setStageColor] = useState(STAR_GIF_BACKGROUND);
  const [isCreatingStarGifs, setIsCreatingStarGifs] = useState(false);
  const [starGifError, setStarGifError] = useState<string | null>(null);
  const [recordingCountdown, setRecordingCountdown] = useState<number | null>(
    null,
  );

  const resetRecordingState = () => {
    setHasRecording(false);
    setStarGifUrls(Array.from({ length: STAR_COUNT }, () => null));
    setStarFaceRegions([]);
    setStarRecordingResult(null);
    setStageColor(STAR_GIF_BACKGROUND);
    setStarGifError(null);
    setIsCreatingStarGifs(false);
    setRecordingCountdown(null);
  };

  const handleRecordingStart = () => {
    resetRecordingState();
  };

  const rebuildStarGifs = (
    recordingResult: StarRecordingResult,
    backgroundColor: string,
    showLoading = false,
  ) => {
    if (showLoading) {
      setIsCreatingStarGifs(true);
    }

    setStarGifError(null);

    void buildStarGifUrls(recordingResult, backgroundColor)
      .then((gifs) => {
        setStarGifUrls(gifs);
      })
      .catch((error) => {
        setStarGifError(
          error instanceof Error ? error.message : "Star GIF creation failed",
        );
      })
      .finally(() => {
        if (showLoading) {
          setIsCreatingStarGifs(false);
        }
      });
  };

  const handleRecordingComplete = (recordingResult: StarRecordingResult) => {
    setHasRecording(true);
    setStarRecordingResult(recordingResult);
    setStarFaceRegions(recordingResult.faceRegions);
    setStageColor(STAR_GIF_BACKGROUND);
    setStarGifUrls(Array.from({ length: STAR_COUNT }, () => null));
    rebuildStarGifs(recordingResult, STAR_GIF_BACKGROUND, true);
  };

  const handleShuffleStageColor = () => {
    if (!starRecordingResult) {
      return;
    }

    const nextColor = pickNextStarBackgroundColor(stageColor);
    setStageColor(nextColor);
    rebuildStarGifs(starRecordingResult, nextColor);
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

  const isRecordPromptHidden =
    camera.controls.isRecording || recordingCountdown !== null;

  const isStarReady = hasRecording && !isCreatingStarGifs;

  return (
    <>
      <AppBackground />
      <div className="relative flex min-h-screen flex-col items-center px-4">
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
          <div className="flex w-full flex-1 items-center justify-center">
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
                isPreviewReady={camera.isPreviewReady}
                countdown={recordingCountdown}
                showPaperOutline={false}
              />

              <HandDrawnCircle
                className="absolute left-1/2 z-20 -translate-x-1/2"
                style={{
                  top:
                    CAMERA_MASK_TOP + CAMERA_FRAME_HEIGHT + RECORD_BUTTON_GAP,
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
              hidden={isRecordPromptHidden}
            />
          </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={resetRecordingState}
              className="absolute left-4 top-4 z-20 cursor-pointer border-0 bg-transparent p-6 hover:opacity-90"
            >
              <BoxedWordsText
                text="Have another moment of expression?"
                boxClassName="text-2xl"
              />
            </button>

            <div className="flex w-full flex-1 flex-col items-center gap-4 pt-24 pb-8">
              <BoxedWordsText
                text="A Constelliation of You"
                boxClassName="text-2xl"
                className="relative z-20 shrink-0"
              />

              <div className="flex w-full flex-1 items-center justify-center">
                <Star
                  key={starFaceRegions.join(",")}
                  hasRecording={hasRecording}
                  starGifUrls={starGifUrls}
                  faceRegions={starFaceRegions}
                  captureError={starGifError}
                  stageWidth={STAR_STAGE_WIDTH}
                  stageHeight={STAR_STAGE_HEIGHT}
                  stageColor={stageColor}
                  onShuffleStageColor={handleShuffleStageColor}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default App;
