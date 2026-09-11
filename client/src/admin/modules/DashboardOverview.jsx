import { Briefcase, FileText, Image, Images, Mail, Plus, RotateCcw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api.js";

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    newEnquiries: 0,
    totalBlogPosts: 0,
    totalPortfolioItems: 0,
    totalGalleryItems: 0,
    totalTeamMembers: 0
  });

  const [recentLogs, setRecentLogs] = useState([]);
  const [recentEnquiries, setRecentEnquiries] = useState([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/v1/cms/stats")
      .then((data) => {
        if (data && data.success) {
          const statsObj = data.data?.stats || {};
          setStats({
            totalEnquiries: statsObj.totalEnquiries || 0,
            newEnquiries: statsObj.newEnquiries || 0,
            totalBlogPosts: statsObj.totalBlogPosts || 0,
            totalPortfolioItems: statsObj.totalPortfolioItems || 0,
            totalGalleryItems: statsObj.totalGalleryItems || 0,
            totalTeamMembers: statsObj.totalTeamMembers || 0
          });
          setRecentLogs(data.data?.recentLogs || []);
          setRecentEnquiries(data.data?.recentEnquiries || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage-border pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">
            System Administration
          </span>
          <h1 className="font-heading text-3xl font-normal text-forest">Studio Control Dashboard</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/services"
            className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(72,125,72)] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C9B69] transition"
          >
            <Plus className="h-4 w-4" /> Add Service
          </Link>
          <Link
            to="/admin/media"
            className="inline-flex items-center gap-1.5 rounded-full border border-sage-border bg-sage-card px-4 py-2 text-xs font-semibold text-forest hover:border-[rgb(72,125,72)] transition"
          >
            Upload Media
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Mail}
          label="New Enquiries"
          value={stats?.newEnquiries ?? 0}
          sub={`Total ${stats?.totalEnquiries ?? 0}`}
          color="bg-[rgb(72,125,72)]/10 text-site"
        />
        <StatCard
          icon={Images}
          label="Portfolio Items"
          value={stats?.totalPortfolioItems ?? 0}
          color="bg-[rgb(72,125,72)]/10 text-site"
        />
        <StatCard
          icon={Image}
          label="Wedding Photos"
          value={stats?.totalGalleryItems ?? 0}
          color="bg-sage-light/20 text-site"
        />
        <StatCard
          icon={FileText}
          label="Journal Posts"
          value={stats?.totalBlogPosts ?? 0}
          color="bg-emerald-500/10 text-emerald-700"
        />
        <StatCard
          icon={Users}
          label="Team Artists"
          value={stats?.totalTeamMembers ?? 0}
          color="bg-sage-light/20 text-site"
        />
        <StatCard
          icon={Briefcase}
          label="Collaborations"
          value={4}
          color="bg-[rgb(72,125,72)]/15 text-site"
        />
      </div>

      {/* Grid: Recent Enquiries & Audit Activity */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Enquiries */}
        <div className="rounded-3xl border border-sage-border bg-sage-card p-6 space-y-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-forest">Recent Project Enquiries</h2>
            <Link to="/admin/enquiries" className="text-xs font-semibold text-site hover:underline">
              View All Enquiries →
            </Link>
          </div>

          <div className="space-y-3">
            {recentEnquiries && recentEnquiries.length > 0 ? (
              recentEnquiries.map((enq) => (
                <div key={enq._id} className="flex items-center justify-between p-3 rounded-2xl bg-sage-secondary/40 border border-sage-border/60">
                  <div>
                    <p className="text-xs font-semibold text-forest">{enq.name}</p>
                    <p className="text-[10px] text-sage-muted">{enq.email} • {enq.service}</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-sage-light/20 text-site">
                    {enq.status || "new"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-sage-muted">No client enquiries received yet.</p>
            )}
          </div>
        </div>

        {/* Audit Activity */}
        <div className="rounded-3xl border border-sage-border bg-sage-card p-6 space-y-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-forest flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-site" /> Audit Activity Log
            </h2>
            <Link to="/admin/audit-logs" className="text-xs font-semibold text-site hover:underline">
              Full Log →
            </Link>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentLogs && recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log._id} className="flex items-center justify-between text-xs p-2.5 border-b border-sage-border/60">
                  <div>
                    <span className="font-semibold text-forest">{log.action}</span>
                    <span className="text-sage-muted font-mono text-[10px] ml-2">({log.entity})</span>
                  </div>
                  <span className="text-[10px] text-sage-muted">{log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ""}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-sage-muted">System logs will appear as actions take place.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-2xl border border-sage-border bg-sage-card p-5 space-y-3 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-sage-muted uppercase tracking-wider">{label}</span>
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="font-serif text-3xl font-normal text-forest">{value}</p>
        {sub && <p className="text-[10px] text-sage-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
