/**
 * Centralized Google Drive folder configuration
 * All folder IDs are stored here for easy management
 */

export const FOLDER_IDS = {
  // Main project folders
  PROJECTS: '1PsKylJwWjzjYYlj7rqb4hN9U-_H2YDlF',           // Google Sheets go here
  PROJECT_DATA: '16OXaQdOZeuc1gTqi4894bYFrDGojZGut',        // JSON files go here
  
  // Archive folders
  ARCHIVE_PROJECTS: '150if9iiRVa-itz4vSg9iVdwnwyUSDhMA',     // Archived Google Sheets
  ARCHIVE_DATA: '1_I2yM1PrY1kV751BrN7cY8XUioN7S_6k',         // Archived JSON files
} as const;

export type FolderType = keyof typeof FOLDER_IDS;
