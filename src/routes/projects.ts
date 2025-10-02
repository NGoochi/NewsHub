import express from 'express';
import { initializeProjects } from '../lib/db';
import { FOLDER_IDS } from '../config/folders';
import { projectCache } from '../lib/cache';

const router = express.Router();

// Dashboard route (converted from pages/index.tsx)
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const projects = projectCache.getProjects();
    const syncStatus = projectCache.getSyncStatus();
    
    res.render('dashboard', { 
      projects,
      syncStatus
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    res.status(500).render('error', { message: err.message || 'Internal server error' });
  }
});



// Archive page
router.get('/archive', async (req: express.Request, res: express.Response) => {
  try {
    const archivedProjects = projectCache.getArchivedProjects();
    const syncStatus = projectCache.getSyncStatus();
    
    res.render('archive', { 
      archivedProjects,
      syncStatus
    });
  } catch (err: any) {
    console.error('Archive page error:', err);
    res.status(500).render('error', { message: err.message || 'Internal server error' });
  }
});

// Settings page
router.get('/settings', async (req: express.Request, res: express.Response) => {
  try {
    const syncStatus = projectCache.getSyncStatus();
    res.render('settings', { 
      folderIds: FOLDER_IDS,
      syncStatus
    });
  } catch (err: any) {
    console.error('Settings page error:', err);
    res.status(500).render('error', { message: err.message || 'Internal server error' });
  }
});

// Project detail page (converted from pages/projects/[slug].tsx)
router.get('/:slug', async (req: express.Request, res: express.Response) => {
  try {
    const { slug } = req.params;
    const { getProject } = await import('../lib/db');
    
    const project = await getProject(slug);
    if (!project) {
      return res.status(404).render('error', { message: 'Project not found' });
    }

    res.render('project', { project });
  } catch (err: any) {
    console.error('Project page error:', err);
    res.status(500).render('error', { message: err.message || 'Internal server error' });
  }
});

export default router;
