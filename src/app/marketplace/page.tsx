"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Shield,
  Star,
  Wrench,
  Clock,
  Loader2,
  Package,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import {
  formatCurrency,
  getConditionLabel,
  getCategoryIcon,
} from "@/lib/utils";

interface Listing {
  id: string;
  askingPrice: number;
  description?: string;
  createdAt: string;
  source?: string;
  externalUrl?: string;
  externalImage?: string;
  sellerLabel?: string;
  externalTrustScore?: number;
  product: {
    dppId: string;
    category: string;
    brand?: string;
    model?: string;
    conditionScore: number;
    trustScore: number;
    isVerified: boolean;
    ownershipHistory: { id: string }[];
    repairLogs: { id: string }[];
  };
  seller: {
    name: string;
    college?: string;
    trustScore: number;
  };
}

const CATEGORIES = [
  "ALL", "LAPTOP", "PHONE", "GAMING_CONSOLE", "CYCLE", "APPLIANCE", "ACADEMIC_EQUIPMENT",
];

const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All Products",
  LAPTOP: "Laptops",
  PHONE: "Phones",
  GAMING_CONSOLE: "Gaming",
  CYCLE: "Cycles",
  APPLIANCE: "Appliances",
  ACADEMIC_EQUIPMENT: "Academic",
};

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: page.toString() });
        if (selectedCategory !== "ALL") params.set("category", selectedCategory);
        const res = await fetch(`/api/marketplace?${params}`);
        if (res.ok) {
          const data = await res.json();
          setListings(data.listings);
          setTotalPages(data.pagination.pages);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [selectedCategory, page]);

  const filtered = search
    ? listings.filter(
        (l) =>
          l.product.brand?.toLowerCase().includes(search.toLowerCase()) ||
          l.product.model?.toLowerCase().includes(search.toLowerCase()) ||
          l.product.dppId.toLowerCase().includes(search.toLowerCase()) ||
          l.sellerLabel?.toLowerCase().includes(search.toLowerCase())
      )
    : listings;

  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="mono-tag text-emerald-400 mb-2">Verified Marketplace</div>
          <h1 className="text-2xl font-semibold text-white mb-1">
            Every listing carries a Digital Passport.
          </h1>
          <p className="text-zinc-500 text-sm">
            Browse verified pre-owned products with complete lifecycle history
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by brand, model, or DPP-ID..."
              className="input-base pl-9"
              id="marketplace-search"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  : "bg-[#0f0f0f] border border-[#1f1f1f] text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {cat !== "ALL" && getCategoryIcon(cat)}
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-zinc-500 mb-2">
              No listings found
            </h2>
            <p className="text-zinc-600 text-sm">
              {selectedCategory !== "ALL"
                ? "Try a different category"
                : "Check back soon for new verified listings"}
            </p>
          </div>
        ) : (
          <>
            <div className="mono-tag mb-4">{filtered.length} verified listings</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((listing) => {
                const isCampusKartt = listing.source === "CAMPUSKARTT";
                const conditionInfo = getConditionLabel(listing.product.conditionScore);
                const displayTrustScore = isCampusKartt
                  ? (listing.externalTrustScore ?? 70)
                  : Math.round(listing.product.trustScore);

                if (isCampusKartt) {
                  // CampusKartt card — opens external URL
                  return (
                    <a
                      key={listing.id}
                      href={listing.externalUrl ?? "https://campuskartt1.netlify.app/app/browse.html"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block bg-[#0f0f0f] border border-orange-500/20 rounded-2xl p-5 card-hover relative overflow-hidden"
                    >
                      {/* CampusKartt gradient accent */}
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 opacity-60" />

                      {/* Product image */}
                      {listing.externalImage && (
                        <div className="w-full h-28 rounded-xl overflow-hidden mb-3 bg-[#141414]">
                          <img
                            src={listing.externalImage}
                            alt={listing.product.model}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl">
                          {getCategoryIcon(listing.product.category)}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/12 border border-orange-500/25">
                          <span className="text-[9px] text-orange-400 font-bold tracking-wide">CampusKartt</span>
                        </div>
                      </div>

                      {/* Product name */}
                      <div className="mb-3">
                        <h3 className="text-[14px] font-semibold text-white leading-tight mb-0.5">
                          {listing.product.model}
                        </h3>
                        <div className="font-mono text-[10px] text-zinc-600">
                          via CampusKartt
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        <div className="bg-[#141414] rounded-lg p-2 text-center">
                          <div className="text-xs font-semibold text-orange-400">
                            {displayTrustScore}
                          </div>
                          <div className="text-[9px] text-zinc-600">Trust</div>
                        </div>
                        <div className="bg-[#141414] rounded-lg p-2 text-center">
                          <div className={`text-[10px] font-semibold ${conditionInfo.color}`}>
                            {conditionInfo.label}
                          </div>
                          <div className="text-[9px] text-zinc-600">Condition</div>
                        </div>
                        <div className="bg-[#141414] rounded-lg p-2 text-center">
                          <div className="text-xs font-semibold text-zinc-400">—</div>
                          <div className="text-[9px] text-zinc-600">Campus</div>
                        </div>
                      </div>

                      {/* Description */}
                      {listing.description && (
                        <div className="text-[10px] text-zinc-500 mb-3 line-clamp-2">
                          {listing.description}
                        </div>
                      )}

                      {/* Price + CTA */}
                      <div className="flex items-center justify-between pt-3 border-t border-orange-500/10">
                        <div>
                          <div className="text-lg font-bold text-white">
                            {formatCurrency(listing.askingPrice)}
                          </div>
                          <div className="text-[10px] text-zinc-600">
                            CampusKartt · Campus sell
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-medium group-hover:bg-orange-500/15 transition-all">
                          Buy →
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-700">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(listing.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </div>
                    </a>
                  );
                }

                // Standard EcoXchange card
                return (
                  <a
                    key={listing.id}
                    href={`/passport/${listing.product.dppId}`}
                    className="group block bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-5 card-hover"
                  >
                    {/* Category icon + verified badge */}
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl">
                        {getCategoryIcon(listing.product.category)}
                      </span>
                      <div className="flex gap-1">
                        {listing.product.isVerified && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/8 border border-emerald-500/15">
                            <Shield className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-[9px] text-emerald-400 font-medium">Verified</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Product name */}
                    <div className="mb-3">
                      <h3 className="text-[14px] font-semibold text-white leading-tight mb-0.5">
                        {listing.product.brand} {listing.product.model}
                      </h3>
                      <div className="font-mono text-[10px] text-zinc-600">
                        {listing.product.dppId}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      <div className="bg-[#141414] rounded-lg p-2 text-center">
                        <div className="text-xs font-semibold text-white">
                          {displayTrustScore}
                        </div>
                        <div className="text-[9px] text-zinc-600">Trust</div>
                      </div>
                      <div className="bg-[#141414] rounded-lg p-2 text-center">
                        <div className={`text-[10px] font-semibold ${conditionInfo.color}`}>
                          {conditionInfo.label}
                        </div>
                        <div className="text-[9px] text-zinc-600">Condition</div>
                      </div>
                      <div className="bg-[#141414] rounded-lg p-2 text-center">
                        <div className="text-xs font-semibold text-white">
                          {listing.product.ownershipHistory.length}
                        </div>
                        <div className="text-[9px] text-zinc-600">Owners</div>
                      </div>
                    </div>

                    {/* History indicators */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                        <Wrench className="w-2.5 h-2.5" />
                        {listing.product.repairLogs.length} repairs
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                        <Star className="w-2.5 h-2.5" />
                        {listing.seller.trustScore} seller score
                      </div>
                    </div>

                    {/* Price + CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#1f1f1f]">
                      <div>
                        <div className="text-lg font-bold text-white">
                          {formatCurrency(listing.askingPrice)}
                        </div>
                        <div className="text-[10px] text-zinc-600">
                          {listing.seller.name}
                          {listing.seller.college && ` · ${listing.seller.college.split("(")[0].trim()}`}
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-medium group-hover:bg-blue-500/15 transition-all">
                        View DPP →
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-700">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(listing.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-[#1f1f1f] text-zinc-400 text-sm disabled:opacity-40 hover:border-zinc-600 transition-all"
                >
                  Previous
                </button>
                <span className="text-zinc-600 text-sm px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[#1f1f1f] text-zinc-400 text-sm disabled:opacity-40 hover:border-zinc-600 transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
