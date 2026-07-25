export type Point = {
  x: number;
  y: number;
};

export type HandDrawnRectOptions = {
  inset?: number;
  jitter?: number;
  step?: number;
  passes?: number;
  seed?: number;
};

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
  const segments = Math.max(2, Math.ceil(edgeLength / step));
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
      segment === 0 || segment === segments ? 0.55 + random() * 0.25 : 1;
    const perpendicular = (random() * 2 - 1) * jitter * cornerDamp;
    const along = (random() * 2 - 1) * jitter * 0.25;

    points.push({
      x: baseX + normalX * perpendicular + (dx / length) * along,
      y: baseY + normalY * perpendicular + (dy / length) * along,
    });
  }

  return points;
}

export function createHandDrawnRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  options: HandDrawnRectOptions = {},
): Point[] {
  const inset = options.inset ?? 12;
  const jitter = options.jitter ?? 2.5;
  const step = options.step ?? 10;
  const seed = options.seed ?? 1;
  const random = createSeededRandom(seed);

  const left = x + inset;
  const top = y + inset;
  const right = x + width - inset;
  const bottom = y + height - inset;

  const corners: Point[] = [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];

  const points: Point[] = [];

  for (let edgeIndex = 0; edgeIndex < corners.length; edgeIndex += 1) {
    const start = corners[edgeIndex];
    const end = corners[(edgeIndex + 1) % corners.length];
    points.push(...sampleEdge(start, end, step, jitter, random, edgeIndex === 0));
  }

  return points;
}

export function createHandDrawnRectPaths(
  x: number,
  y: number,
  width: number,
  height: number,
  options: HandDrawnRectOptions = {},
): Point[][] {
  const passes = options.passes ?? 3;
  const seed = options.seed ?? 1;

  return Array.from({ length: passes }, (_, passIndex) =>
    createHandDrawnRectPath(x, y, width, height, {
      ...options,
      seed: seed + passIndex * 7919,
      jitter: (options.jitter ?? 2.5) + passIndex * 1.25,
    }),
  );
}

export function hashStringToSeed(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
