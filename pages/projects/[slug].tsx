// pages/projects/[slug].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

type Article = {
  id: string;
  title: string;
  url?: string;
  content?: string;
  analysisStatus?: string;
};

export default function ProjectPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [project, setProject] = useState<any>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/projects/${slug}`).then(res => res.json()).then(js => setProject(js.project));
  }, [slug]);

  function toggle(id: string) {
    setSelected(s => ({ ...s, [id]: !s[id] }));
  }

  async function addArticle(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle) return;
    const res = await fetch(`/api/projects/${slug}/articles/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, url: newUrl, content: newContent }),
    });
    if (res.ok) {
      const json = await res.json();
      setProject((p: any) => ({ ...p, articles: [...(p.articles ?? []), json.article] }));
      setNewTitle(''); setNewUrl(''); setNewContent('');
    } else {
      alert('Failed to add article');
    }
  }

  async function runAnalysis() {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) return alert('Select at least one article');
    const res = await fetch(`/api/projects/${slug}/run-analysis`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ articleIds: ids }),
    });
    if (res.ok) {
      const json = await res.json();
      // refresh project
      const pj = await fetch(`/api/projects/${slug}`).then(r => r.json()).then(j => j.project);
      setProject(pj);
      setSelected({});
      alert('Analysis completed (saved to project).');
    } else {
      const err = await res.json();
      alert(err.message || 'analysis error');
    }
  }

  if (!project) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{project.name}</h1>
          <p style={{ color: '#666', margin: 0 }}>Created: {new Date(project.createdAt).toLocaleString()}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/" style={{ padding: '8px 16px', backgroundColor: '#f5f5f5', color: '#333', textDecoration: 'none', borderRadius: 4 }}>
            ← Back to Dashboard
          </Link>
          {project.sheetUrl && (
            <a 
              href={project.sheetUrl} 
              target="_blank" 
              rel="noreferrer" 
              style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', textDecoration: 'none', borderRadius: 4 }}
            >
              📊 View Database
            </a>
          )}
        </div>
      </div>

      <section style={{ marginBottom: 24 }}>
        <h2>Articles ({project.articles?.length || 0})</h2>
        {project.articles && project.articles.length > 0 ? (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}></th>
                  <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>Title</th>
                  <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>Source</th>
                  <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>Retrieved</th>
                  <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>Analysis</th>
                </tr>
              </thead>
              <tbody>
                {project.articles.map((a: Article) => (
                  <tr key={a.id}>
                    <td style={{ padding: 8, border: '1px solid #ddd' }}>
                      <input type="checkbox" checked={!!selected[a.id]} onChange={() => toggle(a.id)} />
                    </td>
                    <td style={{ padding: 8, border: '1px solid #ddd' }}>{a.title}</td>
                    <td style={{ padding: 8, border: '1px solid #ddd' }}>{(a as any).source || 'Manual'}</td>
                    <td style={{ padding: 8, border: '1px solid #ddd' }}>
                      {(a as any).retrievedAt ? new Date((a as any).retrievedAt).toLocaleString() : ''}
                    </td>
                    <td style={{ padding: 8, border: '1px solid #ddd' }}>
                      <span style={{ 
                        padding: '2px 6px', 
                        borderRadius: 3, 
                        fontSize: '0.8em',
                        backgroundColor: (a as any).analysisStatus === 'complete' ? '#d4edda' : '#f8d7da',
                        color: (a as any).analysisStatus === 'complete' ? '#155724' : '#721c24'
                      }}>
                        {(a as any).analysisStatus || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginBottom: 16 }}>
              <button 
                onClick={runAnalysis}
                disabled={Object.keys(selected).filter(k => selected[k]).length === 0}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4,
                  cursor: Object.keys(selected).filter(k => selected[k]).length === 0 ? 'not-allowed' : 'pointer',
                  opacity: Object.keys(selected).filter(k => selected[k]).length === 0 ? 0.5 : 1
                }}
              >
                Run Analysis on Selected ({Object.keys(selected).filter(k => selected[k]).length})
              </button>
            </div>
          </>
        ) : (
          <p>No articles yet. Add some articles below to get started!</p>
        )}
      </section>

      <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h3>Add Article (Manual)</h3>
        <form onSubmit={addArticle}>
          <div style={{ marginBottom: 12 }}>
            <input 
              placeholder="Article Title *" 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 8 }}
              required
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <input 
              placeholder="URL (optional)" 
              value={newUrl} 
              onChange={e => setNewUrl(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 8 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <textarea 
              placeholder="Content (optional)" 
              value={newContent} 
              onChange={e => setNewContent(e.target.value)}
              style={{ width: '100%', padding: 8, minHeight: 80 }}
            />
          </div>
          <button 
            type="submit" 
            disabled={!newTitle}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#0070f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4,
              cursor: !newTitle ? 'not-allowed' : 'pointer',
              opacity: !newTitle ? 0.5 : 1
            }}
          >
            Add Article
          </button>
        </form>
      </section>
    </main>
  );
}
