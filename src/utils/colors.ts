export function hexToRgba(hex: string): [number, number, number, number] {
  const clean = hex.replace(/^#/, '');

  if (![3, 4, 6, 8].includes(clean.length)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const expand = (s: string) =>
    s.length === 1 ? s + s : s;

  let r: string, g: string, b: string, a: string = 'ff';

  if (clean.length <= 4) {
    r = expand(clean[0]);
    g = expand(clean[1]);
    b = expand(clean[2]);
    if (clean.length === 4) a = expand(clean[3]);
  } else {
    r = clean.slice(0, 2);
    g = clean.slice(2, 4);
    b = clean.slice(4, 6);
    if (clean.length === 8) a = clean.slice(6, 8);
  }

  return [
    parseInt(r, 16) / 255,
    parseInt(g, 16) / 255,
    parseInt(b, 16) / 255,
    parseInt(a, 16) / 255,
  ];
}

export function rgbaToHex(rgba: [number, number, number, number]): string {
  if (rgba.some(component => isNaN(component) || !isFinite(component))) {
    console.log(rgba);
    throw new Error(`Invalid components.`);
  }
  return rgba.reduce((acc, value) => {
    return `${acc}${Math.round(value*255).toString(16).padStart(2, "0")}`;
  }, "#");
}
