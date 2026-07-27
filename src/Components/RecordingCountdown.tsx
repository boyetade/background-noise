import { BoxedWordsText } from "./BoxedWordsText";

type RecordingCountdownProps = {
  value: number;
};

export function RecordingCountdown({ value }: RecordingCountdownProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/35">
      <BoxedWordsText
        text={String(value)}
        boxClassName="px-4 py-2 text-8xl leading-none"
      />
    </div>
  );
}
