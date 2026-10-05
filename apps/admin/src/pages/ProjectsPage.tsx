import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { Button, GlassCard, InputBox } from "@hungernet/ui";
import { AdminLayout } from "../components/AdminLayout";

interface ProjectRecord {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  body: string;
}

const api = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1" });

export function ProjectsPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadProjects() {
    try {
      setProjects(await api.get<ProjectRecord[]>("/projects/mine"));
      setError("");
    } catch {
      setError("Could not load your projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function createDraft() {
    setSaving(true);
    setError("");
    try {
      const project = await api.post<ProjectRecord>("/projects", {
        title,
        slug,
        body,
        status: "draft",
      });
      setProjects((current) => [project, ...current]);
      setTitle("");
      setSlug("");
      setBody("");
    } catch {
      setError("Could not create the project. Check the title, slug, and your project permissions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout
      title="Project posting"
      actions={
        <Button variant="primary" size="sm" onClick={() => void createDraft()} disabled={saving || !title.trim() || !slug.trim() || !body.trim()}>
          {saving ? "Creating…" : "Create draft"}
        </Button>
      }
    >
      {error && <p role="alert">{error}</p>}
      <div style={{ display: "grid", gap: "1rem" }}>
        <GlassCard style={{ padding: "1rem" }}>
          <div className="input-row">
            <div className="input-field">
              <label htmlFor="project-title">Title</label>
              <InputBox id="project-title" value={title} onChange={setTitle} placeholder="Project title" />
            </div>
            <div className="input-field">
              <label htmlFor="project-slug">Slug</label>
              <InputBox id="project-slug" value={slug} onChange={setSlug} placeholder="project-slug" />
            </div>
          </div>
          <div className="input-field" style={{ marginTop: "1rem" }}>
            <label htmlFor="project-body">Description</label>
            <textarea id="project-body" className="input-box" value={body} onChange={(event) => setBody(event.target.value)} rows={5} />
          </div>
        </GlassCard>

        {loading && <p role="status">Loading projects…</p>}
        {!loading && projects.length === 0 && <p>No projects yet.</p>}
        {projects.map((project) => (
          <GlassCard key={project.id} style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h3>{project.title}</h3>
                <p className="muted">/{project.slug}</p>
              </div>
              <span className="muted">{project.status}</span>
            </div>
            <p style={{ marginTop: "0.75rem" }}>{project.body}</p>
          </GlassCard>
        ))}
      </div>
    </AdminLayout>
  );
}
