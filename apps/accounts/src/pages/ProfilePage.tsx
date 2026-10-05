import { useEffect, useState } from "react";
import { GlassButton, GlassCard, InputBox } from "@hungernet/ui";
import { ApiClientError, createApiClient } from "@hungernet/api-client";
import { SettingsLayout } from "../components/SettingsLayout";

interface ProfileRecord {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

const api = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1" });

export function ProfilePage() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void api.get<ProfileRecord>("/users/me")
      .then((profile) => {
        setUsername(profile.username);
        setDisplayName(profile.display_name);
        setBio(profile.bio ?? "");
        setAvatarUrl(profile.avatar_url ?? "");
      })
      .catch(() => setError("Could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const profile = await api.patch<ProfileRecord>("/users/me", {
        username,
        display_name: displayName,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      });
      setUsername(profile.username);
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsLayout title="Profile settings" actions={<GlassButton variant="primary" size="sm" onClick={() => void saveProfile()} disabled={loading || saving}>{saving ? "Saving…" : "Save profile"}</GlassButton>}>
      <div style={{ display: "grid", gap: "1rem" }}>
        {loading && <p role="status">Loading profile…</p>}
        {error && <p role="alert" className="site-error">{error}</p>}
        {saved && <p role="status">Profile saved.</p>}
        <GlassCard style={{ padding: "1rem" }}>
          <div className="input-row">
            <div className="input-field">
              <label htmlFor="profile-username">Username</label>
              <InputBox id="profile-username" value={username} onChange={setUsername} placeholder="username" />
            </div>
            <div className="input-field">
              <label htmlFor="profile-display-name">Display name</label>
              <InputBox id="profile-display-name" value={displayName} onChange={setDisplayName} placeholder="Display name" />
            </div>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: "1rem" }}>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="input-field">
              <label htmlFor="profile-bio">Bio</label>
              <textarea
                id="profile-bio"
                className="input-box"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={6}
                style={{ resize: "vertical" }}
              />
            </div>
            <div className="input-field">
              <label htmlFor="profile-avatar">Profile picture URL</label>
              <InputBox id="profile-avatar" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://example.com/avatar.jpg" />
            </div>
          </div>
        </GlassCard>
      </div>
    </SettingsLayout>
  );
}
