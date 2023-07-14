export function selectRandomFromArray(array: string[]): string {
  return array[Math.floor(Math.random() * array.length)];
}

export function unproxify(val: any) {
  return JSON.parse(JSON.stringify(val));
}

export function kilobytesToHumanReadableFileSize(kilobytes: number): string {
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(2)} Kb`;
  } else if (kilobytes < 1024 * 1024) {
    return `${(kilobytes / 1024).toFixed(2)} Mb`;
  } else {
    return `${(kilobytes / (1024 * 1024)).toFixed(2)} Gb`;
  }
}

export function bytesToHumanReadableFileSize(bytes: number): string {
  return kilobytesToHumanReadableFileSize(bytes / 1024);
}

export function debounce(fn: (...args: any[]) => void, time: number): (...args: any[]) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null;
  return function wrapper(...args: any[]) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, time);
  };
}