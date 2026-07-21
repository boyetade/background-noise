import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
// import * as bodySegmentation from "@tensorflow-models/body-segmentation";
// import * as tf from "@tensorflow/tfjs";
// import "@tensorflow/tfjs-backend-webgl";
// import { maskPersonFromFrame } from "../utils/backgroundBusyness";
// import { createAlignedPersonMask } from "../utils/segmentationMask";

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

// const INITIAL_METRICS: BackgroundAnalysis = {
//   busyness: 0,
//   motion: 0,
//   complexity: 0,
//   objectRegions: 0,
//   level: "quiet",
// };

const MAX_RECORDING_MS = 8000;
const RECORDING_FPS = 30;

function getSupportedMimeType(): string {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
}

export const Camera = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const activityCanvasRef = useRef<HTMLCanvasElement>(null);
  // const blueBackgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const webcamRef = useRef<Webcam>(null);
  // const segmenterRef = useRef<bodySegmentation.BodySegmenter | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  // const previousBackgroundRef = useRef<Uint8ClampedArray | null>(null);
  // const smoothedBusynessRef = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeLeftMs, setRecordingTimeLeftMs] = useState(MAX_RECORDING_MS);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  // const [metrics, setMetrics] = useState<BackgroundAnalysis>(INITIAL_METRICS);

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
    if (!canvas || isRecording) return;

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

    const processFrame = () => {
      if (cancelled) return;

      const video = webcamRef.current?.video;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
        return;
      }

      syncCanvasSize(canvas, video.videoWidth, video.videoHeight);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    };

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);
      processFrame();
    };

    tick();

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

      // segmenterRef.current?.dispose();
      // segmenterRef.current = null;
      setRecordedVideoUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return null;
      });
    };
  }, []);

  // const busynessPercent = Math.round(metrics.busyness * 100);
  const recordingSecondsLeft = (recordingTimeLeftMs / 1000).toFixed(1);

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p>Camera</p>
          <canvas ref={canvasRef} width={500} height={500} />
        </div>
        {/* <div>
          <p>Background busyness map</p>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Blue = calm, yellow = some objects, red = busy/moving
          </p>
          <canvas ref={activityCanvasRef} width={500} height={500} />
        </div>
        <div>
          <p>Blue background</p>
          <canvas ref={blueBackgroundCanvasRef} width={500} height={500} />
        </div> */}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button
          type="button"
          onClick={startRecording}
          disabled={isRecording}
        >
          {isRecording ? "Recording..." : "Record 8 second video"}
        </button>

        {isRecording && (
          <p style={{ marginTop: "0.75rem" }}>
            Recording: {recordingSecondsLeft}s remaining (max 8 seconds)
          </p>
        )}

        {recordedVideoUrl && (
          <div style={{ marginTop: "1rem" }}>
            <p>Recorded clip</p>
            <video src={recordedVideoUrl} controls width={500} />
            <p style={{ marginTop: "0.5rem" }}>
              <a href={recordedVideoUrl} download="background-recording.webm">
                Download recording
              </a>
            </p>
          </div>
        )}
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
