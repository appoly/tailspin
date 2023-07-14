export function selectRandomFromArray(array: string[]): string {
  return array[Math.floor(Math.random() * array.length)];
}

export function unproxify(val: any) {
  return JSON.parse(JSON.stringify(val));
}

export function kilobytesToHumanReadableFileSize(kilobytes: number): string {
  if (kilobytes < 1024) {
    return `${kilobytes} KB`;
  } else if (kilobytes < 1024 * 1024) {
    return `${(kilobytes / 1024).toFixed(2)} MB`;
  } else {
    return `${(kilobytes / (1024 * 1024)).toFixed(2)} GB`;
  }
}
