import express from 'express';
import { listProjects, getProject, saveProject, initializeProjects, archiveProject } from '../lib/db';
import { makeSlug } from '../lib/slug';
import { duplicateMasterSheet } from '../lib/googleSheets';
import { runchatService } from '../lib/runchat';
import { writeAnalysisToSheet } from '../lib/googleSheets';
import { nanoid } from 'nanoid';
import { Project } from '../types/project';
import { projectCache } from '../lib/cache';

const router = express.Router();

// API: List projects (converted from pages/api/projects/list.ts)
router.get('/projects/list', async (req: express.Request, res: express.Response) => {
  try {
    const projects = await initializeProjects();
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

    await saveProject(project);

    // Sync cache after creating project
    await projectCache.syncProjects();

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
    const project = await getProject(slug);
    
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
    const project = await getProject(slug);
    
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
    await saveProject(project);

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

    const project = await getProject(slug);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Use sheet-based articles instead of project.articles
    const selected = project.sheetArticles?.filter(a => articleIds.includes(`article-${a.id}`)) || [];
    if (selected.length === 0) {
      return res.status(400).json({ message: 'No matching articles found in sheet data' });
    }

    if (!project.sheetId) {
      return res.status(400).json({ message: 'Project has no associated sheet' });
    }

    // Prepare sheet request data for RunChat
    // The RunChat flow expects sheetid and SheetRequest parameters
    // SheetRequest should be a formatted Google Sheets API request to read selected articles
    
    // Convert article IDs to sheet row numbers (article ID + 1 due to header row)
    const selectedRowNumbers = articleIds.map(id => parseInt(id.replace('article-', '')) + 1).sort((a, b) => a - b);
    
    // Group consecutive row numbers together for efficient ranges
    const ranges: string[] = [];
    let start = selectedRowNumbers[0];
    let end = selectedRowNumbers[0];
    
    for (let i = 1; i < selectedRowNumbers.length; i++) {
      if (selectedRowNumbers[i] === end + 1) {
        // Consecutive, extend the range
        end = selectedRowNumbers[i];
      } else {
        // Not consecutive, finalize current range and start new one
        if (start === end) {
          ranges.push(`Articles!A${start}:H${start}`);
        } else {
          ranges.push(`Articles!A${start}:H${end}`);
        }
        start = selectedRowNumbers[i];
        end = selectedRowNumbers[i];
      }
    }
    
    // Add the final range
    if (start === end) {
      ranges.push(`Articles!A${start}:H${start}`);
    } else {
      ranges.push(`Articles!A${start}:H${end}`);
    }
    
    // Format as Google Sheets API URL
    const rangesParam = ranges.map(range => `ranges=${encodeURIComponent(range)}`).join('&');
    const sheetRequest = `https://sheets.googleapis.com/v4/spreadsheets/${project.sheetId}/values:batchGet?${rangesParam}&valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`;

    let runResp;
    if (runchatInstanceId) {
      // Continue existing analysis
      runResp = await runchatService.continueAnalysis(runchatInstanceId, project.sheetId, sheetRequest);
    } else {
      // Start new analysis
      runResp = await runchatService.analyzeArticles(project.sheetId, sheetRequest);
    }

    // record analysis run
    const runId = `run-${nanoid(8)}`;
    const runEntry = {
      id: runId,
      timestamp: new Date().toISOString(),
      articleIds: selected.map(a => `article-${a.id}`),
      status: 'complete' as const,
      runchatInstanceId: runResp.runchat_instance_id,
      results: runResp.data,
    };
    project.analysisRuns = project.analysisRuns ?? [];
    project.analysisRuns.push(runEntry);

    // Update sheet articles status
    if (project.sheetArticles) {
      for (const art of project.sheetArticles) {
        if (articleIds.includes(`article-${art.id}`)) {
          art.status = 'Analysed';
        }
      }
    }

    await saveProject(project);

    // write results to sheet using the new RunChat response format
    try {
      // Convert RunChat response to simple array format for Google Sheets
      const analysisRows = runResp.data.map((item: any) => [
        item.id || '',
        item.label || '',
        item.data ? JSON.stringify(item.data) : ''
      ]);
      
      await writeAnalysisToSheet(project.sheetId, analysisRows);
    } catch (err) {
      console.warn('Failed to write analysis to sheet', err);
    }

    res.json({ 
      success: true,
      runId,
      runchatInstanceId: runResp.runchat_instance_id,
      results: runResp.data,
      run: runEntry,
      // Debug information for testing
      debug: {
        selectedArticleIds: articleIds,
        selectedRowNumbers: selectedRowNumbers,
        ranges: ranges,
        sheetRequest: sheetRequest,
        runchatResponse: runResp
      }
    });
  } catch (err: any) {
    console.error('run analysis error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Archive project
router.post('/projects/:slug/archive', async (req: express.Request, res: express.Response) => {
  try {
    const { slug } = req.params;
    
    await archiveProject(slug);
    
    // Sync cache after archiving project
    await projectCache.syncAll();
    
    res.json({ message: 'Project archived successfully' });
  } catch (err: any) {
    console.error('archive project error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Restore project from archive
router.post('/archive/:projectId/restore', async (req: express.Request, res: express.Response) => {
  try {
    const { projectId } = req.params;
    
    // Import the restore function (we'll implement this)
    const { restoreProjectFromArchive } = await import('../lib/googleDriveStorage');
    
    await restoreProjectFromArchive(projectId);
    
    // Sync cache after restoring project
    await projectCache.syncAll();
    
    res.json({ message: 'Project restored successfully' });
  } catch (err: any) {
    console.error('restore project error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Sync project articles from sheet
router.post('/projects/:slug/sync-articles', async (req: express.Request, res: express.Response) => {
  try {
    const { slug } = req.params;
    const project = await getProject(slug);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Import and use the sync function
    const { updateProjectWithSheetArticles } = await import('../lib/sheetSync');
    const updatedProject = await updateProjectWithSheetArticles(project);
    
    // Save the updated project locally and to Google Drive
    await saveProject(updatedProject);
    
    // Also save to Google Drive
    const { saveProjectToDrive } = await import('../lib/googleDriveStorage');
    await saveProjectToDrive(updatedProject);

    res.json({
      success: true,
      message: 'Articles synced successfully',
      articleCount: updatedProject.sheetArticles?.length || 0
    });
  } catch (err: any) {
    console.error('sync articles error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Get project info (JSON file)
router.get('/projects/:slug/info', async (req: express.Request, res: express.Response) => {
  try {
    const { slug } = req.params;
    const project = await getProject(slug);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}-project-info.json"`);
    
    // Send the project data as formatted JSON
    res.json(project);
  } catch (err: any) {
    console.error('get project info error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Get sheet data
router.get('/projects/:slug/sheet-data', async (req: express.Request, res: express.Response) => {
  try {
    const { slug } = req.params;
    const project = await getProject(slug);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.sheetId) {
      return res.status(400).json({ message: 'Project has no associated sheet' });
    }

    // Import Google Sheets functionality
    const { google } = await import('googleapis');
    const { getAuthClient } = await import('../lib/googleDriveStorage');
    
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Read data from the Articles tab
    const range = 'Articles!A:Z'; // Read all columns from Articles tab
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: project.sheetId,
      range,
    });

    const rows = response.data.values || [];
    
    res.json({
      success: true,
      rows,
      count: rows.length - 1 // Subtract header row
    });
  } catch (err: any) {
    console.error('get sheet data error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// API: Manual sync
router.post('/sync', async (req: express.Request, res: express.Response) => {
  try {
    await projectCache.syncAll();
    const syncStatus = projectCache.getSyncStatus();
    res.json({ 
      message: 'Sync completed successfully',
      syncStatus
    });
  } catch (err: any) {
    console.error('manual sync error', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});


export default router;
