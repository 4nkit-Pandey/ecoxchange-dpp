"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  QrCode,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Shield,
  Package,
} from "lucide-react";
import { formatCurrency, getConditionLabel, getCategoryIcon } from "@/lib/utils";

interface Product {
  id: string;
  dppId: string;
  category: string;
  brand?: string;
  model?: string;
  status: string;
  conditionScore: number;
  trustScore: number;
  currentOwner?: { name: string; college?: string };
  listings?: Array<{ id: string; askingPrice: number }>;
}

export default function TransferPage({ params }: { params: Promise<{ dppId: string }> }) {
  const { dppId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push(`/sign-in?callbackUrl=/transfer/${dppId}`);
  }, [status, dppId, router]);

  useEffect(() => {
    async function fetchProduct() {
      const res = await fetch(`/api/products/${dppId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
      }
      setLoading(false);
    }
    fetchProduct();
  }, [dppId]);

  const handleRequestTransfer = async () => {
    if (!session?.user?.id) return;
    setTransferring(true);
    setError("");
    try {
      const listing = product?.listings?.[0];
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dppId,
          listingId: listing?.id,
          offeredPrice: listing?.askingPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Product Not Found</h1>
          <Link href="/marketplace" className="btn-secondary">Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  const isOwner = session?.user?.id === (product.currentOwner as { id?: string })?.id;
  const listing = product.listings?.[0];
  const conditionInfo = getConditionLabel(product.conditionScore);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Transfer Requested!</h1>
          <p className="text-zinc-500 text-sm mb-4">
            The seller will be notified. Once they confirm, ownership will transfer to you.
          </p>
          <p className="text-zinc-600 text-xs mb-6">
            The product DPP-ID will remain the same — your ownership will be appended to its history.
          </p>
          <Link href={`/passport/${dppId}`} className="btn-primary">
            View Passport
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dot-grid py-12 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-blue-500/3 rounded-full blur-[100px]" />
      </div>
      <div className="relative max-w-md mx-auto">
        {/* Header */}
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center">
          <QrCode className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">Eco<span className="text-emerald-400">X</span>change</span>
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-white mb-1">Request Ownership Transfer</h1>
          <p className="text-zinc-500 text-sm">
            The seller will confirm the transfer after your meetup
          </p>
        </div>

        {/* Product card */}
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-5 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">{getCategoryIcon(product.category)}</span>
            <div className="flex-1">
              <h2 className="text-white font-semibold">
                {product.brand} {product.model}
              </h2>
              <div className="font-mono text-[10px] text-zinc-600 mt-0.5">{dppId}</div>
            </div>
            <div className={`badge ${product.status === "LISTED" ? "badge-listed" : "badge-active"}`}>
              {product.status}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#141414] rounded-lg p-2.5 text-center">
              <div className="text-sm font-semibold text-white">{Math.round(product.trustScore)}</div>
              <div className="text-[10px] text-zinc-600">Trust</div>
            </div>
            <div className="bg-[#141414] rounded-lg p-2.5 text-center">
              <div className={`text-[11px] font-semibold ${conditionInfo.color}`}>{conditionInfo.label}</div>
              <div className="text-[10px] text-zinc-600">Condition</div>
            </div>
            <div className="bg-[#141414] rounded-lg p-2.5 text-center">
              <div className="text-sm font-semibold text-white">{listing ? formatCurrency(listing.askingPrice) : "—"}</div>
              <div className="text-[10px] text-zinc-600">Price</div>
            </div>
          </div>
        </div>

        {/* Seller info */}
        {product.currentOwner && (
          <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-4 mb-4">
            <div className="mono-tag mb-2">Current Owner / Seller</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                <User className="w-4 h-4 text-zinc-500" />
              </div>
              <div>
                <div className="text-sm text-zinc-200">{product.currentOwner.name}</div>
                {product.currentOwner.college && (
                  <div className="text-xs text-zinc-600">{product.currentOwner.college}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transfer flow explanation */}
        <div className="bg-blue-500/4 border border-blue-500/15 rounded-xl p-4 mb-5">
          <div className="mono-tag text-blue-400 mb-2">How Transfer Works</div>
          <div className="space-y-2">
            {[
              "You request the transfer (this step)",
              "Meet with the seller in person",
              "Seller scans the QR and confirms",
              "Ownership updates on the passport",
            ].map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400">
                <div className="w-4 h-4 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-[9px] text-blue-400 font-bold">
                  {idx + 1}
                </div>
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Safety notice */}
        <div className="flex items-start gap-2 mb-5">
          <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-600">
            The product DPP will never reset. Your ownership will be permanently appended to the product&apos;s history.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {isOwner ? (
          <div className="p-4 bg-amber-500/6 border border-amber-500/15 rounded-xl text-amber-400 text-sm text-center">
            You already own this product
          </div>
        ) : product.status !== "LISTED" ? (
          <div className="p-4 bg-zinc-800/40 border border-[#1f1f1f] rounded-xl text-zinc-500 text-sm text-center">
            This product is not listed for sale
          </div>
        ) : (
          <button
            onClick={handleRequestTransfer}
            disabled={transferring || !session}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-500 text-white font-semibold text-[14px] hover:bg-blue-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            id="request-transfer-btn"
          >
            {transferring ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Request Ownership Transfer
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}

        <div className="mt-4 text-center">
          <Link href={`/passport/${dppId}`} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            View full product passport first →
          </Link>
        </div>
      </div>
    </div>
  );
}
