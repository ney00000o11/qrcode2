/**
 * Utility functions for QR code generation and download
 */

export interface QRDownloadOptions {
  format: 'png' | 'jpeg' | 'svg';
  size: number;
  quality?: number;
  scaleFactor?: number;
}

/**
 * Downloads a QR code from an SVG element
 */
export const downloadQRCodeFromSVG = async (
  svgElement: SVGElement,
  url: string,
  bgColor: string,
  options: QRDownloadOptions
): Promise<void> => {
  const { format, size, quality = 0.95, scaleFactor = 3 } = options;

  if (format === 'svg') {
    // Download as SVG
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.download = `qr-code-${Date.now()}.svg`;
    downloadLink.href = downloadUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);
    return;
  }

  // For PNG and JPEG formats
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported in your browser');
  }

  canvas.width = size * scaleFactor;
  canvas.height = size * scaleFactor;

  // Set background color
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Convert SVG to image
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Draw the image on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Create download link
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const downloadQuality = format === 'jpeg' ? quality : 1.0;
        
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.download = `qr-code-${Date.now()}.${format}`;
            downloadLink.href = downloadUrl;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Cleanup
            URL.revokeObjectURL(downloadUrl);
            resolve();
          } else {
            reject(new Error('Could not create image file'));
          }
        }, mimeType, downloadQuality);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Could not process QR code image'));
    };

    img.src = svgUrl;
  });
};

/**
 * Validates if a URL is valid for QR code generation
 */
export const validateQRUrl = (url: string): { isValid: boolean; message: string } => {
  if (!url || url.trim().length === 0) {
    return { isValid: false, message: 'URL is required' };
  }

  if (url.length > 2000) {
    return { isValid: false, message: 'URL is too long for QR code (max 2000 characters)' };
  }

  try {
    new URL(url);
    return { isValid: true, message: 'Valid URL' };
  } catch {
    // Check if it's a relative URL or missing protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { isValid: false, message: 'URL must include http:// or https://' };
    }
    return { isValid: false, message: 'Invalid URL format' };
  }
};

/**
 * Truncates URL if it's too long for QR code
 */
export const truncateUrl = (url: string, maxLength: number = 2000): string => {
  if (url.length <= maxLength) {
    return url;
  }
  return url.substring(0, maxLength) + '...';
};

/**
 * Generates a QR code data URL for preview purposes
 */
export const generateQRDataUrl = async (
  url: string,
  size: number,
  fgColor: string,
  bgColor: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // This would typically use a QR code library to generate the data URL
      // For now, we'll return a placeholder
      resolve(`data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" fill="${bgColor}"/><text x="50%" y="50%" text-anchor="middle" fill="${fgColor}">QR</text></svg>`)}`);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Extracts URL from various sources (query params, clipboard, etc.)
 */
export const extractUrlFromSources = (): Promise<string | null> => {
  return new Promise((resolve) => {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlParam = urlParams.get('url');
    if (urlParam) {
      resolve(decodeURIComponent(urlParam));
      return;
    }

    // Check if clipboard API is available and try to read from clipboard
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText()
        .then((clipboardText) => {
          if (clipboardText && validateQRUrl(clipboardText).isValid) {
            resolve(clipboardText);
          } else {
            resolve(null);
          }
        })
        .catch(() => {
          resolve(null);
        });
    } else {
      resolve(null);
    }
  });
};