// === IMAGE COMPRESSION UTILITY ===
// src/utils/imageCompression.js

/**
 * Compresses an image file to reduce storage size
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width (default 800px)
 * @param {number} maxHeight - Maximum height (default 800px) 
 * @param {number} quality - JPEG quality 0-1 (default 0.7)
 * @returns {Promise<string>} Base64 compressed image
 */
export const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (maintain aspect ratio)
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG (much smaller than PNG)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Log compression ratio
        const originalSize = e.target.result.length;
        const compressedSize = compressedDataUrl.length;
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        console.log(`🗜️ Compressed image: ${(originalSize / 1024).toFixed(0)}KB → ${(compressedSize / 1024).toFixed(0)}KB (${ratio}% reduction)`);
        
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Get current localStorage usage
 * @returns {Object} { used: number, total: number, percentage: number }
 */
export const getStorageInfo = () => {
  let total = 0;
  let used = 0;
  
  try {
    // Most browsers have 5-10MB limit
    const estimate = 5 * 1024 * 1024; // 5MB estimate
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    total = estimate;
    const percentage = (used / total) * 100;
    
    return {
      used: (used / 1024).toFixed(0) + 'KB',
      total: (total / 1024).toFixed(0) + 'KB',
      percentage: percentage.toFixed(1) + '%',
      bytesUsed: used,
      bytesTotal: total
    };
  } catch (err) {
    return null;
  }
};

/**
 * Check if there's enough space for new data
 * @param {number} requiredBytes - Bytes needed
 * @returns {boolean} Whether there's enough space
 */
export const hasStorageSpace = (requiredBytes) => {
  const info = getStorageInfo();
  if (!info) return true; // Can't check, assume ok
  
  const available = info.bytesTotal - info.bytesUsed;
  return available > requiredBytes;
};

/**
 * Find all images referenced in project
 * @param {Object} projectData - The project data
 * @returns {Set<string>} Set of image data URLs in use
 */
export const findReferencedImages = (projectData) => {
  const images = new Set();
  
  // 1. Lore character images
  if (projectData.lore?.characters) {
    projectData.lore.characters.forEach(char => {
      if (char.imageSrc) images.add(char.imageSrc);
    });
  }
  
  // 2. Map images
  if (Array.isArray(projectData.worldMap)) {
    projectData.worldMap.forEach(map => {
      if (map.imageSrc) images.add(map.imageSrc);
    });
  } else if (projectData.worldMap?.imageSrc) {
    images.add(projectData.worldMap.imageSrc);
  }
  
  // 3. Images in editor content (embedded in HTML)
  if (projectData.manuscript?.chapters) {
    projectData.manuscript.chapters.forEach(chapter => {
      const imgRegex = /<img[^>]+src="([^">]+)"/g;
      let match;
      while ((match = imgRegex.exec(chapter.content)) !== null) {
        images.add(match[1]);
      }
    });
  }
  
  return images;
};

/**
 * Calculate total size of images in project
 * @param {Object} projectData - The project data
 * @returns {Object} Size information
 */
export const calculateImageSize = (projectData) => {
  const images = findReferencedImages(projectData);
  let totalBytes = 0;
  
  images.forEach(img => {
    totalBytes += img.length;
  });
  
  return {
    count: images.size,
    bytes: totalBytes,
    kb: (totalBytes / 1024).toFixed(0),
    mb: (totalBytes / 1024 / 1024).toFixed(2),
    percentage: ((totalBytes / (5 * 1024 * 1024)) * 100).toFixed(1) // % of 5MB
  };
};

/**
 * Recommend compression for oversized images
 * @param {Object} projectData - The project data
 * @returns {Array} List of recommendations
 */
export const analyzeImageUsage = (projectData) => {
  const recommendations = [];
  const imageSize = calculateImageSize(projectData);
  
  if (imageSize.count === 0) {
    return [{ type: 'info', message: 'No images in project' }];
  }
  
  // Check total size
  if (imageSize.bytes > 3 * 1024 * 1024) { // Over 3MB
    recommendations.push({
      type: 'warning',
      message: `Images using ${imageSize.mb}MB (${imageSize.percentage}% of storage). Consider removing unused images.`
    });
  }
  
  // Check individual images
  if (projectData.lore?.characters) {
    projectData.lore.characters.forEach(char => {
      if (char.imageSrc && char.imageSrc.length > 500000) { // 500KB
        const sizeMB = (char.imageSrc.length / 1024 / 1024).toFixed(2);
        recommendations.push({
          type: 'tip',
          message: `"${char.name}" has large image (${sizeMB}MB). Re-upload with lower quality.`,
          entityId: char.id
        });
      }
    });
  }
  
  return recommendations;
};