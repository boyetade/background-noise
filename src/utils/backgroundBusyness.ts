export type BusynessLevel = "quiet" | "moderate" | "busy" | "very-busy";

export type BackgroundAnalysis = {
  busyness: number;
  motion: number;
  complexity: number;
  objectRegions: number;
  level: BusynessLevel;
};

const GRID_SIZE = 12;
const MOTION_THRESHOLD = 28;
const EDGE_THRESHOLD = 45;
const REGION_EDGE_DENSITY = 0.08;

function grayscale(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function getBusynessLevel(score: number): BusynessLevel {
  if (score < 0.2) return "quiet";
  if (score < 0.45) return "moderate";
  if (score < 0.7) return "busy";
  return "very-busy";
}

function computeEdgeMap(
  gray: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const edges = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;

      const topLeft = gray[(y - 1) * width + (x - 1)];
      const top = gray[(y - 1) * width + x];
      const topRight = gray[(y - 1) * width + (x + 1)];
      const left = gray[y * width + (x - 1)];
      const right = gray[y * width + (x + 1)];
      const bottomLeft = gray[(y + 1) * width + (x - 1)];
      const bottom = gray[(y + 1) * width + x];
      const bottomRight = gray[(y + 1) * width + (x + 1)];

      const gx =
        -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
      const gy =
        -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;

      edges[idx] = Math.min(255, Math.hypot(gx, gy));
    }
  }

  return edges;
}

export function analyzeBackgroundBusyness(
  frame: ImageData,
  personMask: ImageData,
  previousBackground: Uint8ClampedArray | null,
): BackgroundAnalysis {
  const { width, height, data } = frame;
  const pixelCount = width * height;
  const gray = new Float32Array(pixelCount);
  const backgroundMask = new Uint8Array(pixelCount);

  let backgroundPixels = 0;
  let motionPixels = 0;
  let edgePixels = 0;
  let colorVarianceSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const isBackground = personMask.data[i + 3] < 128;

    if (!isBackground) continue;

    backgroundMask[pixelIndex] = 1;
    backgroundPixels += 1;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    gray[pixelIndex] = grayscale(r, g, b);

    colorVarianceSum +=
      Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);

    if (previousBackground && previousBackground[i + 3] > 0) {
      const delta =
        Math.abs(r - previousBackground[i]) +
        Math.abs(g - previousBackground[i + 1]) +
        Math.abs(b - previousBackground[i + 2]);

      if (delta > MOTION_THRESHOLD) {
        motionPixels += 1;
      }
    }
  }

  if (backgroundPixels === 0) {
    return {
      busyness: 0,
      motion: 0,
      complexity: 0,
      objectRegions: 0,
      level: "quiet",
    };
  }

  const edges = computeEdgeMap(gray, width, height);

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (!backgroundMask[pixelIndex]) continue;
    if (edges[pixelIndex] > EDGE_THRESHOLD) {
      edgePixels += 1;
    }
  }

  const cellWidth = Math.ceil(width / GRID_SIZE);
  const cellHeight = Math.ceil(height / GRID_SIZE);
  let busyCells = 0;

  for (let cellY = 0; cellY < GRID_SIZE; cellY += 1) {
    for (let cellX = 0; cellX < GRID_SIZE; cellX += 1) {
      const startX = cellX * cellWidth;
      const startY = cellY * cellHeight;
      const endX = Math.min(startX + cellWidth, width);
      const endY = Math.min(startY + cellHeight, height);

      let cellBackgroundPixels = 0;
      let cellEdgePixels = 0;
      let cellVariance = 0;

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const pixelIndex = y * width + x;
          if (!backgroundMask[pixelIndex]) continue;

          cellBackgroundPixels += 1;
          if (edges[pixelIndex] > EDGE_THRESHOLD) {
            cellEdgePixels += 1;
          }

          const i = pixelIndex * 4;
          cellVariance +=
            Math.abs(data[i] - data[i + 1]) +
            Math.abs(data[i + 1] - data[i + 2]);
        }
      }

      if (cellBackgroundPixels === 0) continue;

      const edgeDensity = cellEdgePixels / cellBackgroundPixels;
      const varianceScore = cellVariance / (cellBackgroundPixels * 255 * 2);

      if (
        edgeDensity > REGION_EDGE_DENSITY ||
        varianceScore > 0.12
      ) {
        busyCells += 1;
      }
    }
  }

  const motion = motionPixels / backgroundPixels;
  const complexity = Math.min(
    1,
    edgePixels / backgroundPixels / 0.35 +
      colorVarianceSum / (backgroundPixels * 255 * 3) / 0.4,
  );
  const regionScore = busyCells / (GRID_SIZE * GRID_SIZE);
  const busyness = Math.min(
    1,
    complexity * 0.55 + motion * 0.25 + regionScore * 0.2,
  );

  return {
    busyness,
    motion,
    complexity,
    objectRegions: busyCells,
    level: getBusynessLevel(busyness),
  };
}

export function renderBusynessHeatmap(
  frame: ImageData,
  personMask: ImageData,
  previousBackground: Uint8ClampedArray | null,
  edges: Float32Array,
): ImageData {
  const { width, height, data } = frame;
  const output = new ImageData(width, height);

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const isBackground = personMask.data[i + 3] < 128;

    if (!isBackground) {
      output.data[i] = 0;
      output.data[i + 1] = 0;
      output.data[i + 2] = 0;
      output.data[i + 3] = 255;
      continue;
    }

    const edgeStrength = Math.min(1, edges[pixelIndex] / 255);
    let motionStrength = 0;

    if (previousBackground && previousBackground[i + 3] > 0) {
      const delta =
        Math.abs(data[i] - previousBackground[i]) +
        Math.abs(data[i + 1] - previousBackground[i + 1]) +
        Math.abs(data[i + 2] - previousBackground[i + 2]);
      motionStrength = Math.min(1, delta / 120);
    }

    const intensity = Math.min(1, edgeStrength * 0.7 + motionStrength * 0.3);

    if (intensity < 0.15) {
      output.data[i] = 18;
      output.data[i + 1] = 22;
      output.data[i + 2] = 30;
    } else if (intensity < 0.4) {
      output.data[i] = 40;
      output.data[i + 1] = 120;
      output.data[i + 2] = 180;
    } else if (intensity < 0.65) {
      output.data[i] = 240;
      output.data[i + 1] = 180;
      output.data[i + 2] = 40;
    } else {
      output.data[i] = 255;
      output.data[i + 1] = 70;
      output.data[i + 2] = 70;
    }

    output.data[i + 3] = 255;
  }

  return output;
}

export function buildBackgroundSnapshot(
  frame: ImageData,
  personMask: ImageData,
): Uint8ClampedArray {
  const snapshot = new Uint8ClampedArray(frame.data.length);

  for (let i = 0; i < frame.data.length; i += 4) {
    const isBackground = personMask.data[i + 3] < 128;

    if (isBackground) {
      snapshot[i] = frame.data[i];
      snapshot[i + 1] = frame.data[i + 1];
      snapshot[i + 2] = frame.data[i + 2];
      snapshot[i + 3] = 255;
    }
  }

  return snapshot;
}

export function buildEdgeMapForFrame(
  frame: ImageData,
  personMask: ImageData,
): Float32Array {
  const { width, height, data } = frame;
  const gray = new Float32Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    if (personMask.data[i + 3] >= 128) continue;
    gray[i / 4] = grayscale(data[i], data[i + 1], data[i + 2]);
  }

  return computeEdgeMap(gray, width, height);
}

export function maskPersonFromFrame(
  frame: ImageData,
  personMask: ImageData,
): void {
  for (let i = 0; i < frame.data.length; i += 4) {
    if (personMask.data[i + 3] >= 128) {
      frame.data[i] = 0;
      frame.data[i + 1] = 0;
      frame.data[i + 2] = 0;
    }
  }
}

export function renderBlueBackground(
  frame: ImageData,
  personMask: ImageData,
): ImageData {
  const { width, height, data } = frame;
  const output = new ImageData(width, height);

  for (let i = 0; i < data.length; i += 4) {
    const isBackground = personMask.data[i + 3] < 128;

    if (isBackground) {
      const luminance = grayscale(data[i], data[i + 1], data[i + 2]) / 255;
      output.data[i] = luminance * 30;
      output.data[i + 1] = luminance * 110;
      output.data[i + 2] = luminance * 255;
      output.data[i + 3] = 255;
    } else {
      output.data[i] = 0;
      output.data[i + 1] = 0;
      output.data[i + 2] = 0;
      output.data[i + 3] = 255;
    }
  }

  return output;
}

export function getBusynessLabel(level: BusynessLevel): string {
  switch (level) {
    case "quiet":
      return "Quiet — empty or plain background";
    case "moderate":
      return "Moderate — some objects behind you";
    case "busy":
      return "Busy — lots of detail or movement behind you";
    case "very-busy":
      return "Very busy — crowded or active background";
  }
}

export function getBusynessColor(level: BusynessLevel): string {
  switch (level) {
    case "quiet":
      return "#4ade80";
    case "moderate":
      return "#facc15";
    case "busy":
      return "#fb923c";
    case "very-busy":
      return "#f87171";
  }
}
