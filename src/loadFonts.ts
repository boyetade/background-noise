let fontsReady: Promise<void> | null = null;

const QUENTIN_FONT_SPEC = 'normal 1rem "Quentin"';

export function preloadFonts(): Promise<void> {
  if (fontsReady) {
    return fontsReady;
  }

  fontsReady = document.fonts.load(QUENTIN_FONT_SPEC).then(() => undefined);

  return fontsReady;
}

export function isQuentinFontReady(): boolean {
  return document.fonts.check(QUENTIN_FONT_SPEC);
}
