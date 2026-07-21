function grayscale(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function drawPersonCutoutOnTop(
  ctx: CanvasRenderingContext2D,
  frame: ImageData,
  personMask: ImageData,
): boolean {
  const canvasData = ctx.getImageData(0, 0, frame.width, frame.height);
  let personDetected = false;

  for (let i = 0; i < frame.data.length; i += 4) {
    if (personMask.data[i + 3] < 128) continue;

    personDetected = true;
    const gray = grayscale(
      frame.data[i],
      frame.data[i + 1],
      frame.data[i + 2],
    );

    canvasData.data[i] = gray;
    canvasData.data[i + 1] = gray;
    canvasData.data[i + 2] = gray;
    canvasData.data[i + 3] = 255;
  }

  if (personDetected) {
    ctx.putImageData(canvasData, 0, 0);
  }

  return personDetected;
}
