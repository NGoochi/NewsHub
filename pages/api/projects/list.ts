import type { NextApiRequest, NextApiResponse } from 'next';
import { listProjects } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const projects = await listProjects();
    return res.status(200).json({ projects });
  } catch (err: any) {
    console.error('list projects error', err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
