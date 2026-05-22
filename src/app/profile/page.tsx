"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Building2,
  Star,
  Shield,
  Package,
  Clock,
  Edit3,
  Check,
  Loader2,
  QrCode,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { formatDate, formatCurrency, getTrustLabel, getCategoryIcon } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  college?: string;
  phone?: string;
  trustScore: number;
  isAdmin: boolean;
  createdAt: string;
  ownedProducts: Array<{
    id: string;
    dppId: string;
    category: string;
    brand?: string;
    model?: string;
    status: string;
    conditionScore: number;
    activatedAt?: string;
  }>;
  sellerListings: Array<{
    id: string;
    askingPrice: number;
    listingStatus: string;
    createdAt: string;
    product: { dppId: string; brand?: string; model?: string };
  }>;
  _count: {
    ownedProducts: number;
    sellerListings: number;
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/sign-in");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data.user);
          setEditName(data.user.name);
          setEditPhone(data.user.phone ?? "");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, phone: editPhone }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const trustInfo = getTrustLabel(profile.trustScore);
  const activeListings = profile.sellerListings.filter((l) => l.listingStatus === "ACTIVE");
  const soldListings = profile.sellerListings.filter((l) => l.listingStatus === "SOLD");

  // Compute trust score ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (profile.trustScore / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Left sidebar — profile card */}
          <div className="space-y-4">
            {/* Identity card */}
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-6">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-[#2a2a2a] flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {profile.isAdmin && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 border-2 border-[#0f0f0f] flex items-center justify-center">
                      <Shield className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                {editing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input-base text-center font-semibold text-base"
                    id="edit-name"
                  />
                ) : (
                  <h1 className="text-lg font-semibold text-white text-center">
                    {profile.name}
                  </h1>
                )}

                {profile.isAdmin && (
                  <span className="mt-1 badge badge-transferred text-[10px]">
                    <Shield className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
              </div>

              {/* Profile details */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                  <span className="text-sm text-zinc-400 truncate">{profile.email}</span>
                </div>
                {profile.college && (
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <span className="text-sm text-zinc-400 leading-tight">{profile.college}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                  <span className="text-sm text-zinc-500">Joined {formatDate(profile.createdAt)}</span>
                </div>
                {editing && (
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="input-base text-sm"
                      id="edit-phone"
                    />
                  </div>
                )}
              </div>

              {/* Edit / Save */}
              {editing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-all disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditName(profile.name); }}
                    className="flex-1 py-2 px-3 rounded-lg border border-[#2a2a2a] text-zinc-400 text-xs hover:border-zinc-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#1f1f1f] text-zinc-400 text-xs hover:border-zinc-600 hover:text-zinc-200 transition-all"
                  id="edit-profile-btn"
                >
                  <Edit3 className="w-3 h-3" />
                  {saved ? "Saved!" : "Edit Profile"}
                </button>
              )}
            </div>

            {/* Trust Score */}
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-5">
              <div className="mono-tag mb-4">Trust Score</div>
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-3">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60" cy="60" r={radius}
                      fill="none" stroke="#1f1f1f" strokeWidth="8"
                    />
                    <circle
                      cx="60" cy="60" r={radius}
                      fill="none" stroke="#10b981" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{Math.round(profile.trustScore)}</span>
                    <span className="text-xs text-zinc-600">/ 100</span>
                  </div>
                </div>
                <span className={`text-sm font-medium ${trustInfo.color}`}>{trustInfo.label}</span>
                <p className="text-xs text-zinc-600 text-center mt-2 leading-relaxed">
                  Score improves with verified invoices, transparent repairs, and successful transfers.
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
              <div className="mono-tag">Activity</div>
              {[
                { label: "Products Owned", value: profile._count.ownedProducts, icon: Package, color: "text-emerald-400" },
                { label: "Active Listings", value: activeListings.length, icon: TrendingUp, color: "text-blue-400" },
                { label: "Sold Items", value: soldListings.length, icon: Activity, color: "text-violet-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    <span className="text-xs text-zinc-500">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — products & listings */}
          <div className="space-y-6">
            {/* Owned Products */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="mono-tag">Owned Products ({profile.ownedProducts.length})</div>
                <Link href="/dashboard" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                  Manage →
                </Link>
              </div>

              {profile.ownedProducts.length === 0 ? (
                <div className="bg-[#0f0f0f] border border-dashed border-[#2a2a2a] rounded-xl p-8 text-center">
                  <QrCode className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-600 text-sm">No products yet. Scan a QR to activate.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {profile.ownedProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/passport/${product.dppId}`}
                      className="group block bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-4 card-hover"
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-xl">{getCategoryIcon(product.category)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-200 truncate">
                            {product.brand} {product.model}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-600">{product.dppId}</div>
                        </div>
                        <span className={`badge text-[9px] ${
                          product.status === "ACTIVE" ? "badge-active" :
                          product.status === "LISTED" ? "badge-listed" : "badge-unclaimed"
                        }`}>
                          {product.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-700 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Activated {product.activatedAt ? formatDate(product.activatedAt) : "—"}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Marketplace Listings */}
            <div>
              <div className="mono-tag mb-4">Marketplace Listings ({profile.sellerListings.length})</div>
              {profile.sellerListings.length === 0 ? (
                <div className="bg-[#0f0f0f] border border-dashed border-[#2a2a2a] rounded-xl p-8 text-center">
                  <TrendingUp className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-600 text-sm">No listings yet.</p>
                </div>
              ) : (
                <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl overflow-hidden">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Listed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.sellerListings.map((listing) => (
                        <tr key={listing.id}>
                          <td>
                            <Link
                              href={`/passport/${listing.product.dppId}`}
                              className="text-sm text-zinc-200 hover:text-emerald-400 transition-colors"
                            >
                              {listing.product.brand} {listing.product.model}
                            </Link>
                            <div className="font-mono text-[10px] text-zinc-600">{listing.product.dppId}</div>
                          </td>
                          <td className="text-sm font-medium text-white">{formatCurrency(listing.askingPrice)}</td>
                          <td>
                            <span className={`badge text-[10px] ${
                              listing.listingStatus === "ACTIVE" ? "badge-active" :
                              listing.listingStatus === "SOLD" ? "badge-transferred" : "badge-unclaimed"
                            }`}>
                              {listing.listingStatus}
                            </span>
                          </td>
                          <td className="text-xs text-zinc-600">{formatDate(listing.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
