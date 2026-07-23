import { FACE_REGION_LABELS, type FaceRegion } from "../utils/faceZoom";
import { STAR_FRAME_SLICES, STAR_OUTPUT_SIZE } from "../utils/starGifs";

const FRAME_GAP = 16;
const STAGE_BACKGROUND = "#ff0000";
const STAGE_ASPECT_RATIO = 4 / 3;
const STARS_ROW_WIDTH = STAR_OUTPUT_SIZE * 3 + FRAME_GAP * 2;
const STAGE_WIDTH = STARS_ROW_WIDTH + 48;
const STAGE_HEIGHT = STAGE_WIDTH / STAGE_ASPECT_RATIO;

type StarProps = {
  hasRecording: boolean;
  starGifUrls: (string | null)[];
  faceRegions: FaceRegion[];
  isCreatingGifs: boolean;
  captureError: string | null;
};

export const Star = ({
  hasRecording,
  starGifUrls,
  faceRegions,
  isCreatingGifs,
  captureError,
}: StarProps) => {
  const createdGifCount = starGifUrls.filter(Boolean).length;

  return (
    <div>
      <p>Star crop GIFs (frames 2–5, 6–10, 11–15)</p>

      {!hasRecording && (
        <p style={{ color: "#6b7280" }}>
          Record a video to see star-shaped GIF previews — each star shows a
          different part of your face.
        </p>
      )}

      {hasRecording && isCreatingGifs && (
        <p style={{ color: "#6b7280" }}>Creating star GIFs...</p>
      )}

      {hasRecording && !isCreatingGifs && createdGifCount > 0 && (
        <p style={{ color: "#6b7280" }}>
          Showing {createdGifCount} star GIF
          {createdGifCount === 1 ? "" : "s"}, one per face region.
        </p>
      )}

      {captureError && <p style={{ color: "#dc2626" }}>{captureError}</p>}

      {hasRecording && (
        <div style={{ marginTop: "0.5rem" }}>
          <div
            style={{
              width: STAGE_WIDTH,
              height: STAGE_HEIGHT,
              aspectRatio: "4 / 3",
              backgroundColor: STAGE_BACKGROUND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: `${FRAME_GAP}px`,
              }}
            >
              {starGifUrls.map((gifUrl, index) =>
                gifUrl ? (
                  <img
                    key={index}
                    src={gifUrl}
                    alt={`Star crop GIF ${index + 1}`}
                    width={STAR_OUTPUT_SIZE}
                    height={STAR_OUTPUT_SIZE}
                    style={{ display: "block" }}
                  />
                ) : (
                  <div
                    key={index}
                    style={{
                      width: STAR_OUTPUT_SIZE,
                      height: STAR_OUTPUT_SIZE,
                      border: "1px dashed rgba(255, 255, 255, 0.6)",
                      background: "rgba(0, 0, 0, 0.08)",
                    }}
                  />
                ),
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              width: STAGE_WIDTH,
              marginTop: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: `${FRAME_GAP}px`,
                width: STARS_ROW_WIDTH,
              }}
            >
              {starGifUrls.map((_, index) => {
                const { frameStart, frameEnd } = STAR_FRAME_SLICES[index];
                const regionLabel = faceRegions[index]
                  ? FACE_REGION_LABELS[faceRegions[index]]
                  : null;

                return (
                  <p
                    key={index}
                    style={{
                      width: STAR_OUTPUT_SIZE,
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      textAlign: "center",
                      margin: 0,
                    }}
                  >
                    Star {index + 1}
                    {regionLabel
                      ? ` · ${regionLabel} (frames ${frameStart}-${frameEnd})`
                      : ""}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
