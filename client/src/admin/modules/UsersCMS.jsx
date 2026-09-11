/* global confirm, console */
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";

export default function UsersCMS() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin"
  });

  const fetchUsers = () => {
    apiFetch("/api/v1/cms/users")
      .then((data) => {
        if (data.success) setUsers(data.data || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/v1/cms/users", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      fetchUsers();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this admin account?")) {
      try {
        await apiFetch(`/api/v1/cms/users/${id}`, { method: "DELETE" });
        fetchUsers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage-border pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">Access Control</span>
          <h1 className="font-heading text-3xl text-forest">Admin Users & RBAC Permissions</h1>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#7C9B69] transition shadow-sage cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Create Admin User
        </button>
      </div>

      <div className="rounded-3xl border border-sage-border bg-sage-card p-4 shadow-soft overflow-x-auto">
        <table className="w-full text-left text-xs text-forest">
          <thead className="border-b border-sage-border bg-sage-secondary/30 uppercase text-[10px] tracking-wider text-sage-muted font-semibold">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-warm/60">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-sage-secondary/20">
                <td className="p-3 font-semibold text-forest">{u.name}</td>
                <td className="p-3 text-sage-muted">{u.email}</td>
                <td className="p-3">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[rgb(72,125,72)]/10 text-site">
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(u._id)}
                    className="p-1 rounded-lg border border-sage-border text-rose-600 hover:border-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-4 backdrop-blur-md">
          <div className="relative max-w-lg w-full rounded-3xl border border-sage-light/40 bg-sage-card p-6 space-y-4 shadow-deep">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-sage-muted">
              <X className="h-4 w-4" />
            </button>
            <h2 className="font-serif text-2xl text-forest">Create New Admin User</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-sage-muted mb-1">Full Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="field-luxury text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sage-muted mb-1">Email Address *</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="field-luxury text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sage-muted mb-1">Password *</label>
                <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="field-luxury text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sage-muted mb-1">Role *</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="field-luxury text-sm cursor-pointer">
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <button type="submit" className="w-full rounded-full bg-[rgb(72,125,72)] px-6 py-3 text-xs font-semibold text-white hover:bg-[#7C9B69] transition cursor-pointer">
                Create User Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
