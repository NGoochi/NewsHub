import type { NextApiRequest, NextApiResponse } from 'next';
import { makeSlug } from '../../../lib/slug';
import { duplicateMasterSheet } from '../../../lib/googleSheets';
import { saveProject } from '../../../lib/db';
import { Project } from '../../../types/project';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { name, queries } = req.body as { name: string; queries?: string[] };

    if (!name) return res.status(400).json({ message: 'Project name required' });

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

    return res.status(201).json({ project });
  } catch (err: any) {
    console.error('create project error', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
