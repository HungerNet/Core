import { useEffect, useState } from "react";
import { createApiClient } from "@hungernet/api-client";
import { GlassButton, GlassCard, InputBox } from "@hungernet/ui/components";
import { AdminLayout } from "../components/AdminLayout";

interface AdminUserRecord {
  id: string;
  username: string;
  email: string | null;
  display_name: string;
  status: "active" | "disabled";
  roles: string[];
}

interface UserListResponse {
  items: AdminUserRecord[];
  total: number;
}

const api = createApiClient({ clientId: "admin" });
const pageSize = 50;

export function UserListPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    void api.get<UserListResponse>(`/admin/users?limit=${pageSize}&offset=${offset}`)
      .then((response) => {
        setUsers(response.items);
        setTotal(response.total);
      })
      .catch(() => setError("Could not load users. Check your admin permissions and try again."))
      .finally(() => setLoading(false));
  }, [offset]);

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
                <p className="muted">{user.email ?? "No email address"}</p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <span className="muted">{user.status}</span>
                <GlassButton to={`/users/${user.id}`} variant="secondary" size="sm">
                  Details
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      <div className="admin-pagination">
        <span className="muted">
          {total === 0 ? "0 users" : `${offset + 1}-${Math.min(offset + pageSize, total)} of ${total}`}
        </span>
        <div>
          <GlassButton
            variant="secondary"
            size="sm"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((current) => Math.max(0, current - pageSize))}
          >
            Previous
          </GlassButton>
          <GlassButton
            variant="secondary"
            size="sm"
            disabled={offset + pageSize >= total || loading}
            onClick={() => setOffset((current) => current + pageSize)}
          >
            Next
          </GlassButton>
        </div>
      </div>
    </AdminLayout>
  );
}
