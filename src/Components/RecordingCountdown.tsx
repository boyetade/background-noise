type RecordingCountdownProps = {
  value: number;
};

export function RecordingCountdown({ value }: RecordingCountdownProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/35">
      <span className="font-quentin text-8xl leading-none text-white">
        {value}
      </span>
    </div>
  );
}
