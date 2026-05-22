import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTrustScore(score: number): string {
  return `${Math.round(score)}`;
}

export function getTrustLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 85) return { label: "Highly Trusted", color: "text-emerald-400" };
  if (score >= 70) return { label: "Trusted", color: "text-blue-400" };
  if (score >= 50) return { label: "Moderate", color: "text-amber-400" };
  return { label: "Low Trust", color: "text-red-400" };
}

export function getConditionLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 90) return { label: "Like New", color: "text-emerald-400" };
  if (score >= 75) return { label: "Excellent", color: "text-blue-400" };
  if (score >= 60) return { label: "Good", color: "text-amber-400" };
  if (score >= 40) return { label: "Fair", color: "text-orange-400" };
  return { label: "Poor", color: "text-red-400" };
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    UNCLAIMED: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
    ACTIVE: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    LISTED: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    TRANSFERRED: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    RETIRED: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  return map[status] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
}

export function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    LAPTOP: "💻",
    PHONE: "📱",
    GAMING_CONSOLE: "🎮",
    CYCLE: "🚲",
    APPLIANCE: "🔌",
    ACADEMIC_EQUIPMENT: "🔬",
    OTHER: "📦",
  };
  return map[category] ?? "📦";
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}
