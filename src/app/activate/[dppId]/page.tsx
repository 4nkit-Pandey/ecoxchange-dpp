"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  QrCode,
  Upload,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Shield,
  AlertCircle,
  Package,
  Calendar,
  User,
  Building2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Product {
  id: string;
  dppId: string;
  status: string;
  category: string;
  brand?: string;
  model?: string;
  qrCodeUrl?: string;
  currentOwner?: { name: string } | null;
}

export default function ActivatePage({
  params,
}: {
  params: Promise<{ dppId: string }>;
}) {
  const { dppId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  const [purchaseDate, setPurchaseDate] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/activate?dppId=${dppId}`);
        if (res.status === 404) { setNotFound(true); setLoading(false); return; }
        const data = await res.json();
        setProduct(data.product);
        if (data.product.status !== "UNCLAIMED") setAlreadyClaimed(true);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [dppId]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) { router.push(`/sign-in?callbackUrl=/activate/${dppId}`); return; }
    setSubmitting(true);
    setError("");

    try {
      let invoiceUrl = "";
      // In production: upload invoiceFile to Supabase Storage first
      // For MVP: we just pass the filename as placeholder
      if (invoiceFile) invoiceUrl = `invoice_${Date.now()}_${invoiceFile.name}`;

      const res = await fetch("/api/products/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dppId, purchaseDate, invoiceUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => router.push(`/passport/${dppId}`), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      LAPTOP: "Laptop",
      PHONE: "Smartphone",
      GAMING_CONSOLE: "Gaming Console",
      CYCLE: "Bicycle",
      APPLIANCE: "Appliance",
      ACADEMIC_EQUIPMENT: "Academic Equipment",
      OTHER: "Product",
    };
    return map[cat] ?? cat;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-zinc-500 text-sm">Loading product...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Product Not Found</h1>
          <p className="text-zinc-500 text-sm mb-6">
            The DPP-ID <span className="font-mono text-zinc-300">{dppId}</span> doesn&apos;t match any product in our system.
          </p>
          <Link href="/" className="btn-secondary">Go Home</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Product Activated!</h1>
          <p className="text-zinc-500 text-sm mb-2">
            Your digital product passport is now live.
          </p>
          <div className="font-mono text-xs text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-lg px-3 py-2 inline-block mb-4">
            {dppId}
          </div>
          <p className="text-zinc-600 text-xs">Redirecting to your passport...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dot-grid py-12 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-emerald-500/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold">Eco<span className="text-emerald-400">X</span>change</span>
          </Link>

          {alreadyClaimed ? (
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/8 border border-blue-500/15 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">Already Activated</h1>
              <p className="text-zinc-500 text-sm">
                This product has an active digital passport.
              </p>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/8 border border-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">Activate Your Product</h1>
              <p className="text-zinc-500 text-sm">
                Register ownership and create your digital product passport
              </p>
            </div>
          )}
        </div>

        {/* Product Info Card */}
        {product && (
          <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-5 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="mono-tag mb-1">Product Detected</div>
                <h2 className="text-white font-semibold">
                  {product.brand && product.model
                    ? `${product.brand} ${product.model}`
                    : getCategoryLabel(product.category)}
                </h2>
                <div className="text-zinc-500 text-sm">{getCategoryLabel(product.category)}</div>
              </div>
              <div className={`badge ${product.status === "UNCLAIMED" ? "badge-unclaimed" : "badge-active"}`}>
                <div className="w-1 h-1 rounded-full bg-current" />
                {product.status === "UNCLAIMED" ? "Unclaimed" : product.status}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
              <div className="mono-tag">DPP-ID</div>
              <div className="font-mono text-sm text-emerald-400 mt-1">{dppId}</div>
            </div>
          </div>
        )}

        {/* Already claimed redirect */}
        {alreadyClaimed && (
          <div className="text-center">
            <p className="text-zinc-500 text-sm mb-4">
              Current owner: <span className="text-zinc-300">{product?.currentOwner?.name ?? "—"}</span>
            </p>
            <Link
              href={`/passport/${dppId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-sm hover:bg-emerald-500/15 transition-all"
            >
              View Digital Passport
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Activation Form */}
        {!alreadyClaimed && (
          <>
            {!session && status !== "loading" && (
              <div className="bg-amber-500/6 border border-amber-500/15 rounded-xl p-4 mb-5 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 text-sm font-medium">Sign in required</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    You need an account to activate this product.{" "}
                    <Link href={`/sign-in?callbackUrl=/activate/${dppId}`} className="text-emerald-400 underline">
                      Sign in
                    </Link>{" "}
                    or{" "}
                    <Link href={`/sign-up?callbackUrl=/activate/${dppId}`} className="text-emerald-400 underline">
                      create account
                    </Link>
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleActivate} className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-6 space-y-5">
              <h3 className="text-white font-semibold text-[15px]">Activation Details</h3>

              {/* Owner info (from session) */}
              {session?.user && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[#141414] border border-[#1f1f1f] rounded-xl">
                    <User className="w-4 h-4 text-zinc-500" />
                    <div>
                      <div className="text-xs text-zinc-500">Registering as</div>
                      <div className="text-sm text-zinc-200">{session.user.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[#141414] border border-[#1f1f1f] rounded-xl">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    <div>
                      <div className="text-xs text-zinc-500">Email</div>
                      <div className="text-sm text-zinc-200">{session.user.email}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase Date */}
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="input-base"
                  id="purchase-date"
                />
              </div>

              {/* Invoice Upload */}
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
                  <Upload className="w-3.5 h-3.5" />
                  Invoice / Receipt <span className="text-zinc-600 font-normal">(Optional — increases trust score)</span>
                </label>
                <label
                  htmlFor="invoice-upload"
                  className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                    invoiceFile
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#141414]"
                  }`}
                >
                  {invoiceFile ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span className="text-sm text-emerald-400">{invoiceFile.name}</span>
                      <span className="text-xs text-zinc-600">
                        {(invoiceFile.size / 1024).toFixed(1)} KB
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-zinc-600" />
                      <span className="text-sm text-zinc-400">Drop invoice here or click to upload</span>
                      <span className="text-xs text-zinc-600">PDF, JPG, PNG up to 10MB</span>
                    </>
                  )}
                  <input
                    id="invoice-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {/* Product info items */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Package className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-500">
                    By activating, you confirm ownership of this product. The QR code will link to your digital passport permanently.
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !session}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 text-black font-semibold text-[14px] hover:bg-emerald-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                id="activate-btn"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Activate Product & Create Passport
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
