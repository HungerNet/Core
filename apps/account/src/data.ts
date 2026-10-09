import type { AccountProfile, LinkedIdentity, SessionDevice } from "./types";

export const profile: AccountProfile = {
  username: "demo-user",
  displayName: "Demo User",
  bio: "Community maintainer and maker of useful tools for the HungerNet ecosystem.",
  avatarUrl: null,
  publicProfileUrl: "https://hungernet.dev/user/demo-user",
};

export const linkedIdentities: LinkedIdentity[] = [
  { provider: "google", connected: true, email: "demo@gmail.com" },
  { provider: "github", connected: false },
  { provider: "discord", connected: true, username: "demo-user#1234" },
];

export const devices: SessionDevice[] = [
  { id: "device-1", label: "This browser", lastSeen: "Just now", current: true },
  { id: "device-2", label: "Linux workstation", lastSeen: "2 days ago", current: false },
  { id: "device-3", label: "iPhone", lastSeen: "1 week ago", current: false },
];
