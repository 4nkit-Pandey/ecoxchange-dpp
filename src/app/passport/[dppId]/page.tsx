"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  QrCode,
  Shield,
  User,
  Wrench,
  FileText,
  ArrowRight,
  Download,
  Share2,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
  Star,
  Activity,
} from "lucide-react";
import {
  formatDate,
  formatCurrency,
  getTrustLabel,
  getConditionLabel,
  getStatusColor,
  getCategoryIcon,
  cn,
} from "@/lib/utils";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface Owner {
  id: string;
  name: string;
  college?: string;
  trustScore: number;
  createdAt: string;
}

interface OwnershipRecord {
  id: string;
  previousOwnerId?: string;
  newOwner: { name: string; college?: string };
  transferType: string;
  transferDate: string;
  notes?: string;
}

interface RepairLog {
  id: string;
  repairType: string;
  repairShop?: string;
  repairNotes?: string;
  repairCost?: number;
  createdAt: string;
  loggedBy: { name: string };
  isVerified: boolean;
}

interface Document {
  id: string;
  documentType: string;
  documentUrl: string;
  fileName?: string;
  uploadedAt: string;
  isVerified: boolean;
}

interface Listing {
  id: string;
  askingPrice: number;
  description?: string;
  seller: { name: string; trustScore: number };
}

interface Product {
  id: string;
  dppId: string;
  category: string;
  brand?: string;
  model?: string;
  color?: string;
  yearOfPurchase?: number;
  status: string;
  conditionScore: number;
  trustScore: number;
  isVerified: boolean;
  isFlagged: boolean;
  qrCodeUrl?: string;
  qrCodeSvg?: string;
  activatedAt?: string;
  currentOwner?: Owner | null;
  ownershipHistory: OwnershipRecord[];
  repairLogs: RepairLog[];
  documents: Document[];
  listings: Listing[];
}

// ─────────────────────────────────────────────
// SCORE RING
// ─────────────────────────────────────────────
function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#1f1f1f" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{Math.round(score)}</span>
        </div>
      </div>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// QR CODE DOWNLOAD
// ─────────────────────────────────────────────
function QrDownload({ product }: { product: Product }) {
  const downloadQr = (format: "png" | "svg") => {
    if (format === "png" && product.qrCodeUrl) {
      const a = document.createElement("a");
      a.href = product.qrCodeUrl;
      a.download = `ecoxchange-qr-${product.dppId}.png`;
      a.click();
    } else if (format === "svg" && product.qrCodeSvg) {
      const blob = new Blob([product.qrCodeSvg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ecoxchange-qr-${product.dppId}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-5">
      <div className="mono-tag mb-3">QR Code</div>
      <div className="flex items-center justify-center bg-white rounded-xl p-4 mb-4">
        {product.qrCodeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.qrCodeUrl} alt="QR Code" className="w-32 h-32" />
        ) : (
          <div className="w-32 h-32 flex items-center justify-center">
            <QrCode className="w-16 h-16 text-zinc-200" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => downloadQr("png")}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#1f1f1f] text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 text-xs font-medium transition-all"
          id="download-qr-png"
          disabled={!product.qrCodeUrl}
        >
          <Download className="w-3 h-3" />
          PNG
        </button>
        <button
          onClick={() => downloadQr("svg")}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#1f1f1f] text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 text-xs font-medium transition-all"
          id="download-qr-svg"
          disabled={!product.qrCodeSvg}
        >
          <Download className="w-3 h-3" />
          SVG
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OWNERSHIP TIMELINE
// ─────────────────────────────────────────────
function OwnershipTimeline({ history }: { history: OwnershipRecord[] }) {
  const chronological = [...history].reverse();

  return (
    <div className="space-y-0">
      {chronological.map((record, idx) => (
        <div key={record.id} className="flex gap-3 pb-6 relative">
          {idx < chronological.length - 1 && (
            <div className="absolute left-[7px] top-[18px] bottom-0 w-px bg-[#1f1f1f]" />
          )}
          <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5 z-10 ${
            record.transferType === "ACTIVATION"
              ? "border-emerald-500 bg-emerald-500/20"
              : record.transferType === "SALE"
              ? "border-blue-500 bg-blue-500/20"
              : "border-violet-500 bg-violet-500/20"
          }`} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-zinc-200">
              {record.transferType === "ACTIVATION" ? "Activated by" : "Transferred to"}{" "}
              <span className="text-white">{record.newOwner.name}</span>
            </div>
            {record.newOwner.college && (
              <div className="text-xs text-zinc-500 mt-0.5">{record.newOwner.college}</div>
            )}
            <div className="text-xs text-zinc-600 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(record.transferDate)}
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#1a1a1a] border border-[#242424] text-[10px]">
                {record.transferType}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// REPAIR LOG TIMELINE
// ─────────────────────────────────────────────
function RepairTimeline({ repairs }: { repairs: RepairLog[] }) {
  const repairColors: Record<string, string> = {
    HARDWARE: "border-orange-500 bg-orange-500/20",
    SOFTWARE: "border-blue-500 bg-blue-500/20",
    COSMETIC: "border-zinc-500 bg-zinc-500/20",
    BATTERY: "border-yellow-500 bg-yellow-500/20",
    SCREEN: "border-red-500 bg-red-500/20",
    WATER_DAMAGE: "border-red-600 bg-red-600/20",
    OTHER: "border-zinc-400 bg-zinc-400/20",
  };

  if (repairs.length === 0) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
        <p className="text-zinc-600 text-sm">No repairs logged</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {repairs.map((repair) => (
        <div key={repair.id} className="flex gap-3">
          <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-1 ${repairColors[repair.repairType] ?? repairColors.OTHER}`} />
          <div className="flex-1 bg-[#141414] border border-[#1f1f1f] rounded-xl p-3">
            <div className="flex items-start justify-between mb-1">
              <span className="text-sm font-medium text-zinc-200">{repair.repairType.replace("_", " ")}</span>
              {repair.repairCost && (
                <span className="text-xs font-medium text-zinc-300">{formatCurrency(repair.repairCost)}</span>
              )}
            </div>
            {repair.repairShop && (
              <div className="text-xs text-zinc-500 mb-1">{repair.repairShop}</div>
            )}
            {repair.repairNotes && (
              <div className="text-xs text-zinc-500 mb-1">{repair.repairNotes}</div>
            )}
            <div className="text-xs text-zinc-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(repair.createdAt)} · by {repair.loggedBy.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PASSPORT PAGE
// ─────────────────────────────────────────────
export default function PassportPage({ params }: { params: Promise<{ dppId: string }> }) {
  const { dppId } = use(params);
  const { data: session } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "repairs" | "documents">("overview");

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${dppId}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [dppId]);

  const isOwner = session?.user?.id && product?.currentOwner?.id === session.user.id;

  const sharePassport = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => alert("Passport URL copied!"));
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
          <AlertTriangle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Passport Not Found</h1>
          <p className="text-zinc-500 text-sm mb-4">No product registered with ID: {dppId}</p>
          <Link href="/" className="btn-secondary">Go Home</Link>
        </div>
      </div>
    );
  }

  const trustInfo = getTrustLabel(product.trustScore);
  const conditionInfo = getConditionLabel(product.conditionScore);

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "history", label: `Ownership (${product.ownershipHistory.length})`, icon: User },
    { id: "repairs", label: `Repairs (${product.repairLogs.length})`, icon: Wrench },
    { id: "documents", label: `Docs (${product.documents.length})`, icon: FileText },
  ] as const;

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Top nav */}
      <div className="border-b border-[#141414] sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">Eco<span className="text-emerald-400">X</span>change</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={sharePassport}
              className="btn-ghost text-xs"
              id="share-passport"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            {isOwner && (
              <Link href={`/dashboard`} className="btn-secondary text-xs py-1.5 px-3">
                Manage
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Main content */}
          <div className="space-y-6">
            {/* Product header */}
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getCategoryIcon(product.category)}</div>
                  <div>
                    <h1 className="text-xl font-semibold text-white">
                      {product.brand && product.model
                        ? `${product.brand} ${product.model}`
                        : product.category}
                    </h1>
                    <div className="text-zinc-500 text-sm">
                      {product.color && `${product.color} · `}
                      {product.yearOfPurchase && `Purchased ${product.yearOfPurchase}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {product.isFlagged && (
                    <span className="badge badge-retired">
                      <AlertTriangle className="w-3 h-3" />
                      Flagged
                    </span>
                  )}
                  {product.isVerified && (
                    <span className="badge badge-active">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                  <span className={`badge ${
                    product.status === "ACTIVE" ? "badge-active" :
                    product.status === "LISTED" ? "badge-listed" :
                    product.status === "TRANSFERRED" ? "badge-transferred" :
                    "badge-unclaimed"
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    {product.status}
                  </span>
                </div>
              </div>

              {/* DPP-ID */}
              <div className="flex items-center gap-2 bg-[#141414] border border-[#1f1f1f] rounded-xl px-4 py-2.5 mb-5">
                <QrCode className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="mono-tag text-[10px] mb-0.5">Digital Product Passport ID</div>
                  <div className="font-mono text-sm text-emerald-400">{product.dppId}</div>
                </div>
              </div>

              {/* Scores */}
              <div className="flex items-center justify-around py-4 border-t border-[#1f1f1f]">
                <ScoreRing score={product.trustScore} label="Trust Score" color="#10b981" />
                <div className="w-px h-12 bg-[#1f1f1f]" />
                <ScoreRing score={product.conditionScore} label="Condition" color="#3b82f6" />
                <div className="w-px h-12 bg-[#1f1f1f]" />
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-20 h-20 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{product.ownershipHistory.length}</div>
                      <div className="text-xs text-zinc-500">Owner{product.ownershipHistory.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">Ownership</span>
                </div>
              </div>

              {/* Trust + Condition labels */}
              <div className="flex gap-2 mt-2">
                <div className="flex-1 text-center">
                  <span className={`text-xs font-medium ${trustInfo.color}`}>{trustInfo.label}</span>
                </div>
                <div className="flex-1 text-center">
                  <span className={`text-xs font-medium ${conditionInfo.color}`}>{conditionInfo.label}</span>
                </div>
              </div>
            </div>

            {/* Active Listing Banner */}
            {product.listings.length > 0 && product.status === "LISTED" && (
              <div className="bg-blue-500/6 border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium text-sm">Listed for Sale</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(product.listings[0].askingPrice)}
                  </div>
                  <div className="text-zinc-500 text-xs mt-0.5">
                    by {product.listings[0].seller.name}
                  </div>
                </div>
                {!isOwner && session && (
                  <Link
                    href={`/transfer/${dppId}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium text-sm hover:bg-blue-400 transition-all"
                  >
                    Buy Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl overflow-hidden">
              <div className="flex border-b border-[#1f1f1f] overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-all border-b-2",
                      activeTab === tab.id
                        ? "text-white border-emerald-500"
                        : "text-zinc-500 border-transparent hover:text-zinc-300"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    {/* Current Owner */}
                    {product.currentOwner && (
                      <div>
                        <div className="mono-tag mb-3">Current Owner</div>
                        <div className="flex items-center gap-3 p-3 bg-[#141414] border border-[#1f1f1f] rounded-xl">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                            <User className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-zinc-200">{product.currentOwner.name}</div>
                            {product.currentOwner.college && (
                              <div className="text-xs text-zinc-500">{product.currentOwner.college}</div>
                            )}
                          </div>
                          <div className="ml-auto flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-zinc-400">{product.currentOwner.trustScore}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Product Details */}
                    <div>
                      <div className="mono-tag mb-3">Product Details</div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Category", value: product.category },
                          { label: "Brand", value: product.brand ?? "—" },
                          { label: "Model", value: product.model ?? "—" },
                          { label: "Color", value: product.color ?? "—" },
                          { label: "Year", value: product.yearOfPurchase?.toString() ?? "—" },
                          { label: "Activated", value: product.activatedAt ? formatDate(product.activatedAt) : "—" },
                        ].map((item) => (
                          <div key={item.label} className="p-3 bg-[#141414] border border-[#1f1f1f] rounded-xl">
                            <div className="text-xs text-zinc-600 mb-0.5">{item.label}</div>
                            <div className="text-sm text-zinc-200">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "history" && (
                  <div>
                    <div className="mono-tag mb-4">Ownership Chain</div>
                    <OwnershipTimeline history={product.ownershipHistory} />
                  </div>
                )}

                {activeTab === "repairs" && (
                  <div>
                    <div className="mono-tag mb-4">Repair History</div>
                    <RepairTimeline repairs={product.repairLogs} />
                    {isOwner && (
                      <Link
                        href={`/dashboard`}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-[#2a2a2a] text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 text-sm transition-all"
                      >
                        + Log a Repair
                      </Link>
                    )}
                  </div>
                )}

                {activeTab === "documents" && (
                  <div>
                    <div className="mono-tag mb-4">Documents & Certificates</div>
                    {product.documents.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-zinc-600 text-sm">No documents uploaded</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {product.documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-[#141414] border border-[#1f1f1f] rounded-xl hover:border-zinc-600 transition-all"
                          >
                            <FileText className="w-4 h-4 text-zinc-500" />
                            <div className="flex-1">
                              <div className="text-sm text-zinc-200">{doc.documentType}</div>
                              <div className="text-xs text-zinc-600">{formatDate(doc.uploadedAt)}</div>
                            </div>
                            {doc.isVerified && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Owner actions */}
            {isOwner && product.status === "ACTIVE" && (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/dashboard`}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] text-zinc-300 text-sm font-medium hover:border-zinc-600 transition-all"
                >
                  <Wrench className="w-4 h-4" />
                  Log Repair
                </Link>
                <Link
                  href={`/dashboard`}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/15 transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  List for Sale
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <QrDownload product={product} />

            {/* Quick stats */}
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
              <div className="mono-tag">Lifecycle Summary</div>
              {[
                { label: "Total Owners", value: product.ownershipHistory.length.toString() },
                { label: "Repairs Logged", value: product.repairLogs.length.toString() },
                { label: "Documents", value: product.documents.length.toString() },
                { label: "Activated", value: product.activatedAt ? formatDate(product.activatedAt) : "—" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{item.label}</span>
                  <span className="text-xs font-medium text-zinc-200">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Trust factors */}
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl p-4">
              <div className="mono-tag mb-3">Trust Factors</div>
              <div className="space-y-2">
                {[
                  { label: "Admin Verified", value: product.isVerified, icon: Shield },
                  { label: "Invoice Present", value: product.documents.some(d => d.documentType === "INVOICE"), icon: FileText },
                  { label: "Repair History", value: product.repairLogs.length > 0, icon: Wrench },
                  { label: "Multiple Owners", value: product.ownershipHistory.length > 1, icon: User },
                ].map((factor) => (
                  <div key={factor.label} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${factor.value ? "bg-emerald-400" : "bg-zinc-700"}`} />
                    <factor.icon className={`w-3 h-3 ${factor.value ? "text-emerald-400" : "text-zinc-600"}`} />
                    <span className={`text-xs ${factor.value ? "text-zinc-300" : "text-zinc-600"}`}>{factor.label}</span>
                    {factor.value && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
