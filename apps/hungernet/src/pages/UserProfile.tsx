import { useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { createApiClient, getDomainConfig } from "@hungernet/api-client";
import { useAuth } from "@hungernet/auth";
import { GlassCard, usePageTitle } from "@hungernet/ui";

interface ProfileRole {
  id: string;
  name: string;
  color: string;
}

interface PublicProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_online: boolean;
  roles: ProfileRole[];
}

const api = createApiClient({ clientId: "hungernet" });

export default function UserProfile() {
  const { username = "" } = useParams();
  const { user: viewer } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [error, setError] = useState("");
  const canManageUsers = viewer?.permissions?.includes("platform.admin.users.read") ?? false;

  usePageTitle(profile ? `${profile.display_name} (@${profile.username})` : "User profile");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setProfile(null);
    setAvatarFailed(false);
    void api.get<PublicProfile>(`/public/users/${encodeURIComponent(username)}`)
      .then((result) => {
        if (active) setProfile(result);
      })
      .catch(() => {
        if (active) setError("This profile could not be found or is private.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [username]);

  if (loading) {
    return <main className="page public-profile-page"><GlassCard className="user-profile-card"><p role="status">Loading profile…</p></GlassCard></main>;
  }

  if (!profile) {
    return (
      <main className="page public-profile-page">
        <GlassCard className="user-profile-card">
          <div className="section-label">User profile</div>
          <h1>Profile unavailable</h1>
          <p role="alert" className="user-profile-error">{error}</p>
          <Link className="glass-button glass-button--secondary glass-button--sm" to="/">Back to HungerNet</Link>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="page public-profile-page">
      <GlassCard className="user-profile-card">
        <div className="user-profile-cover" aria-hidden="true" />
        <div className="user-profile-heading">
          <div className="user-profile-avatar">
            {profile.avatar_url && !avatarFailed
              ? <img src={profile.avatar_url} alt={`${profile.display_name}'s avatar`} onError={() => setAvatarFailed(true)} />
              : <span aria-hidden="true">{profile.display_name.slice(0, 1).toUpperCase() || "?"}</span>}
            <span
              className={`user-profile-presence${profile.is_online ? " is-online" : ""}`}
              role="img"
              aria-label={profile.is_online ? "Online" : "Offline"}
              title={profile.is_online ? "Online" : "Offline"}
            />
          </div>
          <div className="user-profile-names">
            <h1>{profile.display_name}</h1>
            <p>@{profile.username}</p>
          </div>
          {canManageUsers && (
            <a
              className="user-profile-manage"
              href={`${getDomainConfig().admin}/users/${encodeURIComponent(profile.id)}`}
              aria-label={`Manage ${profile.username}`}
              title="Manage user"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m14.5 6.5 3 3M4 20l4.5-.9L19 8.6a2.12 2.12 0 0 0-3-3L5.5 16.1 4 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Manage</span>
            </a>
          )}
        </div>

        {profile.roles.length > 0 && (
          <div className="user-profile-roles" aria-label="Roles">
            {profile.roles.map((role) => (
              <span key={role.id} className="user-profile-role" style={{ "--role-color": role.color } as CSSProperties}>
                {role.name}
              </span>
            ))}
          </div>
        )}

        <section className="user-profile-bio" aria-labelledby="profile-bio-title">
          <h2 id="profile-bio-title">About</h2>
          <p>{profile.bio?.trim() || "This user has not added a bio yet."}</p>
        </section>
      </GlassCard>
    </main>
  );
}
