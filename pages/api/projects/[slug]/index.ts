// pages/api/projects/[slug]/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getProject } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query as { slug?: string };
  if (!slug) return res.status(400).json({ message: 'Missing slug' });

  if (req.method === 'GET') {
    try {
      const project = await getProject(slug);
      if (!project) return res.status(404).json({ message: 'Project not found' });
      return res.status(200).json({ project });
    } catch (err: any) {
      console.error('get project error', err);
      return res.status(500).json({ message: err.message ?? 'server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
