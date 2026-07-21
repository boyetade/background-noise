import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as bodySegmentation from "@tensorflow-models/body-segmentation";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import {
  buildBackgroundSnapshot,
  detectBackgroundObjectBoxes,
  drawBackgroundObjectBoxes,
  drawPersonLayerOnTop,
} from "../utils/backgroundBusyness";
import { createAlignedPersonMask } from "../utils/segmentationMask";
import { createGifFromFrames } from "../utils/createGifFromFrames";

function syncCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  if (canvas.width !== width) {
    canvas.width = width;
    canvas.height = height;
  }
}

const MAX_RECORDING_MS = 8000;
const RECORDING_FPS = 30;
const FRAME_CAPTURE_INTERVAL_MS = 500;
const MAX_FRAMES = 15;

function getSupportedMimeType(): string {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  return (
    types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm"
  );
}

function captureVideoFrame(video: HTMLVideoElement): ImageData | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const captureCanvas = document.createElement("canvas");
  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;

  const ctx = captureCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  return ctx.getImageData(0, 0, captureCanvas.width, captureCanvas.height);
}

export const Camera = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const segmenterRef = useRef<bodySegmentation.BodySegmenter | null>(null);
  const previousBackgroundRef = useRef<Uint8ClampedArray | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const videoFramesRef = useRef<ImageData[]>([]);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [detectedObjectCount, setDetectedObjectCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeLeftMs, setRecordingTimeLeftMs] =
    useState(MAX_RECORDING_MS);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [capturedFrameCount, setCapturedFrameCount] = useState(0);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isCreatingGif, setIsCreatingGif] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);

  const buildGifFromCapturedFrames = async () => {
    const frames = videoFramesRef.current;
    if (frames.length === 0 || isCreatingGif) return;

    setIsCreatingGif(true);
    setGifError(null);

    try {
      const gifDataUrl = await createGifFromFrames(frames);
      setGifUrl((previousUrl) => {
        if (previousUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(previousUrl);
        }
        return gifDataUrl;
      });
    } catch (error) {
      setGifError(
        error instanceof Error ? error.message : "Failed to create GIF",
      );
    } finally {
      setIsCreatingGif(false);
    }
  };

  const clearRecordingTimers = () => {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const stopRecording = () => {
    clearRecordingTimers();

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording || isModelLoading) return;

    videoFramesRef.current = [];
    setCapturedFrameCount(0);
    setGifUrl(null);
    setGifError(null);

    const stream = canvas.captureStream(RECORDING_FPS);
    const mimeType = getSupportedMimeType();
    recordedChunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());

      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);

      setRecordedVideoUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return url;
      });

      setIsRecording(false);
      setRecordingTimeLeftMs(MAX_RECORDING_MS);
      mediaRecorderRef.current = null;

      void buildGifFromCapturedFrames();
    };

    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTimeLeftMs(MAX_RECORDING_MS);
    recorder.start(200);

    const startedAt = Date.now();

    recordingIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRecordingTimeLeftMs(Math.max(0, MAX_RECORDING_MS - elapsed));
    }, 100);

    recordingTimeoutRef.current = window.setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_MS);
  };

  useEffect(() => {
    let cancelled = false;
    let animationFrameId = 0;
    let isProcessing = false;

    const init = async () => {
      await tf.setBackend("webgl");
      await tf.ready();

      const segmenter = await bodySegmentation.createSegmenter(
        bodySegmentation.SupportedModels.BodyPix,
        {
          architecture: "MobileNetV1",
          outputStride: 16,
          multiplier: 0.75,
          quantBytes: 4,
        },
      );

      if (cancelled) {
        segmenter.dispose();
        return;
      }

      segmenterRef.current = segmenter;
      setIsModelLoading(false);

      const processFrame = async () => {
        if (cancelled || isProcessing) return;

        const video = webcamRef.current?.video;
        const canvas = canvasRef.current;
        const segmenter = segmenterRef.current;

        if (
          !video ||
          !canvas ||
          !segmenter ||
          video.readyState < video.HAVE_ENOUGH_DATA
        ) {
          return;
        }

        isProcessing = true;

        try {
          syncCanvasSize(canvas, video.videoWidth, video.videoHeight);

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;

          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const segmentations = await segmenter.segmentPeople(canvas, {
            flipHorizontal: false,
            multiSegmentation: false,
            segmentBodyParts: false,
            internalResolution: "high",
            segmentationThreshold: 0.7,
          });

          const personMask = await createAlignedPersonMask(
            segmentations,
            canvas.width,
            canvas.height,
          );

          const objectBoxes = detectBackgroundObjectBoxes(
            frame,
            personMask,
            previousBackgroundRef.current,
          );

          drawBackgroundObjectBoxes(ctx, objectBoxes);
          drawPersonLayerOnTop(ctx, frame, personMask);
          setDetectedObjectCount(objectBoxes.length);

          previousBackgroundRef.current = buildBackgroundSnapshot(
            frame,
            personMask,
          );
        } finally {
          isProcessing = false;
        }
      };

      const tick = () => {
        animationFrameId = requestAnimationFrame(tick);
        void processFrame();
      };

      tick();
    };

    void init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);

      if (recordingTimeoutRef.current !== null) {
        window.clearTimeout(recordingTimeoutRef.current);
      }

      if (recordingIntervalRef.current !== null) {
        window.clearInterval(recordingIntervalRef.current);
      }

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }

      segmenterRef.current?.dispose();
      segmenterRef.current = null;
      previousBackgroundRef.current = null;

      setRecordedVideoUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return null;
      });
      setGifUrl(null);
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;

    const captureFrame = () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
        return;
      }

      const frame = captureVideoFrame(video);
      if (!frame) return;

      if (videoFramesRef.current.length >= MAX_FRAMES) {
        return;
      }

      videoFramesRef.current.push(frame);
      setCapturedFrameCount(videoFramesRef.current.length);
    };

    captureFrame();

    const frameCaptureIntervalId = window.setInterval(
      captureFrame,
      FRAME_CAPTURE_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(frameCaptureIntervalId);
    };
  }, [isRecording]);

  const recordingSecondsLeft = (recordingTimeLeftMs / 1000).toFixed(1);

  return (
    <div>
      {isModelLoading && <p>Loading background detection model...</p>}

      <div>
        <p>Background object detection</p>
        <canvas ref={canvasRef} width={500} height={500} />
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Background objects detected: {detectedObjectCount}
        </p>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button
          type="button"
          onClick={startRecording}
          disabled={isRecording || isModelLoading}
        >
          {isRecording ? "Recording..." : "Record 8 second video"}
        </button>

        {isRecording && (
          <p style={{ marginTop: "0.75rem" }}>
            Recording: {recordingSecondsLeft}s remaining (max 8 seconds)
          </p>
        )}

        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.75rem" }}>
          Captured frames: {capturedFrameCount} / {MAX_FRAMES} (every 0.5s while
          recording)
        </p>

        {recordedVideoUrl && (
          <div style={{ marginTop: "1rem" }}>
            <p>Recorded video with background object markers</p>
            <video src={recordedVideoUrl} controls width={500} />
            <p style={{ marginTop: "0.5rem" }}>
              <a href={recordedVideoUrl} download="background-detection.webm">
                Download video
              </a>
            </p>
          </div>
        )}

        <div style={{ marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => void buildGifFromCapturedFrames()}
            disabled={isCreatingGif || capturedFrameCount === 0}
          >
            {isCreatingGif ? "Creating GIF..." : "Create GIF from frames"}
          </button>

          {gifError && (
            <p style={{ marginTop: "0.75rem", color: "#dc2626" }}>{gifError}</p>
          )}

          {gifUrl && (
            <div style={{ marginTop: "1rem" }}>
              <p>Generated GIF</p>
              <img
                src={gifUrl}
                alt="Generated from captured frames"
                width={500}
              />
              <p style={{ marginTop: "0.5rem" }}>
                <a href={gifUrl} download="camera-recording.gif">
                  Download GIF
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        screenshotQuality={0.9}
        width={500}
        height={500}
        style={{ display: "none" }}
      />
    </div>
  );
};
