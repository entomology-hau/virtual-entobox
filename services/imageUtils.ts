export interface ResizeOptions {
  maxDimension?: number;
  quality?: number;
  preservePng?: boolean;
}

const DEFAULT_MAX_DIMENSION = 1400;
const DEFAULT_QUALITY = 0.88;

export const resizeImageFile = (
  file: File,
  options: ResizeOptions = {}
): Promise<string> => {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const preservePng = options.preservePng ?? true;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode the selected image.'));
      img.onload = () => {
        const largestSide = Math.max(img.naturalWidth, img.naturalHeight);
        const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas is unavailable in this browser.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const outputType = preservePng && file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outputType, quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
};
