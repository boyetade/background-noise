import { useEffect, useRef, useState, type RefObject } from "react";
import * as bodySegmentation from "@tensorflow-models/body-segmentation";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import {
  drawZoomedRegion,
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

export const MAX_CAMERA_FRAMES = 15;

const MAX_RECORDING_MS = 8000;
const RECORDING_FPS = 30;
const FRAME_CAPTURE_INTERVAL_MS = 500;

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

type UseCameraOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  isWebcamReady: boolean;
  onRecordingStart?: () => void;
  onRecordingComplete?: (result: StarRecordingResult) => void;
};

export function useCamera({
  videoRef,
  isWebcamReady,
  onRecordingStart,
  onRecordingComplete,
}: UseCameraOptions) {
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
  const onRecordingStartRef = useRef(onRecordingStart);
  const onRecordingCompleteRef = useRef(onRecordingComplete);

  useEffect(() => {
    onRecordingStartRef.current = onRecordingStart;
    onRecordingCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete, onRecordingStart]);

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
    lastDisplayedBlockRef.current = 0;

    onRecordingStartRef.current?.();

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

      onRecordingCompleteRef.current?.({
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

      const drawLivePreview = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (
          !video ||
          !canvas ||
          !isWebcamReady ||
          video.readyState < video.HAVE_ENOUGH_DATA
        ) {
          return;
        }

        syncCanvasSize(canvas, video.videoWidth, video.videoHeight);
        const previewCtx = canvas.getContext("2d", { willReadFrequently: true });
        if (!previewCtx) {
          return;
        }

        previewCtx.save();
        previewCtx.translate(canvas.width, 0);
        previewCtx.scale(-1, 1);
        previewCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
        previewCtx.restore();
      };

      const processFrame = async () => {
        if (cancelled) return;

        drawLivePreview();

        if (isProcessing) return;

        const video = videoRef.current;
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
          syncCanvasSize(offscreenCanvas, video.videoWidth, video.videoHeight);
          syncCanvasSize(recordingCanvas, video.videoWidth, video.videoHeight);

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

          const faces = await faceDetector.estimateFaces(offscreenCanvas, {
            flipHorizontal: false,
          });

          drawPersonCutoutOnTop(offscreenCtx, frame, personMask);
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
  }, [isWebcamReady, videoRef]);

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

      if (videoFramesRef.current.length >= MAX_CAMERA_FRAMES) {
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

  return {
    canvasRef,
    isModelLoading,
    controls: {
      isRecording,
      isModelLoading,
      recordingSecondsLeft,
      plannedFaceRegions,
      capturedFrameCount,
      maxFrames: MAX_CAMERA_FRAMES,
      recordedVideoUrl,
      isCreatingGif,
      gifError,
      gifUrl,
      onStartRecording: startRecording,
      onCreateGif: () => void buildGifFromCapturedFrames(),
    },
  };
}
