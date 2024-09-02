function sfc32(a: number, b: number, c: number, d: number): () => number {
  return function (): number {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    let t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

const seedgen = (seed: number = 0.5): number => (seed * 2 ** 32) >>> 0;
export const getRand = (seed: number = Math.random()): (() => number) =>
  sfc32(seedgen(seed), seedgen(seed), seedgen(seed), seedgen(seed));
