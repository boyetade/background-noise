import { FACE_REGION_LABELS, type FaceRegion } from "../utils/faceZoom";
import {
  STAR_FRAME_SLICES,
  STAR_OUTPUT_SIZE,
} from "../utils/starGifs";

const FRAME_GAP = 16;

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
      <p>
        Star crop GIFs (frames 2–5, 6–10, 11–15)
      </p>

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
        <div
          style={{
            display: "flex",
            gap: `${FRAME_GAP}px`,
            marginTop: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          {starGifUrls.map((gifUrl, index) => {
            const { frameStart, frameEnd } = STAR_FRAME_SLICES[index];
            const regionLabel = faceRegions[index]
              ? FACE_REGION_LABELS[faceRegions[index]]
              : null;

            return (
              <div
                key={index}
                style={{
                  width: STAR_OUTPUT_SIZE,
                  textAlign: "center",
                }}
              >
                {gifUrl ? (
                  <img
                    src={gifUrl}
                    alt={`Star crop GIF ${index + 1}`}
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
                  Star {index + 1}
                  {regionLabel
                    ? ` · ${regionLabel} (frames ${frameStart}-${frameEnd})`
                    : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
