import express from 'express';
import { listProjectsFromDrive, getProjectFromDrive, saveProjectToDrive } from '../lib/googleDriveStorage';
import { makeSlug } from '../lib/slug';
import { duplicateMasterSheet } from '../lib/googleSheets';
import { runRunchat } from '../lib/runchat';
import { writeAnalysisToSheet } from '../lib/googleSheets';
import { nanoid } from 'nanoid';
import { Project } from '../types/project';
import { syncProjectsWithDrive } from '../lib/googleDriveStorage';
import { projectCache } from '../lib/cache';

const router = express.Router();

// API: List projects (converted from pages/api/projects/list.ts)
router.get('/projects/list', async (req: express.Request, res: express.Response) => {
  try {
    const projects = await listProjectsFromDrive();
    res.json({ projects });
  } catch (err: any) {
    console.error('list projects error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Create project (converted from pages/api/projects/create.ts)
router.post('/projects/create', async (req: express.Request, res: express.Response) => {
  try {
    const { name, queries } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Project name required' });
    }

    const slug = makeSlug(name);
    const timestamp = new Date().toISOString();
    const copyTitle = `${name} — ${timestamp}`;

    // duplicate master sheet
    const { sheetId, webViewLink } = await duplicateMasterSheet(copyTitle);

    const project: Project = {
      id: slug,
      name,
      createdAt: timestamp,
      sheetId,
      sheetUrl: webViewLink ?? null,
      queries: queries ?? [],
      owner: null,
      articles: [],
      analysisRuns: [],
      meta: {},
    };

    await saveProjectToDrive(project);

    res.status(201).json({ project });
  } catch (err: any) {
    console.error('create project error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Get project (converted from pages/api/projects/[slug]/index.ts)
router.get('/projects/:slug', async (req: express.Request, res: express.Response) => {
  try {
    const { slug } = req.params;
    const project = await getProjectFromDrive(slug);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json({ project });
  } catch (err: any) {
    console.error('get project error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Add article (converted from pages/api/projects/[slug]/articles/add.ts)
router.post('/projects/:slug/articles/add', async (req: express.Request, res: express.Response) => {
  try {
    const { slug } = req.params;
    const project = await getProjectFromDrive(slug);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const { title, url, content, source } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'title required' });
    }

    const id = `${source ?? 'manual'}-${nanoid(8)}`;
    const article = {
      id,
      title,
      url: url ?? null,
      source: source ?? null,
      content: content ?? null,
      retrievedAt: new Date().toISOString(),
      analysisStatus: 'pending' as const,
      analysisResult: null,
    };

    project.articles = project.articles ?? [];
    project.articles.push(article);
    await saveProjectToDrive(project);

    res.status(201).json({ article });
  } catch (err: any) {
    console.error('add article error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Run analysis (converted from pages/api/projects/[slug]/run-analysis.ts)
router.post('/projects/:slug/run-analysis', async (req: express.Request, res: express.Response) => {
  try {
    const { slug } = req.params;
    const { articleIds, runchatInstanceId } = req.body;
    
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ message: 'articleIds required' });
    }

    const project = await getProjectFromDrive(slug);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // gather articles
    const selected = project.articles.filter(a => articleIds.includes(a.id));
    if (selected.length === 0) {
      return res.status(400).json({ message: 'No matching articles found' });
    }

    // Prepare payload for RunChat
    const flowId = process.env.RUNCHAT_FLOW_ID;
    if (!flowId) {
      return res.status(500).json({ message: 'RUNCHAT_FLOW_ID not set in env' });
    }

    const payload: any = {
      inputs: {
        articles: selected.map(a => ({
          id: a.id,
          title: a.title,
          url: a.url,
          source: a.source,
          content: a.content,
        })),
      },
    };
    if (runchatInstanceId) payload.runchat_instance_id = runchatInstanceId;

    // call runchat
    const runResp = await runRunchat(flowId, payload);

    // record analysis run
    const runId = `run-${nanoid(8)}`;
    const runEntry = {
      id: runId,
      timestamp: new Date().toISOString(),
      articleIds: selected.map(a => a.id),
      status: 'complete' as const,
      result: runResp,
    };
    project.analysisRuns = project.analysisRuns ?? [];
    project.analysisRuns.push(runEntry);

    // write results into project
    const analysisText = typeof runResp === 'object' ? JSON.stringify(runResp) : String(runResp);

    for (const art of project.articles) {
      if (articleIds.includes(art.id)) {
        art.analysisStatus = 'complete';
        art.analysisResult = runResp;
      }
    }

    await saveProjectToDrive(project);

    // write a compact analysis table to the Google Sheet
    try {
      const rows = selected.map(a => [
        a.id,
        a.title ?? '',
        a.url ?? '',
        (typeof runResp === 'string') ? runResp.slice(0, 300) : JSON.stringify(runResp).slice(0, 300),
      ]);
      const header = [['articleId', 'title', 'url', 'analysis_preview']];
      await writeAnalysisToSheet(project.sheetId, [...header, ...rows], 'Analysis');
    } catch (err) {
      console.warn('Failed to write analysis to sheet', err);
    }

    res.json({ run: runEntry });
  } catch (err: any) {
    console.error('run analysis error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Get sync status
router.get('/sync-status', async (req: express.Request, res: express.Response) => {
  try {
    const syncStatus = projectCache.getSyncStatus();
    res.json({
      lastSync: syncStatus.lastSync,
      isSyncing: syncStatus.isSyncing,
      projectCount: syncStatus.projectCount,
      archivedCount: syncStatus.archivedCount
    });
  } catch (err: any) {
    console.error('Sync status error:', err);
    res.status(500).json({ 
      message: err.message || 'Failed to get sync status'
    });
  }
});

// API: Manual sync endpoint
router.post('/sync', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Manual sync requested');
    await syncProjectsWithDrive();
    const syncStatus = projectCache.getSyncStatus();
    res.json({ 
      success: true, 
      message: 'Sync completed successfully',
      lastSync: syncStatus.lastSync,
      isSyncing: syncStatus.isSyncing
    });
  } catch (err: any) {
    console.error('Manual sync error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Sync failed'
    });
  }
});

export default router;
