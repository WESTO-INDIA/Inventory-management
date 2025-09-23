/**
 * Compress image file before converting to base64
 * This reduces the stored string size significantly
 */
export const compressImage = (file: File, maxWidth: number = 300, maxHeight: number = 300, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw and compress the image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};

/**
 * Compress base64 image URL
 */
export const compressBase64Image = async (base64Url: string, maxWidth: number = 300, maxHeight: number = 300, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = height * (maxWidth / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = width * (maxHeight / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw and compress the image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64 with compression
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
  });
};

/**
 * Check if a string is a base64 image
 */
export const isBase64Image = (str: string): boolean => {
  return str.startsWith('data:image/');
};

/**
 * Get approximate size of base64 string in KB
 */
export const getBase64SizeInKB = (base64String: string): number => {
  const stringLength = base64String.length;
  const sizeInBytes = (stringLength * 3) / 4;
  return Math.round(sizeInBytes / 1024);
};