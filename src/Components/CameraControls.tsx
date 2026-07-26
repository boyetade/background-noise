type CameraControlsProps = {
  isRecording: boolean;
  recordingSecondsLeft: string;
  capturedFrameCount: number;
  maxFrames: number;
  recordedVideoUrl: string | null;
  isCreatingGif: boolean;
  gifError: string | null;
  gifUrl: string | null;
  onCreateGif: () => void;
  className?: string;
};

export function CameraControls({ className }: CameraControlsProps) {
  return (
    <div className={className}>
      {/* {isRecording && (
        <p>Recording: {recordingSecondsLeft}s remaining (max 8 seconds)</p>
      )}

      {isRecording && plannedFaceRegions.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          Star plan:{" "}
          {plannedFaceRegions
            .map(
              (region, index) =>
                `Star ${index + 1} (${STAR_FRAME_SLICES[index].frameStart}-${STAR_FRAME_SLICES[index].frameEnd}) → ${FACE_REGION_LABELS[region]}`,
            )
            .join(" · ")}
        </p>
      )} */}

      {/* <p className="mt-3 text-sm text-gray-500">
        Captured frames: {capturedFrameCount} / {maxFrames} (every 0.5s while
        recording)
      </p> */}
      {/* 
      {recordedVideoUrl && (
        <div className="mt-4">
          <p>Recorded video</p>
          <video src={recordedVideoUrl} controls width={500} />
          <p className="mt-2">
            <a href={recordedVideoUrl} download="camera-recording.webm">
              Download video
            </a>
          </p>
        </div>
      )} */}
      {/* 
      <div className="mt-4">
        <button
          type="button"
          onClick={onCreateGif}
          disabled={isCreatingGif || capturedFrameCount === 0}
        >
          {isCreatingGif ? "Creating GIF..." : "Create GIF from frames"}
        </button>

        {gifError && <p className="mt-3 text-red-600">{gifError}</p>}

        {gifUrl && (
          <div className="mt-4">
            <p>Generated GIF</p>
            <img
              src={gifUrl}
              alt="Generated from captured frames"
              width={500}
            />
            <p className="mt-2">
              <a href={gifUrl} download="camera-recording.gif">
                Download GIF
              </a>
            </p>
          </div>
        )}
      </div> */}
    </div>
  );
}
