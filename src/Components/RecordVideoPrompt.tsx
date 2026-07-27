import type { CSSProperties } from "react";
import { BoxedWordsText } from "./BoxedWordsText";

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
    <BoxedWordsText
      text="Have 8 seconds of expression"
      className={`w-48 ${className ?? ""}`}
      style={style}
      boxClassName="text-2xl"
    />
  );
}
