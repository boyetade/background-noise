import type { CSSProperties } from "react";

type CameraViewfinderOverlayProps = {
  isRecording: boolean;
  recordingSecondsLeft?: string;
  capturedFrameCount?: number;
  maxFrames?: number;
  inset: number;
};

function ViewfinderCorner({
  flipX = false,
  flipY = false,
}: {
  flipX?: boolean;
  flipY?: boolean;
}) {
  return (
    <svg className="h-10 w-10 text-white/85" viewBox="0 0 40 40" aria-hidden>
      <path
        d="M4 14 L4 4 L14 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1}) translate(${flipX ? -40 : 0}, ${flipY ? -40 : 0})`}
      />
    </svg>
  );
}

function BatteryIndicator() {
  return (
    <div className="flex items-center gap-1 text-white/90 drop-shadow-sm">
      <div className="relative h-3 w-6 rounded-sm border border-current">
        <div className="absolute inset-y-0.5 left-0.5 w-3.5 bg-white/90" />
        <div className="absolute -right-1 top-1/2 h-1.5 w-0.5 -translate-y-1/2 rounded-r-sm bg-current" />
      </div>
      <span className="font-mono text-[10px] tracking-wide">84%</span>
    </div>
  );
}

function formatTimecode(
  recordingSecondsLeft: string,
  maxSeconds: number,
): string {
  const remaining = Number.parseFloat(recordingSecondsLeft);
  const elapsed = Math.max(0, maxSeconds - remaining);
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);
  const tenths = Math.floor((elapsed % 1) * 10);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function overlayPosition(inset: number): CSSProperties {
  return { top: inset + 10, right: inset + 10, bottom: inset + 10, left: inset + 10 };
}

export function CameraViewfinderOverlay({
  isRecording,
  recordingSecondsLeft = "8.0",
  capturedFrameCount = 0,
  maxFrames = 15,
  inset,
}: CameraViewfinderOverlayProps) {
  const frame = overlayPosition(inset);
  const timecode = formatTimecode(recordingSecondsLeft, 8);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 text-white">
      <div className="absolute" style={{ top: frame.top, left: frame.left }}>
        <ViewfinderCorner />
      </div>
      <div className="absolute" style={{ top: frame.top, right: frame.right }}>
        <ViewfinderCorner flipX />
      </div>
      <div className="absolute" style={{ bottom: frame.bottom, left: frame.left }}>
        <ViewfinderCorner flipY />
      </div>
      <div
        className="absolute"
        style={{ bottom: frame.bottom, right: frame.right }}
      >
        <ViewfinderCorner flipX flipY />
      </div>

      <div
        className="absolute flex items-center gap-2"
        style={{ top: frame.top, left: (frame.left as number) + 48 }}
      >
        {isRecording ? (
          <>
            <span className="size-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="font-mono text-xs font-semibold tracking-[0.2em] text-red-400 drop-shadow-sm">
              REC
            </span>
          </>
        ) : (
          <span className="rounded bg-black/35 px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] text-white/80">
            STBY
          </span>
        )}
      </div>

      <div
        className="absolute flex items-center gap-3"
        style={{ top: frame.top, right: (frame.right as number) + 48 }}
      >
        {isRecording && (
          <span className="rounded bg-black/35 px-2 py-0.5 font-mono text-xs tracking-wider drop-shadow-sm">
            {timecode}
          </span>
        )}
        <BatteryIndicator />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative size-16 text-white/50">
          <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
          <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
          <span className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current bg-black/20" />
        </div>
      </div>

      <div
        className="absolute flex items-center gap-3 font-mono text-[10px] tracking-wider text-white/80 drop-shadow-sm"
        style={{ bottom: frame.bottom, left: (frame.left as number) + 48 }}
      >
        <span className="rounded bg-black/35 px-2 py-0.5">HD</span>
        <span className="rounded bg-black/35 px-2 py-0.5">30fps</span>
      </div>

      <div
        className="absolute flex items-center gap-2 font-mono text-[10px] tracking-wider text-white/80 drop-shadow-sm"
        style={{ bottom: frame.bottom, right: (frame.right as number) + 48 }}
      >
        {isRecording && (
          <span className="rounded bg-black/35 px-2 py-0.5">
            FR {capturedFrameCount}/{maxFrames}
          </span>
        )}
        <span className="rounded bg-black/35 px-2 py-0.5">AF</span>
      </div>
    </div>
  );
}
