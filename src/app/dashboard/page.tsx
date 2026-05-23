"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  QrCode,
  Package,
  ShoppingBag,
  Clock,
  Plus,
  Star,
  Wrench,
  Shield,
  Loader2,
  ExternalLink,
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import {
  formatDate,
  formatCurrency,
  getConditionLabel,
  getTrustLabel,
  getCategoryIcon,
} from "@/lib/utils";

interface Product {
  id: string;
  dppId: string;
  category: string;
  brand?: string;
  model?: string;
  status: string;
  conditionScore: number;
  trustScore: number;
  isVerified: boolean;
  qrCodeUrl?: string;
  activatedAt?: string;
  _count?: { ownershipHistory: number; repairLogs: number };
  listings?: { askingPrice: number }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/sign-in");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    async function fetchProducts() {
      try {
        const res = await fetch("/api/user/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const activeCount = products.filter((p) => p.status === "ACTIVE").length;
  const listedCount = products.filter((p) => p.status === "LISTED").length;

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">
              Welcome back, {session?.user?.name?.split(" ")[0]}
            </h1>
            <p className="text-zinc-500 text-sm">
              Manage your digital product passports
            </p>
          </div>
          <Link
            href="/admin/products"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#2a2a2a] text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Scan / Add Product
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Owned Products", value: products.length, icon: Package, color: "text-emerald-400" },
            { label: "Active", value: activeCount, icon: Shield, color: "text-emerald-400" },
            { label: "Listed", value: listedCount, icon: ShoppingBag, color: "text-blue-400" },
            {
              label: "Trust Score",
              value: `${Math.round((session?.user as { trustScore?: number })?.trustScore ?? 50)}/100`,
              icon: Star,
              color: "text-amber-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="mono-tag">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Products grid */}
        {products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#1f1f1f] flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-zinc-700" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-400 mb-2">
              No products yet
            </h2>
            <p className="text-zinc-600 text-sm mb-6">
              Scan a QR code on your product to activate it
            </p>
            <div className="font-mono text-xs text-zinc-600 bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg px-4 py-2 inline-block">
              Scan: ecoxchange.in/activate/[DPP-ID]
            </div>
          </div>
        ) : (
          <div>
            <div className="mono-tag mb-4">Your Products ({products.length})</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const conditionInfo = getConditionLabel(product.conditionScore);
                return (
                  <div
                    key={product.id}
                    className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-5 card-hover group"
                  >
                    {/* Product header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{getCategoryIcon(product.category)}</span>
                        <div>
                          <div className="text-sm font-semibold text-white leading-tight">
                            {product.brand && product.model
                              ? `${product.brand} ${product.model}`
                              : product.category}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`badge ${
                          product.status === "ACTIVE"
                            ? "badge-active"
                            : product.status === "LISTED"
                            ? "badge-listed"
                            : "badge-unclaimed"
                        }`}
                      >
                        <div className="w-1 h-1 rounded-full bg-current" />
                        {product.status}
                      </span>
                    </div>

                    {/* DPP ID */}
                    <div className="font-mono text-[10px] text-zinc-600 mb-3">
                      {product.dppId}
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-white">
                          {Math.round(product.trustScore)}
                        </div>
                        <div className="text-[10px] text-zinc-600">Trust</div>
                      </div>
                      <div className="text-center border-x border-[#1f1f1f]">
                        <div className={`text-sm font-semibold ${conditionInfo.color}`}>
                          {conditionInfo.label}
                        </div>
                        <div className="text-[10px] text-zinc-600">Condition</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-white">
                          {product._count?.repairLogs ?? 0}
                        </div>
                        <div className="text-[10px] text-zinc-600">Repairs</div>
                      </div>
                    </div>

                    {/* Listed price */}
                    {product.status === "LISTED" && product.listings?.[0] && (
                      <div className="mb-3 text-center py-2 bg-blue-500/6 border border-blue-500/15 rounded-lg">
                        <span className="text-blue-400 text-sm font-semibold">
                          {formatCurrency(product.listings[0].askingPrice)}
                        </span>
                        <span className="text-zinc-600 text-xs ml-1">listed</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/passport/${product.dppId}`}
                        className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-[#141414] border border-[#1f1f1f] text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-all"
                      >
                        <QrCode className="w-3 h-3" />
                        Passport
                      </Link>
                      {product.status === "ACTIVE" && (
                        <SellButton dppId={product.dppId} />
                      )}
                    </div>

                    <div className="mt-2 text-[10px] text-zinc-700 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Activated {formatDate(product.activatedAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SellButton({ dppId }: { dppId: string }) {
  const [loading, setLoading] = useState(false);
  const CAMPUSKARTT_URL =
    process.env.NEXT_PUBLIC_CAMPUSKARTT_URL ?? "https://www.campuskartt.in";

  const handleSell = async () => {
    setLoading(true);
    try {
      // Get a CampusKartt session for the current EcoXchange user (SSO)
      const res = await fetch("/api/auth/campuskartt-sso", { method: "POST" });
      const data = await res.json();

      let sellUrl = `${CAMPUSKARTT_URL}/app/post.html`;

      if (data.accessToken) {
        // Pass session tokens in URL hash (never sent to server — browser only)
        // CampusKartt will call supabaseClient.auth.setSession() to auto-login
        const hash = [
          `eco_access_token=${encodeURIComponent(data.accessToken)}`,
          `eco_refresh_token=${encodeURIComponent(data.refreshToken)}`,
          `source=ecoxchange`,
          `dppId=${encodeURIComponent(dppId)}`,
        ].join("&");
        sellUrl += `?source=ecoxchange&dppId=${encodeURIComponent(dppId)}#${hash}`;
      } else {
        // SSO failed (e.g. email confirmation required) — open CampusKartt login page
        // with return URL so they come back to post after logging in
        const returnUrl = encodeURIComponent(
          `${CAMPUSKARTT_URL}/app/post.html?source=ecoxchange&dppId=${encodeURIComponent(dppId)}`
        );
        sellUrl = `${CAMPUSKARTT_URL}/app/login.html?returnUrl=${returnUrl}`;
      }

      window.open(sellUrl, "_blank", "noopener,noreferrer");
    } catch {
      // Network error — just open CampusKartt sell page normally
      window.open(
        `${CAMPUSKARTT_URL}/app/post.html?source=ecoxchange`,
        "_blank",
        "noopener,noreferrer"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSell}
      disabled={loading}
      className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-orange-500/8 border border-orange-500/15 text-xs text-orange-400 hover:bg-orange-500/12 hover:border-orange-500/25 transition-all disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <>
          <ShoppingBag className="w-3 h-3" />
          Sell
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </>
      )}
    </button>
  );
}


