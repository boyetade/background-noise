import "../pixi/setup";
import { Application } from "@pixi/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Graphics } from "pixi.js";
import { isQuentinFontReady, preloadFonts } from "../loadFonts";

type BoxedWordsTextProps = {
  text: string;
  className?: string;
  style?: CSSProperties;
  boxClassName?: string;
};

type WordLayout = {
  word: string;
  centerX: number;
  centerY: number;
  boxWidth: number;
  boxHeight: number;
  rotation: number;
};

const WORD_ROTATIONS = [-2.5, 2.5, -3, 3, -2, 2] as const;
const WORD_GAP = 8;

function getWordRotation(index: number): number {
  return WORD_ROTATIONS[index % WORD_ROTATIONS.length];
}

function getFontSize(boxClassName: string): number {
  if (boxClassName.includes("text-8xl")) {
    return 96;
  }

  if (boxClassName.includes("text-2xl")) {
    return 24;
  }

  return 16;
}

function getPadding(boxClassName: string): number {
  if (boxClassName.includes("text-8xl")) {
    return 16;
  }

  return 8;
}

function measureWord(
  word: string,
  fontSize: number,
): { width: number; height: number } {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return { width: word.length * fontSize * 0.55, height: fontSize * 1.2 };
  }

  context.font = `${fontSize}px Quentin`;
  const metrics = context.measureText(word);

  return {
    width: metrics.width,
    height: fontSize * 1.2,
  };
}

function layoutWords(
  words: string[],
  maxWidth: number,
  fontSize: number,
  padding: number,
): { layouts: WordLayout[]; height: number } {
  if (words.length === 0 || maxWidth <= 0) {
    return { layouts: [], height: 0 };
  }

  let x = 0;
  let y = 0;
  let rowHeight = 0;
  const layouts: WordLayout[] = [];

  words.forEach((word, index) => {
    const { width, height } = measureWord(word, fontSize);
    const boxWidth = width + padding * 2;
    const boxHeight = height + padding * 2;

    if (x + boxWidth > maxWidth && x > 0) {
      x = 0;
      y += rowHeight + WORD_GAP;
      rowHeight = 0;
    }

    layouts.push({
      word,
      centerX: x + boxWidth / 2,
      centerY: y + boxHeight / 2,
      boxWidth,
      boxHeight,
      rotation: getWordRotation(index),
    });

    x += boxWidth + WORD_GAP;
    rowHeight = Math.max(rowHeight, boxHeight);
  });

  return { layouts, height: y + rowHeight };
}

export function BoxedWordsText({
  text,
  className = "",
  style,
  boxClassName = "",
}: BoxedWordsTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isFontReady, setIsFontReady] = useState(isQuentinFontReady);

  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean), [text]);

  const fontSize = getFontSize(boxClassName);
  const padding = getPadding(boxClassName);

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

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setContainerWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const layoutWidth =
    containerWidth > 0
      ? containerWidth
      : className.includes("w-48")
        ? 192
        : className.includes("max-w-48")
          ? 192
          : 320;

  const { layouts, height: layoutHeight } = useMemo(() => {
    if (!isFontReady) {
      return { layouts: [], height: 0 };
    }

    return layoutWords(words, layoutWidth, fontSize, padding);
  }, [words, layoutWidth, fontSize, padding, isFontReady]);

  const drawBoxes = useCallback(
    (graphics: Graphics) => {
      graphics.clear();

      for (const layout of layouts) {
        const { centerX, centerY, boxWidth, boxHeight, rotation } = layout;

        graphics.save();
        graphics.translateTransform(centerX, centerY);
        graphics.rotateTransform((rotation * Math.PI) / 180);
        graphics.rect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
        graphics.fill({ color: 0xffffff, alpha: 1 });
        graphics.restore();
      }
    },
    [layouts],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: layoutWidth, minHeight: layoutHeight || undefined, ...style }}
    >
      <div className="relative" style={{ width: layoutWidth, height: layoutHeight }}>
        {!isFontReady ? null : layoutHeight > 0 ? (
        <>
          <Application
            width={layoutWidth}
            height={layoutHeight}
            backgroundAlpha={0}
            antialias
            eventMode="none"
            autoStart
            className="pointer-events-none absolute inset-0 block"
          >
            <pixiGraphics draw={drawBoxes} />
          </Application>

          {layouts.map((layout, index) => (
            <span
              key={`${layout.word}-${index}`}
              className={`pointer-events-none absolute font-quentin leading-tight text-black ${boxClassName}`}
              style={{
                left: layout.centerX,
                top: layout.centerY,
                padding: `${padding}px`,
                transform: `translate(-50%, -50%) rotate(${layout.rotation}deg)`,
              }}
            >
              {layout.word}
            </span>
          ))}
        </>
      ) : null}
      </div>
    </div>
  );
}
