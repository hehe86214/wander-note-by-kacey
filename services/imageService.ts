
/**
 * Compresses a base64 image string to WebP or JPEG with reduced dimensions and quality.
 * Essential for maintaining performance in a LocalStorage-based app.
 */
export const compressImage = (base64: string, quality = 0.7, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale down if width exceeds maxWidth
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          // Attempt WebP conversion for better compression
          const webp = canvas.toDataURL('image/webp', quality);
          
          // Check if browser supports WebP (returns correct data URI scheme)
          if (webp.indexOf('data:image/webp') === 0) {
              resolve(webp);
          } else {
              // Fallback to JPEG
              resolve(canvas.toDataURL('image/jpeg', quality));
          }
      } else {
          resolve(base64); // Context fail fallback
      }
    };

    img.onerror = () => {
        console.warn("Image compression failed, using original.");
        resolve(base64);
    };
  });
};
