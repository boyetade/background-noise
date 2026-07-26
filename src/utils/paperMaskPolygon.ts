export type Point = {
  x: number;
  y: number;
};

export type PaperMaskPolygonOptions = {
  seed?: number;
  jitter?: number;
  step?: number;
  rotationDegrees?: number;
};

const PAPER_CORNER_FRACTIONS: Point[] = [
  { x: 0.05, y: 0.05 },
  { x: 0.95, y: 0.09 },
  { x: 0.93, y: 0.86 },
  { x: 0.04, y: 0.82 },
];

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function sampleEdge(
  start: Point,
  end: Point,
  step: number,
  jitter: number,
  random: () => number,
  includeStart: boolean,
): Point[] {
  const edgeLength = Math.hypot(end.x - start.x, end.y - start.y);
  const segments = Math.max(3, Math.ceil(edgeLength / step));
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = edgeLength || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const points: Point[] = [];

  for (let segment = includeStart ? 0 : 1; segment <= segments; segment += 1) {
    const t = segment / segments;
    const baseX = start.x + dx * t;
    const baseY = start.y + dy * t;
    const cornerDamp =
      segment === 0 || segment === segments ? 0.6 + random() * 0.2 : 1;
    const perpendicular = (random() * 2 - 1) * jitter * cornerDamp;
    const along = (random() * 2 - 1) * jitter * 0.2;

    points.push({
      x: baseX + normalX * perpendicular + (dx / length) * along,
      y: baseY + normalY * perpendicular + (dy / length) * along,
    });
  }

  return points;
}

function rotatePoint(point: Point, center: Point, angleRadians: number): Point {
  const cosine = Math.cos(angleRadians);
  const sine = Math.sin(angleRadians);
  const offsetX = point.x - center.x;
  const offsetY = point.y - center.y;

  return {
    x: center.x + offsetX * cosine - offsetY * sine,
    y: center.y + offsetX * sine + offsetY * cosine,
  };
}

function scaleCornersToSize(width: number, height: number): Point[] {
  return PAPER_CORNER_FRACTIONS.map((corner) => ({
    x: corner.x * width,
    y: corner.y * height,
  }));
}

export function createPaperMaskPolygon(
  width: number,
  height: number,
  options: PaperMaskPolygonOptions = {},
): Point[] {
  const seed = options.seed ?? 11;
  const jitter = options.jitter ?? 0.9;
  const step = options.step ?? 18;
  const rotationDegrees = options.rotationDegrees ?? -1.5;
  const random = createSeededRandom(seed);
  const corners = scaleCornersToSize(width, height);
  const points: Point[] = [];

  for (let edgeIndex = 0; edgeIndex < corners.length; edgeIndex += 1) {
    const start = corners[edgeIndex];
    const end = corners[(edgeIndex + 1) % corners.length];
    points.push(
      ...sampleEdge(start, end, step, jitter, random, edgeIndex === 0),
    );
  }

  const center = { x: width / 2, y: height / 2 };
  const angleRadians = (rotationDegrees * Math.PI) / 180;

  return points.map((point) => rotatePoint(point, center, angleRadians));
}

export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) {
    return "";
  }

  const [firstPoint, ...rest] = points;
  const segments = rest.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);

  return `M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)} ${segments.join(" ")} Z`;
}
