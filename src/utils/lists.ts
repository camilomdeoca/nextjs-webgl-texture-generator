export function allDefined<T>(arr: (T | undefined)[]): arr is T[] {
  return arr.every(v => v !== undefined);
}

export function assertAllDefined<T>(
  arr: (T | undefined)[],
  msg: string = "Array contains undefined",
): asserts arr is T[] {
  if (arr.some(v => v === undefined)) {
    throw new Error(msg);
  }
}
