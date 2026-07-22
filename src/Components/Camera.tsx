import { useEffect, useRef, useState, type RefObject } from "react";
import Webcam from "react-webcam";
import * as bodySegmentation from "@tensorflow-models/body-segmentation";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import {
  drawZoomedRegion,
  FACE_REGION_LABELS,
  getFaceRegionRect,
  pickDistinctFaceRegions,
  type FaceRegion,
} from "../utils/faceZoom";
import { drawPersonCutoutOnTop } from "../utils/personCutout";
import { createAlignedPersonMask } from "../utils/segmentationMask";
import { createGifFromFrames } from "../utils/createGifFromFrames";
import {
  FRAMES_PER_STAR,
  STAR_COUNT,
  type StarRecordingResult,
} from "../utils/starGifs";

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

function captureCanvasFrame(canvas: HTMLCanvasElement): ImageData | null {
  if (canvas.width === 0 || canvas.height === 0) {
    return null;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

type CameraProps = {
  webcamRef: RefObject<Webcam | null>;
  isWebcamReady: boolean;
  onRecordingStart?: () => void;
  onRecordingComplete?: (result: StarRecordingResult) => void;
};

export const Camera = ({
  webcamRef,
  isWebcamReady,
  onRecordingStart,
  onRecordingComplete,
}: CameraProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isRecordingRef = useRef(false);
  const segmenterRef = useRef<bodySegmentation.BodySegmenter | null>(null);
  const faceDetectorRef =
    useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const focusedFaceRegionRef = useRef<FaceRegion | null>(null);
  const faceRegionsByBlockRef = useRef<FaceRegion[]>([]);
  const lastDisplayedBlockRef = useRef(-1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const videoFramesRef = useRef<ImageData[]>([]);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [personDetected, setPersonDetected] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [focusedFaceRegion, setFocusedFaceRegion] = useState<FaceRegion | null>(
    null,
  );
  const [plannedFaceRegions, setPlannedFaceRegions] = useState<FaceRegion[]>(
    [],
  );
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
    const recordingCanvas = recordingCanvasRef.current;
    if (!recordingCanvas || isRecording || isModelLoading) return;

    videoFramesRef.current = [];
    setCapturedFrameCount(0);
    setGifUrl(null);
    setGifError(null);

    const faceRegions = pickDistinctFaceRegions(STAR_COUNT);
    faceRegionsByBlockRef.current = faceRegions;
    setPlannedFaceRegions(faceRegions);
    focusedFaceRegionRef.current = faceRegions[0] ?? null;
    setFocusedFaceRegion(faceRegions[0] ?? null);
    lastDisplayedBlockRef.current = 0;

    onRecordingStart?.();

    const stream = recordingCanvas.captureStream(RECORDING_FPS);
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

      isRecordingRef.current = false;
      setIsRecording(false);
      setRecordingTimeLeftMs(MAX_RECORDING_MS);
      mediaRecorderRef.current = null;

      onRecordingComplete?.({
        frames: videoFramesRef.current,
        faceRegions: faceRegionsByBlockRef.current,
        starRotations: faceRegionsByBlockRef.current.map(
          () => Math.random() * Math.PI * 2,
        ),
      });
      void buildGifFromCapturedFrames();
    };

    mediaRecorderRef.current = recorder;
    isRecordingRef.current = true;
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

      const faceDetector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: "tfjs",
          refineLandmarks: true,
          maxFaces: 1,
        },
      );

      if (cancelled) {
        segmenter.dispose();
        await faceDetector.dispose();
        return;
      }

      segmenterRef.current = segmenter;
      faceDetectorRef.current = faceDetector;
      offscreenCanvasRef.current = document.createElement("canvas");
      recordingCanvasRef.current = document.createElement("canvas");
      setIsModelLoading(false);

      const processFrame = async () => {
        if (cancelled || isProcessing) return;

        const video = webcamRef.current?.video;
        const canvas = canvasRef.current;
        const offscreenCanvas = offscreenCanvasRef.current;
        const recordingCanvas = recordingCanvasRef.current;
        const segmenter = segmenterRef.current;
        const faceDetector = faceDetectorRef.current;

        if (
          !video ||
          !canvas ||
          !offscreenCanvas ||
          !recordingCanvas ||
          !segmenter ||
          !faceDetector ||
          !isWebcamReady ||
          video.readyState < video.HAVE_ENOUGH_DATA
        ) {
          return;
        }

        isProcessing = true;

        try {
          syncCanvasSize(canvas, video.videoWidth, video.videoHeight);
          syncCanvasSize(
            offscreenCanvas,
            video.videoWidth,
            video.videoHeight,
          );

          syncCanvasSize(
            recordingCanvas,
            video.videoWidth,
            video.videoHeight,
          );

          const offscreenCtx = offscreenCanvas.getContext("2d", {
            willReadFrequently: true,
          });
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!offscreenCtx || !ctx) return;

          offscreenCtx.save();
          offscreenCtx.translate(offscreenCanvas.width, 0);
          offscreenCtx.scale(-1, 1);
          offscreenCtx.drawImage(
            video,
            0,
            0,
            offscreenCanvas.width,
            offscreenCanvas.height,
          );
          offscreenCtx.restore();

          const frame = offscreenCtx.getImageData(
            0,
            0,
            offscreenCanvas.width,
            offscreenCanvas.height,
          );
          const segmentations = await segmenter.segmentPeople(offscreenCanvas, {
            flipHorizontal: false,
            multiSegmentation: false,
            segmentBodyParts: false,
            internalResolution: "high",
            segmentationThreshold: 0.7,
          });

          const personMask = await createAlignedPersonMask(
            segmentations,
            offscreenCanvas.width,
            offscreenCanvas.height,
          );

          const hasPerson = drawPersonCutoutOnTop(
            offscreenCtx,
            frame,
            personMask,
          );
          setPersonDetected(hasPerson);

          const faces = await faceDetector.estimateFaces(offscreenCanvas, {
            flipHorizontal: false,
          });

          setFaceDetected(faces.length > 0);
          ctx.drawImage(offscreenCanvas, 0, 0);

          if (isRecordingRef.current) {
            const recordingCtx = recordingCanvas.getContext("2d", {
              willReadFrequently: true,
            });
            if (!recordingCtx) return;

            const capturedCount = videoFramesRef.current.length;
            const block = Math.min(
              Math.floor(capturedCount / FRAMES_PER_STAR),
              Math.max(faceRegionsByBlockRef.current.length - 1, 0),
            );
            const blockRegion = faceRegionsByBlockRef.current[block];

            if (blockRegion) {
              focusedFaceRegionRef.current = blockRegion;

              if (block !== lastDisplayedBlockRef.current) {
                lastDisplayedBlockRef.current = block;
                setFocusedFaceRegion(blockRegion);
              }
            }

            if (faces.length > 0 && focusedFaceRegionRef.current) {
              const regionRect = getFaceRegionRect(
                faces[0],
                focusedFaceRegionRef.current,
              );
              drawZoomedRegion(
                recordingCtx,
                offscreenCanvas,
                offscreenCanvas.width,
                offscreenCanvas.height,
                regionRect,
              );
            } else {
              recordingCtx.drawImage(offscreenCanvas, 0, 0);
            }
          }
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

      void faceDetectorRef.current?.dispose();
      faceDetectorRef.current = null;
      offscreenCanvasRef.current = null;
      recordingCanvasRef.current = null;

      setRecordedVideoUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return null;
      });
      setGifUrl(null);
    };
  }, [isWebcamReady, webcamRef]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;

    const captureFrame = () => {
      const recordingCanvas = recordingCanvasRef.current;
      if (!recordingCanvas) {
        return;
      }

      if (videoFramesRef.current.length >= MAX_FRAMES) {
        return;
      }

      const frame = captureCanvasFrame(recordingCanvas);
      if (!frame) return;

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
      {isModelLoading && (
        <p>Loading person and face detection models...</p>
      )}

      <div>
        <p>Camera</p>
        <canvas ref={canvasRef} width={500} height={500} />
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          {personDetected
            ? "Person detected · cutout active (black & white)"
            : "No person detected"}
        </p>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          {faceDetected
            ? "Face detected · zoom will apply to recorded video only"
            : "No face detected"}
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

        {isRecording && focusedFaceRegion && (
          <p style={{ marginTop: "0.75rem", color: "#6b7280" }}>
            Filming: {FACE_REGION_LABELS[focusedFaceRegion]} (frames{" "}
            {Math.floor(capturedFrameCount / FRAMES_PER_STAR) * FRAMES_PER_STAR +
              1}
            –
            {Math.min(
              (Math.floor(capturedFrameCount / FRAMES_PER_STAR) + 1) *
                FRAMES_PER_STAR,
              MAX_FRAMES,
            )}
            )
          </p>
        )}

        {isRecording && plannedFaceRegions.length > 0 && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginTop: "0.5rem",
            }}
          >
            Star plan:{" "}
            {plannedFaceRegions
              .map(
                (region, index) =>
                  `Star ${index + 1} (${index * FRAMES_PER_STAR + 1}-${(index + 1) * FRAMES_PER_STAR}) → ${FACE_REGION_LABELS[region]}`,
              )
              .join(" · ")}
          </p>
        )}

        <p
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            marginTop: "0.75rem",
          }}
        >
          Captured frames: {capturedFrameCount} / {MAX_FRAMES} (every 0.5s while
          recording)
        </p>

        {recordedVideoUrl && (
          <div style={{ marginTop: "1rem" }}>
            <p>Recorded video</p>
            <video src={recordedVideoUrl} controls width={500} />
            <p style={{ marginTop: "0.5rem" }}>
              <a href={recordedVideoUrl} download="camera-recording.webm">
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
    </div>
  );
};
