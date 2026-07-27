import { useMemo, type CSSProperties } from "react";

type BoxedWordsTextProps = {
  text: string;
  className?: string;
  style?: CSSProperties;
  boxClassName?: string;
};

const WORD_ROTATIONS = [-2.5, 2.5, -3, 3, -2, 2] as const;

function getWordRotation(index: number): number {
  return WORD_ROTATIONS[index % WORD_ROTATIONS.length];
}

export function BoxedWordsText({
  text,
  className = "",
  style,
  boxClassName = "",
}: BoxedWordsTextProps) {
  const words = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean),
    [text],
  );

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      style={style}
    >
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className={`bg-white px-2 py-1 font-quentin leading-tight text-black ${boxClassName}`}
          style={{ transform: `rotate(${getWordRotation(index)}deg)` }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}
