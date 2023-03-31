export function selectRandomFromArray(array: string[]): string {
  return array[Math.floor(Math.random() * array.length)];
}

export function unproxify(val: any) {
  return JSON.parse(JSON.stringify(val));
}