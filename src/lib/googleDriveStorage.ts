import { google } from 'googleapis';
import { Project } from '../types/project';
import { FOLDER_IDS } from '../config/folders';

type DriveFile = {
  id: string;
  name: string;
  webViewLink: string;
  createdTime: string;
  modifiedTime: string;
};

type DriveFolder = {
  id: string;
  name: string;
  webViewLink: string;
};

export async function getAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Missing Google OAuth2 credentials');
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'http://localhost:3000'
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN
  });

  return oauth2Client;
}

/**
 * Get the Projects folder ID (for Google Sheets)
 */
export async function ensureProjectsFolder(): Promise<string> {
  console.log(`Using Projects folder ID: ${FOLDER_IDS.PROJECTS}`);
  return FOLDER_IDS.PROJECTS;
}

/**
 * Get the Project Data folder ID (for JSON files)
 */
export async function ensureProjectDataFolder(): Promise<string> {
  console.log(`Using Project Data folder ID: ${FOLDER_IDS.PROJECT_DATA}`);
  return FOLDER_IDS.PROJECT_DATA;
}

/**
 * Get the Archive Projects folder ID (for archived Google Sheets)
 */
export async function ensureArchiveProjectsFolder(): Promise<string> {
  console.log(`Using Archive Projects folder ID: ${FOLDER_IDS.ARCHIVE_PROJECTS}`);
  return FOLDER_IDS.ARCHIVE_PROJECTS;
}

/**
 * Get the Archive Data folder ID (for archived JSON files)
 */
export async function ensureArchiveDataFolder(): Promise<string> {
  console.log(`Using Archive Data folder ID: ${FOLDER_IDS.ARCHIVE_DATA}`);
  return FOLDER_IDS.ARCHIVE_DATA;
}

/**
 * List all project files from Google Drive
 */
export async function listProjectsFromDrive(): Promise<Project[]> {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  try {
    const projectDataFolderId = await ensureProjectDataFolder();
    const projectsFolderId = await ensureProjectsFolder();
    
    // List all JSON files in the Project Data folder
    const response = await drive.files.list({
      q: `parents in '${projectDataFolderId}' and name contains '.json' and trashed=false`,
      fields: 'files(id, name, webViewLink, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
    });

    const files = response.data.files || [];
    const projects: Project[] = [];

    for (const file of files) {
      try {
        // Download and parse each project file
        const fileContent = await drive.files.get({
          fileId: file.id!,
          alt: 'media',
        }, { responseType: 'text' });

        const project = JSON.parse(fileContent.data as string) as Project;
        
        // Verify the project sheet still exists in the Projects folder
        if (project.sheetId) {
          try {
            // Check if the sheet exists and is in the Projects folder
            const sheetResponse = await drive.files.get({
              fileId: project.sheetId,
              fields: 'id, parents, trashed',
            });
            
            // Check if the sheet is in the Projects folder
            const isInProjectsFolder = sheetResponse.data.parents?.includes(projectsFolderId);
            const isTrashed = sheetResponse.data.trashed;
            
            if (!isInProjectsFolder || isTrashed) {
              console.log(`Project ${project.id} sheet not found in Projects folder - likely archived, skipping`);
              continue;
            }
          } catch (error) {
            // If we can't get the sheet info, it might be deleted or moved
            console.log(`Project ${project.id} sheet not accessible - likely archived, skipping`);
            continue;
          }
        }
        
        projects.push(project);
      } catch (error) {
        console.warn(`Failed to parse project file ${file.name}:`, error);
      }
    }

    console.log(`Loaded ${projects.length} active projects from Google Drive`);
    return projects;
  } catch (error) {
    console.error('Error listing projects from Drive:', error);
    return [];
  }
}

/**
 * Save a project to Google Drive
 */
export async function saveProjectToDrive(project: Project): Promise<void> {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  try {
    const projectDataFolderId = await ensureProjectDataFolder();
    const fileName = `${project.id}.json`;
    const fileContent = JSON.stringify(project, null, 2);

    // Check if file already exists
    const existingFileQuery = `name='${fileName}' and parents in '${projectDataFolderId}' and trashed=false`;
    const existingFileResponse = await drive.files.list({
      q: existingFileQuery,
      fields: 'files(id)',
    });

    if (existingFileResponse.data.files && existingFileResponse.data.files.length > 0) {
      // Update existing file
      const fileId = existingFileResponse.data.files[0].id!;
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/json',
          body: fileContent,
        },
      });
      console.log(`Updated project ${project.id} in Google Drive`);
    } else {
      // Create new file
      await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [projectDataFolderId],
        },
        media: {
          mimeType: 'application/json',
          body: fileContent,
        },
        fields: 'id, name',
      });
      console.log(`Created project ${project.id} in Google Drive`);
    }
  } catch (error) {
    console.error('Error saving project to Drive:', error);
    throw error;
  }
}

/**
 * Get a specific project from Google Drive
 */
export async function getProjectFromDrive(projectId: string): Promise<Project | null> {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  try {
    const projectDataFolderId = await ensureProjectDataFolder();
    const fileName = `${projectId}.json`;

    // Find the project file
    const fileQuery = `name='${fileName}' and parents in '${projectDataFolderId}' and trashed=false`;
    const fileResponse = await drive.files.list({
      q: fileQuery,
      fields: 'files(id)',
    });

    if (!fileResponse.data.files || fileResponse.data.files.length === 0) {
      return null;
    }

    const fileId = fileResponse.data.files[0].id!;
    const fileContent = await drive.files.get({
      fileId,
      alt: 'media',
    }, { responseType: 'text' });

    return JSON.parse(fileContent.data as string) as Project;
  } catch (error) {
    console.error(`Error getting project ${projectId} from Drive:`, error);
    return null;
  }
}

/**
 * Delete a project from Google Drive
 */
export async function deleteProjectFromDrive(projectId: string): Promise<void> {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  try {
    const projectDataFolderId = await ensureProjectDataFolder();
    const fileName = `${projectId}.json`;

    // Find the project file
    const fileQuery = `name='${fileName}' and parents in '${projectDataFolderId}' and trashed=false`;
    const fileResponse = await drive.files.list({
      q: fileQuery,
      fields: 'files(id)',
    });

    if (fileResponse.data.files && fileResponse.data.files.length > 0) {
      const fileId = fileResponse.data.files[0].id!;
      await drive.files.delete({ fileId });
      console.log(`Deleted project ${projectId} from Google Drive`);
    }
  } catch (error) {
    console.error(`Error deleting project ${projectId} from Drive:`, error);
    throw error;
  }
}

/**
 * Archive a project - copies project file and sheet to archive folder, then deletes from main
 */
export async function archiveProject(project: Project): Promise<void> {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  try {
    console.log(`Archiving project ${project.id}...`);

    // Get folder IDs
    const projectDataFolderId = await ensureProjectDataFolder();
    const projectsFolderId = await ensureProjectsFolder();
    const archiveProjectsFolderId = await ensureArchiveProjectsFolder();
    const archiveDataFolderId = await ensureArchiveDataFolder();

    console.log(`Project Data folder ID: ${projectDataFolderId}`);
    console.log(`Projects folder ID: ${projectsFolderId}`);
    console.log(`Archive Projects folder ID: ${archiveProjectsFolderId}`);
    console.log(`Archive Data folder ID: ${archiveDataFolderId}`);

    // 1. Copy project JSON file to archive folder
    const fileName = `${project.id}.json`;
    const fileQuery = `name='${fileName}' and parents in '${projectDataFolderId}' and trashed=false`;
    const fileResponse = await drive.files.list({
      q: fileQuery,
      fields: 'files(id, name, parents)',
    });

    console.log(`Found ${fileResponse.data.files?.length || 0} project files to archive`);

    if (fileResponse.data.files && fileResponse.data.files.length > 0) {
      const fileId = fileResponse.data.files[0].id!;
      console.log(`Archiving file: ${fileId}`);
      
      // Copy file to Archive Data folder
      const copyResponse = await drive.files.copy({
        fileId,
        requestBody: {
          name: fileName,
          parents: [archiveDataFolderId],
        },
        fields: 'id, name, parents',
      });
      
      const copiedFileId = copyResponse.data.id!;
      console.log(`Copied project file ${fileName} to archive with ID: ${copiedFileId}`);
      
      // Verify the copy was successful by checking if file exists in Archive Data folder
      const verifyQuery = `name='${fileName}' and parents in '${archiveDataFolderId}' and trashed=false`;
      const verifyResponse = await drive.files.list({
        q: verifyQuery,
        fields: 'files(id, name)',
      });
      
      if (verifyResponse.data.files && verifyResponse.data.files.length > 0) {
        console.log(`✅ Verified: Project file ${fileName} successfully copied to archive`);
        
        // Now delete the original file from main folder
        await drive.files.delete({ fileId });
        console.log(`✅ Deleted original project file ${fileName} from main folder`);
      } else {
        throw new Error(`Failed to verify copy of ${fileName} to archive folder`);
      }
    } else {
      console.warn(`No project file found for ${project.id}`);
    }

    // 2. Copy project sheet to archive (if it exists)
    if (project.sheetId) {
      try {
        console.log(`Archiving sheet: ${project.sheetId}`);
        
        // First copy the sheet to archive
        const sheetCopyResponse = await drive.files.copy({
          fileId: project.sheetId,
          requestBody: {
            name: `${project.name} — Archived`,
            parents: [archiveProjectsFolderId],
          },
          fields: 'id, name, parents',
        });
        
        const copiedSheetId = sheetCopyResponse.data.id!;
        console.log(`Copied project sheet ${project.sheetId} to archive with ID: ${copiedSheetId}`);
        
        // Verify the copy was successful
        const sheetVerifyQuery = `name='${project.name} — Archived' and parents in '${archiveProjectsFolderId}' and trashed=false`;
        const sheetVerifyResponse = await drive.files.list({
          q: sheetVerifyQuery,
          fields: 'files(id, name)',
        });
        
        if (sheetVerifyResponse.data.files && sheetVerifyResponse.data.files.length > 0) {
          console.log(`✅ Verified: Project sheet successfully copied to archive`);
          
          // Then delete the original sheet
          await drive.files.delete({ fileId: project.sheetId });
          console.log(`✅ Deleted original project sheet ${project.sheetId} from main folder`);
        } else {
          throw new Error(`Failed to verify copy of sheet to archive folder`);
        }
      } catch (error) {
        console.error(`Error archiving sheet ${project.sheetId}:`, error);
        throw error; // Re-throw to fail the entire operation
      }
    }

    // List archive files to verify they're actually there
    await listArchiveFiles();
    
    console.log(`✅ Successfully archived project ${project.id}`);
  } catch (error) {
    console.error(`❌ Error archiving project ${project.id}:`, error);
    throw error;
  }
}


/**
 * List files in the Archive folder for debugging
 */
export async function listArchiveFiles(): Promise<any[]> {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  try {
    const archiveDataFolderId = await ensureArchiveDataFolder();
    console.log(`Listing files in Archive Data folder: ${archiveDataFolderId}`);
    
    const response = await drive.files.list({
      q: `parents in '${archiveDataFolderId}' and trashed=false`,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
    });

    const files = response.data.files || [];
    console.log(`Found ${files.length} files in archive folder:`, files.map(f => ({ name: f.name, id: f.id })));
    
    return files;
  } catch (error) {
    console.error('Error listing archive files:', error);
    return [];
  }
}

/**
 * List all archived projects from Google Drive
 */
export async function listArchivedProjects(): Promise<Project[]> {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  try {
    const archiveDataFolderId = await ensureArchiveDataFolder();
    console.log(`Loading archived projects from Archive Data folder: ${archiveDataFolderId}`);
    
    // List all JSON files in the Archive Data folder
    const response = await drive.files.list({
      q: `parents in '${archiveDataFolderId}' and name contains '.json' and trashed=false`,
      fields: 'files(id, name, webViewLink, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
    });

    const files = response.data.files || [];
    const archivedProjects: Project[] = [];

    for (const file of files) {
      try {
        // Download and parse each archived project file
        const fileContent = await drive.files.get({
          fileId: file.id!,
          alt: 'media',
        }, { responseType: 'text' });

        const project = JSON.parse(fileContent.data as string) as Project;
        
        // Add archive metadata
        (project as any).archivedAt = file.modifiedTime || file.createdTime || new Date().toISOString();
        
        archivedProjects.push(project);
      } catch (error) {
        console.warn(`Failed to parse archived project file ${file.name}:`, error);
      }
    }

    console.log(`Loaded ${archivedProjects.length} archived projects from Google Drive`);
    return archivedProjects;
  } catch (error) {
    console.error('Error listing archived projects from Drive:', error);
    return [];
  }
}

/**
 * Restore a project from archive back to main folders
 */
export async function restoreProjectFromArchive(projectId: string): Promise<void> {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  try {
    console.log(`Restoring project ${projectId} from archive...`);

    // Get folder IDs
    const projectDataFolderId = await ensureProjectDataFolder();
    const projectsFolderId = await ensureProjectsFolder();
    const archiveProjectsFolderId = await ensureArchiveProjectsFolder();
    const archiveDataFolderId = await ensureArchiveDataFolder();

    console.log(`Project Data folder ID: ${projectDataFolderId}`);
    console.log(`Projects folder ID: ${projectsFolderId}`);
    console.log(`Archive Projects folder ID: ${archiveProjectsFolderId}`);
    console.log(`Archive Data folder ID: ${archiveDataFolderId}`);

    // 1. Find and restore the JSON file
    const fileName = `${projectId}.json`;
    const jsonFileQuery = `name='${fileName}' and parents in '${archiveDataFolderId}' and trashed=false`;
    const jsonFileResponse = await drive.files.list({
      q: jsonFileQuery,
      fields: 'files(id, name)',
    });

    if (jsonFileResponse.data.files && jsonFileResponse.data.files.length > 0) {
      const jsonFileId = jsonFileResponse.data.files[0].id!;
      console.log(`Found archived JSON file: ${jsonFileId}`);

      // Get the project data to find the sheet ID
      const jsonFileContent = await drive.files.get({
        fileId: jsonFileId,
        alt: 'media',
      }, { responseType: 'text' });

      const project = JSON.parse(jsonFileContent.data as string) as Project;
      console.log(`Project sheet ID: ${project.sheetId}`);

      // Copy JSON file back to Project Data folder
      const jsonCopyResponse = await drive.files.copy({
        fileId: jsonFileId,
        requestBody: {
          name: fileName,
          parents: [projectDataFolderId],
        },
        fields: 'id, name, parents',
      });

      console.log(`✅ Copied JSON file back to Project Data folder: ${jsonCopyResponse.data.id}`);

      // 2. Restore the Google Sheet if it exists
      if (project.sheetId) {
        const sheetQuery = `name='${project.name} — Archived' and parents in '${archiveProjectsFolderId}' and trashed=false`;
        const sheetResponse = await drive.files.list({
          q: sheetQuery,
          fields: 'files(id, name)',
        });

        if (sheetResponse.data.files && sheetResponse.data.files.length > 0) {
          const archivedSheetId = sheetResponse.data.files[0].id!;
          console.log(`Found archived sheet: ${archivedSheetId}`);

          // Copy sheet back to Projects folder
          const sheetCopyResponse = await drive.files.copy({
            fileId: archivedSheetId,
            requestBody: {
              name: project.name, // Remove "— Archived" suffix
              parents: [projectsFolderId],
            },
            fields: 'id, name, parents',
          });

          console.log(`✅ Copied sheet back to Projects folder: ${sheetCopyResponse.data.id}`);

          // Update the project with the new sheet ID
          project.sheetId = sheetCopyResponse.data.id!;
        }
      }

      // 3. Update the project file with the new sheet ID
      await drive.files.update({
        fileId: jsonCopyResponse.data.id!,
        media: {
          mimeType: 'application/json',
          body: JSON.stringify(project, null, 2),
        },
      });

      // 4. Delete the archived files
      await drive.files.delete({ fileId: jsonFileId });
      console.log(`✅ Deleted archived JSON file`);

      if (project.sheetId) {
        const sheetQuery = `name='${project.name} — Archived' and parents in '${archiveProjectsFolderId}' and trashed=false`;
        const sheetResponse = await drive.files.list({
          q: sheetQuery,
          fields: 'files(id)',
        });

        if (sheetResponse.data.files && sheetResponse.data.files.length > 0) {
          const archivedSheetId = sheetResponse.data.files[0].id!;
          await drive.files.delete({ fileId: archivedSheetId });
          console.log(`✅ Deleted archived sheet`);
        }
      }

      console.log(`✅ Successfully restored project ${projectId}`);
    } else {
      throw new Error(`Archived project file not found for project ${projectId}`);
    }
  } catch (error) {
    console.error(`❌ Error restoring project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Clean up orphaned project files (JSON files without corresponding sheets)
 */
export async function cleanupOrphanedProjects(): Promise<void> {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  try {
    console.log('Cleaning up orphaned project files...');
    const projectDataFolderId = await ensureProjectDataFolder();
    const projectsFolderId = await ensureProjectsFolder();
    
    // List all JSON files in the Project Data folder
    const response = await drive.files.list({
      q: `parents in '${projectDataFolderId}' and name contains '.json' and trashed=false`,
      fields: 'files(id, name)',
    });

    const files = response.data.files || [];
    let cleanedCount = 0;

    for (const file of files) {
      try {
        // Download and parse the project file
        const fileContent = await drive.files.get({
          fileId: file.id!,
          alt: 'media',
        }, { responseType: 'text' });

        const project = JSON.parse(fileContent.data as string) as Project;
        
        // Check if the project sheet still exists in the Projects folder
        if (project.sheetId) {
          try {
            // Check if the sheet exists and is in the Projects folder
            const sheetResponse = await drive.files.get({
              fileId: project.sheetId,
              fields: 'id, parents, trashed',
            });
            
            // Check if the sheet is in the Projects folder
            const isInProjectsFolder = sheetResponse.data.parents?.includes(projectsFolderId);
            const isTrashed = sheetResponse.data.trashed;
            
            if (!isInProjectsFolder || isTrashed) {
              console.log(`Removing orphaned project file: ${file.name} (sheet ${project.sheetId} not found in Projects folder)`);
              await drive.files.delete({ fileId: file.id! });
              cleanedCount++;
            }
          } catch (error) {
            // If we can't get the sheet info, it might be deleted or moved
            console.log(`Removing orphaned project file: ${file.name} (sheet ${project.sheetId} not accessible)`);
            await drive.files.delete({ fileId: file.id! });
            cleanedCount++;
          }
        }
      } catch (error) {
        console.warn(`Failed to process project file ${file.name}:`, error);
      }
    }

    console.log(`Cleaned up ${cleanedCount} orphaned project files`);
  } catch (error) {
    console.error('Error cleaning up orphaned projects:', error);
  }
}

/**
 * Sync local projects with Google Drive
 * This is the main function that should be called on app startup
 */
export async function syncProjectsWithDrive(): Promise<{
  localProjects: Project[];
  driveProjects: Project[];
  syncedProjects: Project[];
}> {
  console.log('Starting project sync with Google Drive...');

  // Load local projects (for fallback)
  const { listProjects: listLocalProjects } = await import('./db');
  const localProjects = await listLocalProjects();

  // Load Drive projects
  const driveProjects = await listProjectsFromDrive();

  // Merge strategy: Drive takes precedence, but keep local as backup
  const syncedProjects = [...driveProjects];
  
  // Add any local projects that don't exist in Drive
  for (const localProject of localProjects) {
    const existsInDrive = driveProjects.some(driveProject => driveProject.id === localProject.id);
    if (!existsInDrive) {
      console.log(`Uploading local project ${localProject.id} to Drive`);
      await saveProjectToDrive(localProject);
      syncedProjects.push(localProject);
    }
  }

  console.log(`Sync complete: ${syncedProjects.length} projects available`);
  return {
    localProjects,
    driveProjects,
    syncedProjects,
  };
}
