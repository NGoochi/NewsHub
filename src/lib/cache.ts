import { Project } from '../types/project';
import { listProjectsFromDrive } from './googleDriveStorage';
import { listArchivedProjects } from './googleDriveStorage';

interface CacheState {
  projects: Project[];
  archivedProjects: Project[];
  lastSync: Date | null;
  isSyncing: boolean;
}

class ProjectCache {
  private cache: CacheState = {
    projects: [],
    archivedProjects: [],
    lastSync: null,
    isSyncing: false
  };

  private listeners: Set<() => void> = new Set();

  /**
   * Get current cached projects
   */
  getProjects(): Project[] {
    return this.cache.projects;
  }

  /**
   * Get current cached archived projects
   */
  getArchivedProjects(): Project[] {
    return this.cache.archivedProjects;
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      lastSync: this.cache.lastSync,
      isSyncing: this.cache.isSyncing,
      projectCount: this.cache.projects.length,
      archivedCount: this.cache.archivedProjects.length
    };
  }

  /**
   * Force sync both projects and archived projects
   */
  async syncAll(): Promise<void> {
    if (this.cache.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.cache.isSyncing = true;
    this.notifyListeners();

    try {
      console.log('🔄 Starting full sync...');
      
      // Sync both in parallel
      const [projects, archivedProjects] = await Promise.all([
        listProjectsFromDrive(),
        listArchivedProjects()
      ]);

      this.cache.projects = projects;
      this.cache.archivedProjects = archivedProjects;
      this.cache.lastSync = new Date();
      
      console.log(`✅ Sync complete: ${projects.length} projects, ${archivedProjects.length} archived`);
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.notifyListeners();
    } finally {
      this.cache.isSyncing = false;
    }
  }

  /**
   * Sync only projects (for after create/archive operations)
   */
  async syncProjects(): Promise<void> {
    if (this.cache.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.cache.isSyncing = true;
    this.notifyListeners();

    try {
      console.log('🔄 Syncing projects...');
      const projects = await listProjectsFromDrive();
      this.cache.projects = projects;
      this.cache.lastSync = new Date();
      console.log(`✅ Projects sync complete: ${projects.length} projects`);
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Projects sync failed:', error);
      this.notifyListeners();
    } finally {
      this.cache.isSyncing = false;
    }
  }

  /**
   * Sync only archived projects (for after restore operations)
   */
  async syncArchivedProjects(): Promise<void> {
    if (this.cache.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.cache.isSyncing = true;
    this.notifyListeners();

    try {
      console.log('🔄 Syncing archived projects...');
      const archivedProjects = await listArchivedProjects();
      this.cache.archivedProjects = archivedProjects;
      this.cache.lastSync = new Date();
      console.log(`✅ Archived projects sync complete: ${archivedProjects.length} archived`);
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Archived projects sync failed:', error);
      this.notifyListeners();
    } finally {
      this.cache.isSyncing = false;
    }
  }

  /**
   * Add a listener for cache changes
   */
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of cache changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  /**
   * Clear cache (for testing)
   */
  clear(): void {
    this.cache = {
      projects: [],
      archivedProjects: [],
      lastSync: null,
      isSyncing: false
    };
    this.notifyListeners();
  }
}

// Export singleton instance
export const projectCache = new ProjectCache();
