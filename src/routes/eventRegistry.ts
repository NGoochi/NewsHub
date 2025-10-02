import express from 'express';
import { EventRegistryAPI } from '../lib/eventRegistry';
import { getAuthClient } from '../lib/googleSheets';
import { google } from 'googleapis';

const router = express.Router();

// Initialize Event Registry API
const eventRegistryAPI = new EventRegistryAPI();

/**
 * Get sources from Google Sheets
 */
router.get('/sources', async (req: express.Request, res: express.Response) => {
  try {
    const sourcesSheetId = process.env.EVENT_REGISTRY_SOURCES_SHEET_ID;
    const sourcesRange = process.env.EVENT_REGISTRY_SOURCES_RANGE || 'Sheet1!A2:E';
    
    if (!sourcesSheetId) {
      return res.status(400).json({ 
        message: 'Sources sheet ID not configured. Please set EVENT_REGISTRY_SOURCES_SHEET_ID environment variable.' 
      });
    }

    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const sourcesData = await sheets.spreadsheets.values.get({
      spreadsheetId: sourcesSheetId,
      range: sourcesRange,
    });

    const sources = [];
    const regions = new Set();
    const countries = new Set();
    const languages = new Set();

    if (sourcesData.data.values) {
      for (const row of sourcesData.data.values) {
        const title = row[0]?.trim() || '';
        const region = row[1]?.trim() || '';
        const country = row[2]?.trim() || '';
        const language = row[3]?.trim() || '';
        const uri = row[4]?.trim() || '';

        if (title && uri) {
          sources.push({
            title,
            region,
            country,
            language,
            uri: cleanSourceUrl(uri),
            selected: false
          });

          if (region) regions.add(region);
          if (country) countries.add(country);
          if (language) languages.add(language);
        }
      }
    }

    res.json({
      sources,
      filters: {
        regions: Array.from(regions).sort(),
        countries: Array.from(countries).sort(),
        languages: Array.from(languages).sort()
      }
    });
  } catch (error: any) {
    console.error('Error fetching sources:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch sources' });
  }
});

/**
 * Fetch articles from Event Registry
 */
router.post('/fetch-articles', async (req: express.Request, res: express.Response) => {
  try {
    const { 
      searchTerms, 
      sources, 
      startDate, 
      endDate, 
      useBooleanQuery, 
      booleanQuery,
      projectId 
    } = req.body;

    // Validate required fields
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    if (!searchTerms || searchTerms.length === 0) {
      return res.status(400).json({ message: 'At least one search term is required' });
    }

    if (!sources || sources.length === 0) {
      return res.status(400).json({ message: 'At least one source is required' });
    }

    // Build request
    const requestBody = eventRegistryAPI.buildRequest({
      searchTerms,
      sources,
      startDate,
      endDate,
      useBooleanQuery,
      booleanQuery
    });

    // Fetch articles
    const articles = await eventRegistryAPI.fetchArticles(requestBody);

    // Format articles for sheets
    const formattedArticles = eventRegistryAPI.formatArticlesForSheets(articles);

    // Add headers
    const headers = [
      'Article ID', 
      'Article Source Outlet', 
      'Article Title', 
      'Article Author/s', 
      'Article URLs', 
      'Article Full Body Text', 
      'Date the article was written', 
      'Article Input Method'
    ];

    const sheetData = [headers, ...formattedArticles];

    res.json({
      success: true,
      articles: articles,
      formattedData: sheetData,
      count: articles.length,
      message: `Successfully fetched ${articles.length} articles`
    });

  } catch (error: any) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to fetch articles from Event Registry' 
    });
  }
});

/**
 * Write articles to project sheet
 */
router.post('/write-to-sheet', async (req: express.Request, res: express.Response) => {
  try {
    const { projectId, articles } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    if (!articles || articles.length === 0) {
      return res.status(400).json({ message: 'No articles to write' });
    }

    // Get project to find sheet ID
    const { getProject } = await import('../lib/db');
    const project = await getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Format articles for sheets
    const formattedArticles = eventRegistryAPI.formatArticlesForSheets(articles);

    // Add headers
    const headers = [
      'Article ID', 
      'Article Source Outlet', 
      'Article Title', 
      'Article Author/s', 
      'Article URLs', 
      'Article Full Body Text', 
      'Date the article was written', 
      'Article Input Method'
    ];

    const sheetData = [headers, ...formattedArticles];

    // Write to the project's sheet
    const range = 'Articles!A1';
    await sheets.spreadsheets.values.append({
      spreadsheetId: project.sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: sheetData,
      },
    });

    res.json({
      success: true,
      message: `Successfully wrote ${articles.length} articles to project sheet`,
      count: articles.length
    });

  } catch (error: any) {
    console.error('Error writing to sheet:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to write articles to sheet' 
    });
  }
});

/**
 * Helper function to clean source URLs
 */
function cleanSourceUrl(source: string): string {
  return source
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove http:// or https://
    .replace(/^www\./, '') // Remove www.
    .replace(/\/$/, '') // Remove trailing slash
    .trim();
}

export default router;
