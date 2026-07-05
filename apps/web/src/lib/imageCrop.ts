'use client';

import { AVATAR_UPLOAD_SIZE } from '@paperpiece/shared';

/**
 * Read an uploaded image file, centre-crop it to a square, scale to a small
 * fixed size, and return a compressed JPEG data-URL suitable for use as an
 * avatar (a few KB — fits within the avatar length cap).
 */
export function cropImageToDataUrl(file: File, size = AVATAR_UPLOAD_SIZE): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unsupported');
        // Cover-crop: draw the largest centred square of the source.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch (err) {
        reject(err as Error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}
