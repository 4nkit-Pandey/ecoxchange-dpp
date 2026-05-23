"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  Package,
  Activity,
  Shield,
  AlertTriangle,
  BarChart3,
  Settings,
  QrCode,
  Search,
  CheckCircle2,
  Flag,
  Loader2,
  TrendingUp,
  Clock,
  Database,
  Trash2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { formatDate, formatCurrency, getCategoryIcon } from "@/lib/utils";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalProducts: number;
  activeProducts: number;
  listedProducts: number;
  unclaimedProducts: number;
  totalTransfers: number;
  totalRepairs: number;
  totalListings: number;
}

interface AdminData {
  stats: Stats;
  recentProducts: Array<{
    id: string;
    dppId: string;
    category: string;
    brand?: string;
    model?: string;
    status: string;
    trustScore: number;
    isVerified: boolean;
    isFlagged: boolean;
    createdAt: string;
    currentOwner?: { name: string };
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    college?: string;
    trustScore: number;
    createdAt: string;
  }>;
  categoryBreakdown: Array<{ category: string; _count: { category: number } }>;
  statusBreakdown: Array<{ status: string; _count: { status: number } }>;
  recentActions: Array<{
    id: string;
    actionType: string;
    notes?: string;
    createdAt: string;
    admin: { name: string };
    product?: { dppId: string; brand?: string; model?: string };
  }>;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="mono-tag">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      {sub && <div className="text-xs text-zinc-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "products" | "users" | "qr">("overview");
  const [newQr, setNewQr] = useState({ category: "LAPTOP", brand: "", model: "", serialNumber: "" });
  const [generatedQr, setGeneratedQr] = useState<{ qrSticker: string; dppId: string; qrPng: string } | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/sign-in"); return; }
    if (status === "authenticated" && !(session?.user as { isAdmin?: boolean })?.isAdmin) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!(session?.user as { isAdmin?: boolean })?.isAdmin) return;
    fetchData();
  }, [session]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleProductAction(productId: string, action: string) {
    setActionLoading(productId);
    try {
      await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, action }),
      });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm("Are you sure you want to permanently delete this product and all its history?")) return;
    setActionLoading(productId);
    try {
      await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGenerateQr() {
    if (!newQr.category) return;
    setGeneratingQr(true);
    try {
      const res = await fetch("/api/products/activate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQr),
      });
      if (res.ok) {
        const d = await res.json();
        setGeneratedQr({ qrSticker: d.qrSticker, dppId: d.product.dppId, qrPng: d.qrPng });
        await fetchData();
      }
    } finally {
      setGeneratingQr(false);
    }
  }

  const downloadQr = (format: "png" | "svg") => {
    if (!generatedQr) return;
    if (format === "png") {
      const a = document.createElement("a");
      a.href = generatedQr.qrPng;
      a.download = `ecoxchange-qr-${generatedQr.dppId}.png`;
      a.click();
    } else {
      const blob = new Blob([generatedQr.qrSticker], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ecoxchange-sticker-${generatedQr.dppId}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const navItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "products", label: "Products", icon: Package },
    { id: "users", label: "Users", icon: Users },
    { id: "qr", label: "QR Issuance", icon: QrCode },
  ] as const;

  const filteredProducts = productSearch
    ? data.recentProducts.filter(
        (p) =>
          p.dppId.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.brand?.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.model?.toLowerCase().includes(productSearch.toLowerCase())
      )
    : data.recentProducts;

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* Admin header */}
        <div className="flex items-center gap-3 mb-6 pt-4">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Admin Dashboard</h1>
            <p className="text-xs text-zinc-500">Platform management & analytics</p>
          </div>
          <div className="ml-auto text-xs text-zinc-700">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Side nav + content */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-44 flex-shrink-0">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeSection === item.id
                      ? "bg-white/5 text-white"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/3"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* OVERVIEW */}
            {activeSection === "overview" && (
              <div className="space-y-6">
                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Total Users" value={data.stats.totalUsers} icon={Users} color="bg-blue-500/10 text-blue-400" />
                  <StatCard label="Total Products" value={data.stats.totalProducts} icon={Package} color="bg-emerald-500/10 text-emerald-400" />
                  <StatCard label="Active Products" value={data.stats.activeProducts} icon={Activity} color="bg-emerald-500/10 text-emerald-400" sub={`${data.stats.listedProducts} listed`} />
                  <StatCard label="Total Transfers" value={data.stats.totalTransfers} icon={TrendingUp} color="bg-violet-500/10 text-violet-400" />
                  <StatCard label="Unclaimed" value={data.stats.unclaimedProducts} icon={Clock} color="bg-zinc-500/10 text-zinc-400" />
                  <StatCard label="Repair Logs" value={data.stats.totalRepairs} icon={Settings} color="bg-orange-500/10 text-orange-400" />
                  <StatCard label="Listings" value={data.stats.totalListings} icon={BarChart3} color="bg-blue-500/10 text-blue-400" />
                  <StatCard label="Total Revenue" value="₹—" icon={Database} color="bg-amber-500/10 text-amber-400" sub="Marketplace volume" />
                </div>

                {/* Category Breakdown */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-5">
                    <div className="mono-tag mb-4">Category Distribution</div>
                    <div className="space-y-2">
                      {data.categoryBreakdown.map((item) => {
                        const pct = Math.round((item._count.category / data.stats.totalProducts) * 100) || 0;
                        return (
                          <div key={item.category}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{getCategoryIcon(item.category)}</span>
                                <span className="text-xs text-zinc-400">{item.category.replace("_", " ")}</span>
                              </div>
                              <span className="text-xs text-zinc-500">{item._count.category} ({pct}%)</span>
                            </div>
                            <div className="h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500/60 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-5">
                    <div className="mono-tag mb-4">Status Distribution</div>
                    <div className="space-y-2">
                      {data.statusBreakdown.map((item) => {
                        const pct = Math.round((item._count.status / data.stats.totalProducts) * 100) || 0;
                        const color = {
                          ACTIVE: "bg-emerald-500/60",
                          LISTED: "bg-blue-500/60",
                          UNCLAIMED: "bg-zinc-500/40",
                          TRANSFERRED: "bg-violet-500/60",
                          RETIRED: "bg-red-500/60",
                        }[item.status] ?? "bg-zinc-500/40";
                        return (
                          <div key={item.status}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-zinc-400">{item.status}</span>
                              <span className="text-xs text-zinc-500">{item._count.status} ({pct}%)</span>
                            </div>
                            <div className="h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent Admin Actions */}
                <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1f1f1f]">
                    <div className="mono-tag">Recent Admin Actions</div>
                  </div>
                  <div className="divide-y divide-[#141414]">
                    {data.recentActions.map((action) => (
                      <div key={action.id} className="px-5 py-3 flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          action.actionType === "PRODUCT_VERIFIED" ? "bg-emerald-500/10" :
                          action.actionType === "PRODUCT_FLAGGED" ? "bg-red-500/10" : "bg-zinc-500/10"
                        }`}>
                          {action.actionType === "PRODUCT_VERIFIED" ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : action.actionType === "PRODUCT_FLAGGED" ? (
                            <Flag className="w-3 h-3 text-red-400" />
                          ) : (
                            <QrCode className="w-3 h-3 text-zinc-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-zinc-300">
                            <span className="font-medium">{action.admin.name}</span>{" "}
                            {action.actionType.replace(/_/g, " ").toLowerCase()}
                            {action.product && ` · ${action.product.brand} ${action.product.model}`}
                          </div>
                          {action.notes && <div className="text-xs text-zinc-600 truncate">{action.notes}</div>}
                        </div>
                        <div className="text-[10px] text-zinc-700">{formatDate(action.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {activeSection === "products" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className="input-base pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl overflow-hidden">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>DPP-ID</th>
                        <th>Status</th>
                        <th>Owner</th>
                        <th>Trust</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <span>{getCategoryIcon(product.category)}</span>
                              <div>
                                <div className="text-sm text-zinc-200">
                                  {product.brand} {product.model}
                                </div>
                                <div className="text-xs text-zinc-600">{product.category}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <Link href={`/passport/${product.dppId}`} className="font-mono text-xs text-emerald-400 hover:underline">
                              {product.dppId}
                            </Link>
                          </td>
                          <td>
                            <span className={`badge ${
                              product.status === "ACTIVE" ? "badge-active" :
                              product.status === "LISTED" ? "badge-listed" :
                              product.status === "UNCLAIMED" ? "badge-unclaimed" : "badge-transferred"
                            }`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="text-sm text-zinc-400">
                            {product.currentOwner?.name ?? "—"}
                          </td>
                          <td>
                            <span className={`text-sm font-medium ${product.trustScore >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                              {Math.round(product.trustScore)}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              {!product.isVerified && (
                                <button
                                  onClick={() => handleProductAction(product.id, "verify")}
                                  disabled={actionLoading === product.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-[10px] hover:bg-emerald-500/12 transition-all"
                                >
                                  {actionLoading === product.id ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                  )}
                                  Verify
                                </button>
                              )}
                              {!product.isFlagged ? (
                                <button
                                  onClick={() => handleProductAction(product.id, "flag")}
                                  disabled={actionLoading === product.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/8 border border-red-500/15 text-red-400 text-[10px] hover:bg-red-500/12 transition-all"
                                >
                                  <Flag className="w-2.5 h-2.5" />
                                  Flag
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleProductAction(product.id, "unflag")}
                                  disabled={actionLoading === product.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-500/8 border border-zinc-500/15 text-zinc-400 text-[10px]"
                                >
                                  Unflag
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                disabled={actionLoading === product.id}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] hover:bg-red-500/20 transition-all ml-1"
                                title="Delete Product"
                              >
                                {actionLoading === product.id ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-2.5 h-2.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* USERS */}
            {activeSection === "users" && (
              <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1f1f1f]">
                  <div className="mono-tag">Registered Users ({data.stats.totalUsers})</div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>College</th>
                      <th>Trust Score</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="text-sm text-zinc-200">{user.name}</td>
                        <td className="text-xs text-zinc-500">{user.email}</td>
                        <td className="text-xs text-zinc-500">{user.college ?? "—"}</td>
                        <td>
                          <span className={`text-sm font-medium ${user.trustScore >= 70 ? "text-emerald-400" : user.trustScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                            {Math.round(user.trustScore)}
                          </span>
                        </td>
                        <td className="text-xs text-zinc-600">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* QR ISSUANCE */}
            {activeSection === "qr" && (
              <div className="space-y-5">
                <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-6">
                  <div className="mono-tag mb-4">Generate New Product QR</div>
                  <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Category *</label>
                      <select
                        value={newQr.category}
                        onChange={(e) => setNewQr({ ...newQr, category: e.target.value })}
                        className="input-base"
                      >
                        {["LAPTOP", "PHONE", "GAMING_CONSOLE", "CYCLE", "APPLIANCE", "ACADEMIC_EQUIPMENT", "OTHER"].map((c) => (
                          <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Brand</label>
                      <input
                        type="text"
                        value={newQr.brand}
                        onChange={(e) => setNewQr({ ...newQr, brand: e.target.value })}
                        placeholder="e.g. Apple, Dell, Sony"
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Model</label>
                      <input
                        type="text"
                        value={newQr.model}
                        onChange={(e) => setNewQr({ ...newQr, model: e.target.value })}
                        placeholder="e.g. MacBook Pro 14"
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Serial Number</label>
                      <input
                        type="text"
                        value={newQr.serialNumber}
                        onChange={(e) => setNewQr({ ...newQr, serialNumber: e.target.value })}
                        placeholder="Optional"
                        className="input-base"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateQr}
                    disabled={generatingQr}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-all disabled:opacity-60"
                    id="generate-qr-btn"
                  >
                    {generatingQr ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                    Generate QR + DPP-ID
                  </button>
                </div>

                {/* Generated QR */}
                {generatedQr && (
                  <div className="bg-[#0f0f0f] border border-emerald-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <div className="mono-tag text-emerald-400">QR Generated Successfully</div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5 items-start">
                      {/* QR Preview */}
                      <div className="flex justify-center">
                        <div className="bg-white rounded-xl p-3 w-36 h-36 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={generatedQr.qrPng} alt="QR Code" className="w-full h-full object-contain" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="mono-tag mb-1">DPP-ID</div>
                          <div className="font-mono text-sm text-emerald-400 bg-emerald-500/6 border border-emerald-500/15 rounded-lg px-3 py-2">
                            {generatedQr.dppId}
                          </div>
                        </div>
                        <div>
                          <div className="mono-tag mb-1">Activation URL</div>
                          <div className="font-mono text-[10px] text-zinc-500 bg-[#141414] border border-[#1f1f1f] rounded-lg px-3 py-2 break-all">
                            {typeof window !== "undefined" ? window.location.origin : ""}/activate/{generatedQr.dppId}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => downloadQr("png")}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#1f1f1f] text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 text-xs font-medium transition-all"
                          >
                            Download PNG
                          </button>
                          <button
                            onClick={() => downloadQr("svg")}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/15 transition-all"
                          >
                            Download Sticker SVG
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
