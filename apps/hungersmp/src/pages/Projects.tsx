import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { GlassCard, usePageTitle } from "@hungernet/ui/components";

interface ProjectRecord {
  id: string;
  title: string;
  slug: string;
  body: string;
}

const api = createApiClient();

export default function Projects() {
  usePageTitle("Hunger SMP | Projects");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void api.get<ProjectRecord[]>("/projects", { signal: controller.signal })
      .then(setProjects)
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not load published projects.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="page">
      <header className="page-header fade-in-up">
        <h1>Projects</h1>
        <p>Explore the projects and tools published across HungerNet.</p>
      </header>
      {loading && <p role="status">Loading projects…</p>}
      {error && <p role="alert" className="site-error">{error}</p>}
      {!loading && !error && projects.length === 0 && <p>No published projects yet.</p>}
      <section className="section project-list" style={{ display: "grid", gap: "1rem" }}>
        {projects.map((project) => (
          <GlassCard key={project.id} className="project-card" style={{ display: "grid", gap: "0.65rem" }}>
            <h2>{project.title}</h2>
            <p className="site-meta">/{project.slug}</p>
            <p style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{project.body}</p>
          </GlassCard>
        ))}
      </section>
    </div>
  );
}
