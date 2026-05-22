"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  QrCode,
  Package,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { formatDate, formatCurrency, getCategoryIcon } from "@/lib/utils";

interface Product {
  id: string;
  dppId: string;
  category: string;
  brand?: string;
  model?: string;
  status: string;
  conditionScore: number;
}

interface RepairLog {
  id: string;
  repairType: string;
  repairShop?: string;
  repairNotes?: string;
  repairCost?: number;
  createdAt: string;
  isVerified: boolean;
  product: { dppId: string; brand?: string; model?: string; category: string };
}

const REPAIR_TYPES = [
  "BATTERY",
  "SCREEN",
  "HARDWARE",
  "SOFTWARE",
  "COSMETIC",
  "WATER_DAMAGE",
  "OTHER",
];

export default function RepairsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [repairs, setRepairs] = useState<RepairLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedDppId, setSelectedDppId] = useState("");
  const [repairType, setRepairType] = useState("HARDWARE");
  const [repairShop, setRepairShop] = useState("");
  const [repairNotes, setRepairNotes] = useState("");
  const [repairCost, setRepairCost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/sign-in");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    async function fetchData() {
      const [productsRes, repairsRes] = await Promise.all([
        fetch("/api/user/products"),
        fetch("/api/repairs/log"),
      ]);
      if (productsRes.ok) {
        const d = await productsRes.json();
        setProducts(d.products.filter((p: Product) => p.status !== "UNCLAIMED"));
      }
      if (repairsRes.ok) {
        const d = await repairsRes.json();
        setRepairs(d.repairs ?? []);
      }
      setLoading(false);
    }
    fetchData();
  }, [session]);

  const handleLogRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDppId) { setFormError("Please select a product"); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/repairs/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dppId: selectedDppId,
          repairType,
          repairShop,
          repairNotes,
          repairCost: repairCost ? parseFloat(repairCost) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRepairs((prev) => [{ ...data.repair, product: products.find(p => p.dppId === selectedDppId) ?? {} as Product }, ...prev]);
      setSuccess(true);
      setShowForm(false);
      setRepairType("HARDWARE");
      setRepairShop("");
      setRepairNotes("");
      setRepairCost("");
      setSelectedDppId("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to log repair");
    } finally {
      setSubmitting(false);
    }
  };

  const repairTypeColors: Record<string, string> = {
    HARDWARE: "border-orange-500 bg-orange-500/10 text-orange-400",
    SOFTWARE: "border-blue-500 bg-blue-500/10 text-blue-400",
    COSMETIC: "border-zinc-500 bg-zinc-500/10 text-zinc-400",
    BATTERY: "border-yellow-500 bg-yellow-500/10 text-yellow-400",
    SCREEN: "border-red-500 bg-red-500/10 text-red-400",
    WATER_DAMAGE: "border-red-600 bg-red-600/10 text-red-500",
    OTHER: "border-zinc-400 bg-zinc-400/10 text-zinc-400",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="mono-tag text-emerald-400 mb-1">Repair Logs</div>
            <h1 className="text-2xl font-semibold text-white">Service History</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Logging repairs builds trust and increases your product&apos;s DPP score.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-sm hover:bg-emerald-500/15 transition-all"
            id="log-repair-btn"
          >
            <Plus className="w-4 h-4" />
            Log Repair
          </button>
        </div>

        {/* Success toast */}
        {success && (
          <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Repair logged successfully — DPP updated.
          </div>
        )}

        {/* Log Repair Form */}
        {showForm && (
          <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-6 mb-6 animate-fade-in">
            <h2 className="text-white font-semibold mb-4">Log a New Repair</h2>
            <form onSubmit={handleLogRepair} className="space-y-4">
              {/* Product selector */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Product *
                </label>
                <div className="relative">
                  <select
                    value={selectedDppId}
                    onChange={(e) => setSelectedDppId(e.target.value)}
                    className="input-base appearance-none pr-8"
                    required
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.dppId}>
                        {getCategoryIcon(p.category)} {p.brand} {p.model} — {p.dppId}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
                {products.length === 0 && (
                  <p className="text-xs text-zinc-600 mt-1">
                    No active products.{" "}
                    <Link href="/dashboard" className="text-emerald-400">
                      Activate a product first.
                    </Link>
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Repair type */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Repair Type *
                  </label>
                  <div className="relative">
                    <select
                      value={repairType}
                      onChange={(e) => setRepairType(e.target.value)}
                      className="input-base appearance-none pr-8"
                    >
                      {REPAIR_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                {/* Repair cost */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={repairCost}
                    onChange={(e) => setRepairCost(e.target.value)}
                    placeholder="e.g. 2500"
                    min="0"
                    className="input-base"
                  />
                </div>
              </div>

              {/* Repair shop */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Repair Shop / Technician
                </label>
                <input
                  type="text"
                  value={repairShop}
                  onChange={(e) => setRepairShop(e.target.value)}
                  placeholder="e.g. Apple Authorized Service, TechFix Delhi"
                  className="input-base"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Description / Notes
                </label>
                <textarea
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  placeholder="What was repaired? Any relevant details..."
                  rows={3}
                  className="input-base resize-none"
                />
              </div>

              {/* Trust score impact notice */}
              <div className="flex items-start gap-2 p-3 bg-emerald-500/4 border border-emerald-500/10 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Logging repairs transparently increases your product&apos;s{" "}
                  <span className="text-emerald-400">trust score</span> — buyers value honesty about service history.
                </p>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || products.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4" />
                  )}
                  Save Repair Log
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#2a2a2a] text-zinc-400 text-sm hover:border-zinc-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Repair history */}
        {repairs.length === 0 && !showForm ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#1f1f1f] flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-zinc-700" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-400 mb-2">No repairs logged yet</h2>
            <p className="text-zinc-600 text-sm mb-6">
              Every service you log builds credibility when reselling.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Log Your First Repair
            </button>
          </div>
        ) : repairs.length > 0 ? (
          <div className="space-y-3">
            <div className="mono-tag mb-2">
              {repairs.length} Repair{repairs.length !== 1 ? "s" : ""} Logged
            </div>
            {repairs.map((repair) => (
              <div
                key={repair.id}
                className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                        repairTypeColors[repair.repairType] ?? repairTypeColors.OTHER
                      }`}
                    >
                      {repair.repairType.replace("_", " ")}
                    </div>
                    {repair.isVerified && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                  </div>
                  {repair.repairCost != null && (
                    <span className="text-sm font-semibold text-white">
                      {formatCurrency(repair.repairCost)}
                    </span>
                  )}
                </div>

                {/* Product reference */}
                {repair.product && (
                  <Link
                    href={`/passport/${repair.product.dppId}`}
                    className="flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity"
                  >
                    <span className="text-sm">{getCategoryIcon(repair.product.category)}</span>
                    <span className="text-sm font-medium text-zinc-300">
                      {repair.product.brand} {repair.product.model}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-600">
                      {repair.product.dppId}
                    </span>
                    <QrCode className="w-3 h-3 text-zinc-700 ml-auto" />
                  </Link>
                )}

                {repair.repairShop && (
                  <p className="text-sm text-zinc-500 mb-1.5">
                    <span className="text-zinc-600">At</span> {repair.repairShop}
                  </p>
                )}
                {repair.repairNotes && (
                  <p className="text-sm text-zinc-500 leading-relaxed mb-2">
                    {repair.repairNotes}
                  </p>
                )}

                <div className="flex items-center gap-1 text-[10px] text-zinc-700">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDate(repair.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
