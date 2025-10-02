import fs from 'fs/promises';
import path from 'path';
import { Project } from '../types/project';
import { 
  saveProjectToDrive, 
  getProjectFromDrive, 
  listProjectsFromDrive,
  syncProjectsWithDrive,
  archiveProject as archiveProjectToDrive
} from './googleDriveStorage';

const DATA_DIR = path.join(process.cwd(), 'data', 'projects');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// Local file operations (for backup/cache)
async function saveProjectLocal(project: Project) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${project.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8');
  return project;
}

async function getProjectLocal(id: string): Promise<Project | null> {
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Project;
  } catch (err: any) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function listProjectsLocal(): Promise<Project[]> {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  const projects: Project[] = [];
  for (const f of files) {
    if (f.endsWith('.json')) {
      const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf-8');
      projects.push(JSON.parse(raw));
    }
  }
  return projects;
}

// Primary storage operations (Google Drive with local backup)
export async function saveProject(project: Project) {
  try {
    // Save to Google Drive (primary)
    await saveProjectToDrive(project);
    
    // Also save locally (backup/cache)
    await saveProjectLocal(project);
    
    return project;
  } catch (error) {
    console.error('Error saving project to Drive, falling back to local:', error);
    // Fallback to local storage
    return await saveProjectLocal(project);
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    // Try Google Drive first
    const project = await getProjectFromDrive(id);
    if (project) {
      // Update local cache
      await saveProjectLocal(project);
      return project;
    }
    
    // Fallback to local
    return await getProjectLocal(id);
  } catch (error) {
    console.error('Error getting project from Drive, falling back to local:', error);
    return await getProjectLocal(id);
  }
}

export async function listProjects(): Promise<Project[]> {
  try {
    // Try Google Drive first
    const projects = await listProjectsFromDrive();
    
    // Update local cache
    for (const project of projects) {
      await saveProjectLocal(project);
    }
    
    return projects;
  } catch (error) {
    console.error('Error listing projects from Drive:', error);
    // Don't fall back to local - return empty array if Drive fails
    return [];
  }
}

// New function for initial sync
export async function initializeProjects(): Promise<Project[]> {
  console.log('Initializing projects with Google Drive sync...');
  
  try {
    // First, clean up any orphaned project files
    const { cleanupOrphanedProjects } = await import('./googleDriveStorage');
    await cleanupOrphanedProjects();
    
    // Then sync with Drive
    const { syncedProjects } = await syncProjectsWithDrive();
    return syncedProjects;
  } catch (error) {
    console.error('Error during initial sync:', error);
    // Don't fall back to local - return empty array if Drive fails
    return [];
  }
}

// Archive a project - removes from local and moves to archive in Drive
export async function archiveProject(projectId: string): Promise<void> {
  try {
    // Get the project first
    const project = await getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Archive to Google Drive (moves files to archive folder)
    await archiveProjectToDrive(project);

    // Delete local file
    const filePath = path.join(DATA_DIR, `${projectId}.json`);
    try {
      await fs.unlink(filePath);
      console.log(`Deleted local project file ${projectId}.json`);
    } catch (error) {
      console.warn(`Could not delete local file ${projectId}.json:`, error);
      // Don't fail the entire operation if local deletion fails
    }

    console.log(`Successfully archived project ${projectId}`);
  } catch (error) {
    console.error(`Error archiving project ${projectId}:`, error);
    throw error;
  }
}
