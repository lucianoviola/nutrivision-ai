/**
 * Compress an image to reduce size before AI analysis
 * @param base64Image - The base64 encoded image (with or without data URL prefix)
 * @param maxWidth - Maximum width (default 1024px)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Compressed base64 image
 */
export async function compressImage(
  base64Image: string,
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG for better compression
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Return just the base64 part (without data URL prefix)
      const base64 = compressedDataUrl.split(',')[1];
      
      console.log('📦 Image compressed:', {
        originalSize: `${(base64Image.length * 0.75 / 1024).toFixed(1)} KB`,
        compressedSize: `${(base64.length * 0.75 / 1024).toFixed(1)} KB`,
        reduction: `${(100 - (base64.length / base64Image.length) * 100).toFixed(1)}%`,
        dimensions: `${width}x${height}`,
      });
      
      resolve(base64);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };
    
    // Handle both formats: with and without data URL prefix
    if (base64Image.startsWith('data:')) {
      img.src = base64Image;
    } else {
      img.src = `data:image/jpeg;base64,${base64Image}`;
    }
  });
}

/**
 * Get estimated file size in KB from base64 string
 */
export function getBase64SizeKB(base64: string): number {
  // Remove data URL prefix if present
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  // Base64 encodes 3 bytes as 4 characters
  return (cleanBase64.length * 0.75) / 1024;
}

/**
 * Check if image needs compression
 */
export function needsCompression(base64: string, maxSizeKB: number = 500): boolean {
  return getBase64SizeKB(base64) > maxSizeKB;
}

