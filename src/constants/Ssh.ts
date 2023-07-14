export const FileSizesInKb = [10, 500, 1024, 1024 * 10, 1024 * 100, 1024 * 200] as const;

export const MaxFileSizeToLoadKb = 1024 * 1024 * 250; // Bit arbitrary, but let's use 250 Mb to stop memory limits etc.
