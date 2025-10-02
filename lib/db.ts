import fs from 'fs/promises';
import path from 'path';
import { Project } from '../types/project';

const DATA_DIR = path.join(process.cwd(), 'data', 'projects');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function saveProject(project: Project) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${project.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8');
  return project;
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Project;
  } catch (err: any) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function listProjects(): Promise<Project[]> {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  const projects: Project[] = [];
  for (const f of files) {
    if (f.endsWith('.json')) {
      const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf-8');
      projects.push(JSON.parse(raw));
    }
  }
  return projects;
}
