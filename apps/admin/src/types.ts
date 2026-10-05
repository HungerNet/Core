export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  status: "active" | "disabled";
  roleNames: string[];
}

export interface AdminRole {
  id: string;
  key: string;
  name: string;
  description?: string;
  permissionKeys: string[];
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
}

export interface ProjectRecord {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  body: string;
}
