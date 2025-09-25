// pages/api/projects/[slug]/run-analysis.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getProject, saveProject } from '../../../../lib/db';
import { runRunchat } from '../../../../lib/runchat';
import { writeAnalysisToSheet } from '../../../../lib/googleSheets';
import { nanoid } from 'nanoid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query as { slug?: string };
  if (!slug) return res.status(400).json({ message: 'Missing slug' });

  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { articleIds, runchatInstanceId } = req.body as { articleIds: string[]; runchatInstanceId?: string };
    if (!Array.isArray(articleIds) || articleIds.length === 0) return res.status(400).json({ message: 'articleIds required' });

    const project = await getProject(slug);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // gather articles
    const selected = project.articles.filter(a => articleIds.includes(a.id));
    if (selected.length === 0) return res.status(400).json({ message: 'No matching articles found' });

    // Prepare payload for RunChat. Two main strategies:
    // 1) If your flow expects specific params, call the Schema endpoint and map inputs.
    // 2) Simpler: send as raw object (works with webhook-enabled flows or code nodes).
    // Here we send raw object under "inputs" as `articles`.
    const flowId = process.env.RUNCHAT_FLOW_ID;
    if (!flowId) return res.status(500).json({ message: 'RUNCHAT_FLOW_ID not set in env' });

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

    // write results into project. Try to extract a useful string summary from runResp; otherwise store raw.
    const analysisText = typeof runResp === 'object' ? JSON.stringify(runResp) : String(runResp);

    for (const art of project.articles) {
      if (articleIds.includes(art.id)) {
        art.analysisStatus = 'complete';
        art.analysisResult = runResp;
      }
    }

    await saveProject(project);

    // write a compact analysis table to the Google Sheet (one row per analyzed article)
    try {
      const rows = selected.map(a => [
        a.id,
        a.title ?? '',
        a.url ?? '',
        // keep an abbreviated text for sheet; very large objects will become ugly, so coerce.
        (typeof runResp === 'string') ? runResp.slice(0, 300) : JSON.stringify(runResp).slice(0, 300),
      ]);
      // Add header row if you want
      const header = [['articleId', 'title', 'url', 'analysis_preview']];
      await writeAnalysisToSheet(project.sheetId, [...header, ...rows], 'Analysis');
    } catch (err) {
      console.warn('Failed to write analysis to sheet', err);
    }

    return res.status(200).json({ run: runEntry });
  } catch (err: any) {
    console.error('run analysis error', err);
    return res.status(500).json({ message: err.message ?? 'server error' });
  }
}
