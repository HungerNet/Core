import { useEffect, useState } from "react";
import { FileUpload, GlassButton, GlassCard, InputBox } from "@hungernet/ui/components";
import { ApiClientError, createApiClient } from "@hungernet/api-client";
import { SettingsLayout } from "../components/SettingsLayout";

interface ProfileRecord {
  username: string;
  email: string | null;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

const api = createApiClient();

export function ProfilePage() {
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [usernameNotice, setUsernameNotice] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void api.get<ProfileRecord>("/users/me")
      .then((profile) => {
        setUsername(profile.username);
        setSavedUsername(profile.username);
        setEmail(profile.email ?? "");
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
    setUsernameNotice("");
    try {
      const requestedUsername = username;
      const updates: Record<string, string | null> = {
        ...(email.trim() ? { email: email.trim() } : {}),
        display_name: displayName,
        bio: bio || null,
      };
      if (username !== savedUsername) updates.username = username;
      const profile = await api.patch<ProfileRecord>("/users/me", updates);
      setUsername(profile.username);
      setSavedUsername(profile.username);
      setEmail(profile.email ?? "");
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      if (username !== savedUsername && profile.username !== requestedUsername) {
        setUsernameNotice(`That username is already in use. Assigned ${profile.username} instead.`);
      }
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof ApiClientError && cause.status === 409
          ? "That username or email is already in use."
          : cause instanceof ApiClientError
            ? cause.message
            : "Could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  const usernameChanged = username !== savedUsername;
  const reservedBase = savedUsername.match(/^([a-z0-9_]+)#\d{4}$/)?.[1];
  const usernameError = !usernameChanged
    ? ""
    : !/^[a-z0-9_]{1,64}$/.test(username)
      ? "Use lowercase letters, numbers, and underscores only."
      : username === reservedBase
        ? "The base of your generated username is reserved."
        : "";

  async function uploadAvatar(file: File, onProgress: (percent: number) => void) {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const result = await api.request<{ avatar_url: string }>("/users/me/avatar", {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type },
        onUploadProgress: onProgress,
      });
      setAvatarUrl(result.avatar_url);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsLayout title="Profile settings" actions={<GlassButton variant="primary" size="sm" onClick={() => void saveProfile()} disabled={loading || saving || Boolean(usernameError)}>{saving ? "Saving…" : "Save profile"}</GlassButton>}>
      <div style={{ display: "grid", gap: "1rem" }}>
        {loading && <p role="status">Loading profile…</p>}
        {error && <p role="alert" className="site-error">{error}</p>}
        {saved && <p role="status">Profile saved.</p>}
        {usernameNotice && <p role="status">{usernameNotice}</p>}
        <GlassCard style={{ padding: "1rem" }}>
          <div className="input-row">
            <div className="input-field">
              <label htmlFor="profile-username">Username</label>
              <InputBox id="profile-username" value={username} onChange={(value) => {
                if (value.includes("#")) {
                  setUsernameNotice("The discriminator is generated automatically.");
                  return;
                }
                setUsernameNotice("");
                setUsername(value);
              }} placeholder="username" maxLength={64} pattern="[a-z0-9_]+" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(usernameError)} />
              {usernameError && <span className="site-error" role="alert">{usernameError}</span>}
            </div>
            <div className="input-field">
              <label htmlFor="profile-display-name">Display name</label>
              <InputBox id="profile-display-name" value={displayName} onChange={setDisplayName} placeholder="Display name" />
            </div>
            <div className="input-field">
              <label htmlFor="profile-email">Email address</label>
              <InputBox id="profile-email" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
              <span className="site-meta">Changing your email requires a recent sign-in.</span>
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
              <label htmlFor="profile-avatar">Profile picture</label>
              <div className="profile-avatar-upload">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Your current profile avatar" />
                  : <span aria-hidden="true">{displayName.slice(0, 1).toUpperCase() || "?"}</span>}
                <FileUpload
                  id="profile-avatar"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={loading || saving}
                  maxSizeBytes={5 * 1024 * 1024}
                  hint="PNG, JPEG, WebP, or GIF · up to 5 MB"
                  onUpload={uploadAvatar}
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </SettingsLayout>
  );
}
