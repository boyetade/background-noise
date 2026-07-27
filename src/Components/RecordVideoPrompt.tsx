import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { BoxedWordsText } from "./BoxedWordsText";
import { isQuentinFontReady, preloadFonts } from "../loadFonts";

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
  const [isFontReady, setIsFontReady] = useState(isQuentinFontReady);

  useEffect(() => {
    if (isFontReady) {
      return;
    }

    let cancelled = false;

    void preloadFonts().then(() => {
      if (!cancelled) {
        setIsFontReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isFontReady]);

  if (hidden || !isFontReady) {
    return null;
  }

  return (
    <BoxedWordsText
      text="Have 8 seconds of expression"
      className={`max-w-48 ${className ?? ""}`}
      style={style}
      boxClassName="text-2xl"
    />
  );
}
