// pages/index.tsx
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

type ProjectSummary = {
  id: string;
  name: string;
  createdAt: string;
  sheetUrl?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function load() {
    const res = await fetch('/api/projects/list');
    if (res.ok) {
      const json = await res.json();
      setProjects(json.projects ?? []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name || isCreating) return;
    
    setIsCreating(true);
    try {
      const payload = { name };
      const res = await fetch('/api/projects/create', { 
        method: 'POST', 
        headers: { 'Content-Type':'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (res.ok) {
        const data = await res.json();
        alert('✅ Project database created successfully!');
        // Navigate to the new project page
        router.push(`/projects/${data.project.id}`);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create project');
      }
    } catch (error) {
      alert('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Project Dashboard</h1>

      <form onSubmit={create} style={{ marginBottom: 24, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h3>Create New Project</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input 
            placeholder="Project name" 
            value={name} 
            onChange={e => setName(e.target.value)}
            style={{ flex: 1, padding: 8 }}
            disabled={isCreating}
          />
          <button 
            type="submit" 
            disabled={!name || isCreating}
            style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: 4 }}
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>

      <div>
        <h3>Existing Projects</h3>
        {projects.length === 0 ? (
          <p>No projects yet. Create your first project above!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {projects.map(p => (
              <li key={p.id} style={{ marginBottom: 12, padding: 12, border: '1px solid #eee', borderRadius: 4 }}>
                <Link href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: '#0070f3' }}>
                  <strong>{p.name}</strong>
                </Link>
                <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>
                  Created: {new Date(p.createdAt).toLocaleString()}
                </div>
                {p.sheetUrl && (
                  <div style={{ marginTop: 4 }}>
                    <a href={p.sheetUrl} target="_blank" rel="noreferrer" style={{ color: '#0070f3', fontSize: '0.9em' }}>
                      📊 View Database
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
