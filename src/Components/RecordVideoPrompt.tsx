import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
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
    <p
      className={`max-w-48 -rotate-2 font-quentin text-2xl leading-tight text-white ${className ?? ""}`}
      style={style}
    >
      Have 8 seconds of expression
    </p>
  );
}
