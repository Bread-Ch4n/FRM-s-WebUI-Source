export type RGB = [number, number, number];
export type HSL = [number, number, number];

function parseHSL(input: string | HSL): HSL {
  if (Array.isArray(input)) return input;
  const parts = input
    .replace(/deg/g, "")
    .replace(/%/g, "")
    .split(",")
    .map((v) => Number(v.trim()));
  if (parts.length !== 3) throw new Error("Invalid HSL input");
  return [parts[0], parts[1], parts[2]];
}

function formatHSL([h, s, l]: HSL): string {
  return `${Math.round(h)}deg, ${Math.round(s)}%, ${Math.round(l)}%`;
}

export function adjustColorShades(
  color: RGB | HSL | string,
  steps = 6,
  factor = 0.85,
  darken = true,
  mode: "rgb" | "hsl" = "rgb",
): (RGB | string)[] {
  if (mode === "hsl") {
    let [h, s, l] = parseHSL(color as string | HSL);
    const shades: string[] = [formatHSL([h, s, l])];

    for (let i = 0; i < steps; i++) {
      l = darken ? Math.max(0, l * factor) : Math.min(100, l / factor);
      shades.push(formatHSL([h, s, l]));
    }

    return shades;
  } else {
    let [r, g, b] = color as RGB;
    const shades: RGB[] = [[r, g, b]];

    for (let i = 0; i < steps; i++) {
      if (darken) {
        r = Math.max(0, Math.floor(r * factor));
        g = Math.max(0, Math.floor(g * factor));
        b = Math.max(0, Math.floor(b * factor));
      } else {
        r = Math.min(255, Math.floor(r * (1 / factor)));
        g = Math.min(255, Math.floor(g * (1 / factor)));
        b = Math.min(255, Math.floor(b * (1 / factor)));
      }

      shades.push([r, g, b]);
    }

    return shades;
  }
}

export function rgbToHsl([r, g, b]: [number, number, number]) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    // @ts-ignore
    h /= 6;
  }

  // @ts-ignore
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function toHex6(hexWithAlpha: string): string {
  return `#${hexWithAlpha.replace(/^#/, "").substring(0, 6)}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace(/^#/, "");

  const fullHex =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((c) => c + c)
          .join("")
      : sanitized;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  return [r, g, b];
}

export function rgbaFloatToRGBA(color: {
  R: number;
  G: number;
  B: number;
  A: number;
}): number[] {
  const r = Math.round(color.R * 255);
  const g = Math.round(color.G * 255);
  const b = Math.round(color.B * 255);
  const a = parseFloat(color.A.toFixed(2));

  return [r, g, b, a];
}
