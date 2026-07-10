export const templateLimits = {
  maxJsonBytes: 5 * 1024 * 1024,
  maxFields: 5000,
  maxFieldBytes: 16 * 1024 * 1024,
  maxTotalBytes: 64 * 1024 * 1024,
  maxPreviewBytes: 8 * 1024,
  maxCopyBytes: 64 * 1024
} as const;
