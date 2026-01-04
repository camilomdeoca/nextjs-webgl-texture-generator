export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type DistributivePick<T, K extends keyof T> = T extends unknown ? Pick<T, K> : never;

export function distributivePick<
  T,
  K extends readonly (keyof T)[]
>(
  value: T,
  keys: K
): DistributivePick<T, K[number]> {
  const result = {} as Pick<T, K[number]>;
  
  for (const key of keys) {
    result[key] = value[key];
  }
  return result as DistributivePick<T, K[number]>;
}
