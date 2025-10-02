// lib/runchat.ts
import fetch from 'node-fetch';

type RunChatResponse = any;

const BASE = 'https://runchat.app/api/v1';

function getAuthHeader() {
  const token = process.env.RUNCHAT_API_TOKEN;
  if (!token) throw new Error('RUNCHAT_API_TOKEN not set in env');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/**
 * Run a RunChat flow.
 * - flowId: the id of the runchat flow (published id)
 * - body: arbitrary object. If your flow contains published params, send { inputs: { <paramId>: value } }
 *         otherwise flows with a webhook input accept arbitrary JSON.
 */
export async function runRunchat(flowId: string, body: any): Promise<RunChatResponse> {
  if (!flowId) throw new Error('flowId required');
  const url = `${BASE}/${encodeURIComponent(flowId)}/run`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(body ?? {}),
  });

  const txt = await res.text();
  let parsed;
  try {
    parsed = txt ? JSON.parse(txt) : null;
  } catch (err) {
    parsed = txt;
  }

  if (!res.ok) {
    const message = typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed);
    throw new Error(`RunChat run failed (${res.status}): ${message}`);
  }
  return parsed;
}
