import { Project, SheetArticle } from '../types/project';
import { getAuthClient } from './googleDriveStorage';
import { google } from 'googleapis';

/**
 * Sync articles from Google Sheet to project data
 */
export async function syncArticlesFromSheet(project: Project): Promise<SheetArticle[]> {
  if (!project.sheetId) {
    console.warn(`Project ${project.id} has no sheetId, skipping sync`);
    return [];
  }

  try {
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Read data from the Articles tab
    const range = 'Articles!A:H'; // Read all columns from Articles tab
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: project.sheetId,
      range,
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      // Only header row or no data
      return [];
    }

    const sheetArticles: SheetArticle[] = [];
    
    // Process each row (skip header row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length > 0 && row[0]) { // Check if row has content
        const id = i; // Row number (1-based, but we'll use as-is for now)
        const title = row[2] || 'Untitled'; // Column C (Article Title)
        
        // Determine status based on whether analysis has been run
        // Check if the article has been analyzed by looking at analysisRuns
        let status: 'Retrieved' | 'Analysed' = 'Retrieved';
        
        // Check if this article has been analyzed
        if (project.analysisRuns && project.analysisRuns.length > 0) {
          for (const run of project.analysisRuns) {
            if (run.articleIds && run.articleIds.includes(`article-${id}`)) {
              status = 'Analysed';
              break;
            }
          }
        }
        
        sheetArticles.push({
          id,
          title,
          status
        });
      }
    }

    return sheetArticles;
  } catch (error) {
    console.error(`Error syncing articles for project ${project.id}:`, error);
    return [];
  }
}

/**
 * Update project with synced articles
 */
export async function updateProjectWithSheetArticles(project: Project): Promise<Project> {
  const sheetArticles = await syncArticlesFromSheet(project);
  
  return {
    ...project,
    sheetArticles
  };
}

/**
 * Sync all projects with their sheet data
 */
export async function syncAllProjectsWithSheets(projects: Project[]): Promise<Project[]> {
  const updatedProjects: Project[] = [];
  
  for (const project of projects) {
    try {
      const updatedProject = await updateProjectWithSheetArticles(project);
      updatedProjects.push(updatedProject);
    } catch (error) {
      console.error(`Failed to sync project ${project.id}:`, error);
      // Keep original project if sync fails
      updatedProjects.push(project);
    }
  }
  
  return updatedProjects;
}
