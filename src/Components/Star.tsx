import { Application, extend, useApplication } from "@pixi/react";
import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { useEffect, useMemo } from "react";
import { cropImageDataToStar } from "../utils/starCrop";

extend({ Container, Graphics, Sprite, Texture });

const PREVIEW_FRAME_COUNT = 3;
const STAR_OUTPUT_SIZE = 300;
const FRAME_GAP = 16;
const APPLICATION_WIDTH =
  PREVIEW_FRAME_COUNT * STAR_OUTPUT_SIZE +
  (PREVIEW_FRAME_COUNT - 1) * FRAME_GAP;

type StarProps = {
  recordedFrames: ImageData[] | null;
};

type StarFramesProps = {
  frameUrls: (string | null)[];
};

function StarFrames({ frameUrls }: StarFramesProps) {
  const { app, isInitialised } = useApplication();

  useEffect(() => {
    if (!isInitialised) {
      return;
    }

    globalThis.__PIXI_APP__ = app;

    return () => {
      delete globalThis.__PIXI_APP__;
    };
  }, [app, isInitialised]);

  return (
    <pixiContainer>
      {frameUrls.map((frameUrl, index) =>
        frameUrl ? (
          <pixiSprite
            key={index}
            texture={Texture.from(frameUrl)}
            x={index * (STAR_OUTPUT_SIZE + FRAME_GAP)}
            width={STAR_OUTPUT_SIZE}
            height={STAR_OUTPUT_SIZE}
          />
        ) : null,
      )}
    </pixiContainer>
  );
}

export const Star = ({ recordedFrames }: StarProps) => {
  const { frameUrls, captureError } = useMemo(() => {
    const emptyFrames = Array.from({ length: PREVIEW_FRAME_COUNT }, () => null);

    if (!recordedFrames?.length) {
      return { frameUrls: emptyFrames, captureError: null };
    }

    try {
      const croppedFrames = recordedFrames
        .slice(0, PREVIEW_FRAME_COUNT)
        .map((frame) => cropImageDataToStar(frame, STAR_OUTPUT_SIZE));

      return {
        frameUrls: Array.from({ length: PREVIEW_FRAME_COUNT }, (_, index) =>
          croppedFrames[index] ?? null,
        ),
        captureError: null,
      };
    } catch (error) {
      return {
        frameUrls: emptyFrames,
        captureError:
          error instanceof Error ? error.message : "Star crop failed",
      };
    }
  }, [recordedFrames]);

  const hasRecordedFrames = Boolean(recordedFrames?.length);
  const capturedCount = frameUrls.filter(Boolean).length;

  return (
    <div>
      <p>Star crop preview (first {PREVIEW_FRAME_COUNT} recorded frames)</p>

      {!hasRecordedFrames && (
        <p style={{ color: "#6b7280" }}>
          Record a video to see star-shaped frame previews.
        </p>
      )}

      {hasRecordedFrames && capturedCount > 0 && (
        <p style={{ color: "#6b7280" }}>
          Showing {capturedCount} star crop
          {capturedCount === 1 ? "" : "s"} from your recording.
        </p>
      )}

      {captureError && <p style={{ color: "#dc2626" }}>{captureError}</p>}

      {hasRecordedFrames && (
        <>
          <Application
            width={APPLICATION_WIDTH}
            height={STAR_OUTPUT_SIZE}
            backgroundAlpha={0}
            antialias
          >
            <StarFrames frameUrls={frameUrls} />
          </Application>

          <div
            style={{
              display: "flex",
              gap: `${FRAME_GAP}px`,
              marginTop: "0.5rem",
            }}
          >
            {frameUrls.map((frameUrl, index) => (
              <div
                key={index}
                style={{
                  width: STAR_OUTPUT_SIZE,
                  textAlign: "center",
                }}
              >
                {frameUrl ? (
                  <img
                    src={frameUrl}
                    alt={`Star crop frame ${index + 1}`}
                    width={STAR_OUTPUT_SIZE}
                    height={STAR_OUTPUT_SIZE}
                    style={{ display: "block" }}
                  />
                ) : (
                  <div
                    style={{
                      width: STAR_OUTPUT_SIZE,
                      height: STAR_OUTPUT_SIZE,
                      border: "1px dashed #d1d5db",
                      background: "#f9fafb",
                    }}
                  />
                )}
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    margin: "0.25rem 0 0",
                  }}
                >
                  Frame {index + 1}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
