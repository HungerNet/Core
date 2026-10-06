import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { GlassCard, InputBox } from "@hungernet/ui";
import { Link } from "react-router-dom";
import { AdminLayout } from "../components/AdminLayout";

interface AdminUserRecord {
  id: string;
  username: string;
  display_name: string;
  status: "active" | "disabled";
  roles: string[];
}

interface UserListResponse {
  items: AdminUserRecord[];
  total: number;
}

const api = createApiClient();

export function UserListPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<UserListResponse>("/admin/users?limit=100")
      .then((response) => setUsers(response.items))
      .catch(() => setError("Could not load users. Check your admin permissions and try again."))
      .finally(() => setLoading(false));
  }, []);

  const visibleUsers = users.filter((user) =>
    `${user.username} ${user.display_name}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <AdminLayout title="Users">
      <div style={{ marginBottom: "1rem" }}>
        <InputBox value={search} onChange={setSearch} placeholder="Search users" aria-label="Search users" />
      </div>

      {loading && <p role="status">Loading users…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && visibleUsers.length === 0 && <p>No users found.</p>}
      <div style={{ display: "grid", gap: "1rem" }}>
        {visibleUsers.map((user) => (
          <GlassCard key={user.id} style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h3>{user.display_name}</h3>
                <p className="muted">@{user.username}</p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <span className="muted">{user.status}</span>
                <Link to={`/users/${user.id}`} className="glass-button glass-button--secondary glass-button--sm">
                  Details
                </Link>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </AdminLayout>
  );
}
