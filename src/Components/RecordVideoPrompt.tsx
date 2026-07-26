import type { CSSProperties } from "react";

type RecordVideoPromptProps = {
  className?: string;
  style?: CSSProperties;
  hidden?: boolean;
};

export function RecordVideoPrompt({
  className,
  style,
  hidden = false,
}: RecordVideoPromptProps) {
  if (hidden) {
    return null;
  }

  return (
    <p
      className={`max-w-48 -rotate-2 font-quentin text-2xl leading-tight text-white ${className ?? ""}`}
      style={style}
    >
      Have 8 seconds of expression
    </p>
  );
}
