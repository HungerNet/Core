import { useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { createApiClient, getDomainConfig } from "@hungernet/api-client";
import { useAuth } from "@hungernet/auth";
import { usePageTitle } from "@hungernet/ui";

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
  const [copied, setCopied] = useState(false);
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

  async function copyProfileLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("This browser could not copy the profile link.");
    }
  }

  if (loading) {
    return <main className="public-profile-page"><p className="profile-loading" role="status">Loading profile…</p></main>;
  }

  if (!profile) {
    return (
      <main className="public-profile-page">
        <section className="profile-unavailable">
          <div className="section-label">User profile</div>
          <h1>Profile unavailable</h1>
          <p role="alert" className="user-profile-error">{error}</p>
          <Link className="profile-copy-link" to="/">Back to HungerNet</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="public-profile-page">
      <Link className="profile-back-link" to="/" aria-label="Back to HungerNet home">
        <span aria-hidden="true">←</span> HungerNet
      </Link>
      <article className="user-profile">
        <header className="user-profile-hero">
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
              <span>Manage</span>
            </a>
          )}
          </div>
        </header>

        {profile.roles.length > 0 && (
          <div className="user-profile-roles" aria-label="Account roles">
            {profile.roles.map((role) => (
              <span key={role.id} className="user-profile-role" style={{ "--role-color": role.color } as CSSProperties}>
                {role.name}
              </span>
            ))}
          </div>
        )}

        <div className="user-profile-content">
          <section className="user-profile-bio" aria-labelledby="profile-bio-title">
            <div className="section-label">Profile</div>
            <h2 id="profile-bio-title">About {profile.display_name}</h2>
            <p>{profile.bio?.trim() || "This user has not added a bio yet."}</p>
          </section>
          <aside className="user-profile-side">
            <div className="profile-presence-line">
              <span className={`profile-presence-dot${profile.is_online ? " is-online" : ""}`} aria-hidden="true" />
              <span>{profile.is_online ? "Online now" : "Offline"}</span>
            </div>
            <button className="profile-copy-link" type="button" onClick={() => void copyProfileLink()}>
              {copied ? "Link copied" : "Copy profile link"}
            </button>
            {error && <p className="user-profile-error" role="alert">{error}</p>}
          </aside>
        </div>
      </article>
    </main>
  );
}
