import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { GlassCard, usePageTitle } from "@hungernet/ui/components";

interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  project_slug: string | null;
}

const api = createApiClient();

export default function Announcements() {
  usePageTitle("Hunger SMP | Announcements");
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void api.get<AnnouncementRecord[]>("/announcements?project_slug=hungersmp", {
      signal: controller.signal,
    })
      .then(setAnnouncements)
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not load Hunger SMP announcements.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="page">
      <header className="page-header fade-in-up">
        <h1>Announcements</h1>
        <p>Updates and news for the Hunger SMP community.</p>
      </header>
      {loading && <p role="status">Loading announcements…</p>}
      {error && <p role="alert" className="site-error">{error}</p>}
      {!loading && !error && announcements.length === 0 && <p>No announcements yet.</p>}
      <section className="section announcement-list" style={{ display: "grid", gap: "1rem" }}>
        {announcements.map((announcement) => (
          <GlassCard key={announcement.id} className="announcement-card" style={{ display: "grid", gap: "0.65rem" }}>
            <h2>{announcement.title}</h2>
            {announcement.published_at && (
              <time className="site-meta" dateTime={announcement.published_at}>
                {new Date(announcement.published_at).toLocaleDateString()}
              </time>
            )}
            <p style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{announcement.body}</p>
          </GlassCard>
        ))}
      </section>
    </div>
  );
}
