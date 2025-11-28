/**
 * Utility functions for Desktop file operations
 * Note: Actual Excel generation is handled by excelGenerator.ts
 * This file provides helper functions for file naming and future Desktop folder management
 */

/**
 * Generates a sanitized filename with timestamp for project downloads
 * @param projectName - The user-provided project name
 * @returns Sanitized filename with timestamp
 */
export const generateProjectFileName = (projectName: string): string => {
  const timestamp = new Date().getTime();
  const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${sanitizedName}_${timestamp}.xlsx`;
};

/**
 * Placeholder for future Desktop/Teklif360 folder management
 * Currently, files are downloaded using standard browser download mechanism
 * 
 * Future enhancement: Use File System Access API to directly save to Desktop/Teklif360
 * This would require user permission and is only supported in Chromium browsers
 */
export const getDesktopSavePath = (projectName: string): string => {
  const fileName = generateProjectFileName(projectName);
  return `Desktop/Teklif360/${fileName}`;
};
