// pages/api/projects/[slug]/articles/add.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getProject, saveProject } from '../../../../lib/db';
import { nanoid } from 'nanoid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query as { slug?: string };
  if (!slug) return res.status(400).json({ message: 'Missing slug' });

  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const project = await getProject(slug);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { title, url, content, source } = req.body as { title: string; url?: string; content?: string; source?: string };
    if (!title) return res.status(400).json({ message: 'title required' });

    const id = `${source ?? 'manual'}-${nanoid(8)}`;
    const article = {
      id,
      title,
      url: url ?? null,
      source: source ?? null,
      content: content ?? null,
      retrievedAt: new Date().toISOString(),
      analysisStatus: 'pending',
      analysisResult: null,
    };

    project.articles = project.articles ?? [];
    project.articles.push(article);
    await saveProject(project);

    return res.status(201).json({ article });
  } catch (err: any) {
    console.error('add article error', err);
    return res.status(500).json({ message: err.message ?? 'server error' });
  }
}
