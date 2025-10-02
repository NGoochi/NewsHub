import express from 'express';
import { listProjects } from '../lib/db';
import { makeSlug } from '../lib/slug';
import { duplicateMasterSheet } from '../lib/googleSheets';
import { saveProject } from '../lib/db';
import { Project } from '../types/project';
import { listArchivedProjects } from '../lib/googleDriveStorage';
import { projectCache } from '../lib/cache';

const router = express.Router();

// Dashboard route (converted from pages/index.tsx)
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const projects = await listProjects();
    res.render('dashboard', { projects });
  } catch (err: any) {
    console.error('Dashboard error:', err);
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

// Archive route
router.get('/archive', async (req: express.Request, res: express.Response) => {
  try {
    const syncStatus = projectCache.getSyncStatus();
    const archivedProjects = projectCache.getArchivedProjects();
    res.render('archive', { 
      archivedProjects,
      lastSync: syncStatus.lastSync,
      isSyncing: syncStatus.isSyncing
    });
  } catch (err: any) {
    console.error('Archive page error:', err);
    res.status(500).render('error', { message: err.message || 'Internal server error' });
  }
});

// Settings route
router.get('/settings', async (req: express.Request, res: express.Response) => {
  try {
    const syncStatus = projectCache.getSyncStatus();
    res.render('settings', { 
      lastSync: syncStatus.lastSync,
      isSyncing: syncStatus.isSyncing
    });
  } catch (err: any) {
    console.error('Settings page error:', err);
    res.status(500).render('error', { message: err.message || 'Internal server error' });
  }
});

export default router;
