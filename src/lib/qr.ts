import QRCode from "qrcode";
import { nanoid } from "nanoid";

const CATEGORY_CODES: Record<string, string> = {
  LAPTOP: "LPT",
  PHONE: "PHN",
  GAMING_CONSOLE: "GCN",
  CYCLE: "CYC",
  APPLIANCE: "APL",
  ACADEMIC_EQUIPMENT: "ACE",
  OTHER: "OTH",
};

/**
 * Generates a unique DPP-ID in the format ECO-LPT-2024-XXXXX
 */
export function generateDppId(category: string): string {
  const code = CATEGORY_CODES[category] ?? "OTH";
  const year = new Date().getFullYear();
  const unique = nanoid(8).toUpperCase();
  return `ECO-${code}-${year}-${unique}`;
}

/**
 * Generates QR code as a data URL (PNG format)
 */
export async function generateQrPng(dppId: string, baseUrl: string): Promise<string> {
  const activationUrl = `${baseUrl}/activate/${dppId}`;
  const dataUrl = await QRCode.toDataURL(activationUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
  return dataUrl;
}

/**
 * Generates QR code as SVG string
 */
export async function generateQrSvg(dppId: string, baseUrl: string): Promise<string> {
  const activationUrl = `${baseUrl}/activate/${dppId}`;
  const svg = await QRCode.toString(activationUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
  return svg;
}

/**
 * Generates a complete QR sticker SVG with branding
 */
export async function generateQrSticker(dppId: string, baseUrl: string): Promise<string> {
  const activationUrl = `${baseUrl}/activate/${dppId}`;
  
  const qrSvgContent = await QRCode.toString(activationUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    width: 180,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  // Extract just the QR path data from the generated SVG
  const qrPathMatch = qrSvgContent.match(/<path[^/]*/g);
  const qrPaths = qrPathMatch ? qrPathMatch.join(" ") : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
  <!-- Background -->
  <rect width="240" height="300" rx="12" fill="#0A0A0A" stroke="#1F1F1F" stroke-width="1"/>
  
  <!-- Header -->
  <rect width="240" height="48" rx="12" fill="#111111"/>
  <rect y="36" width="240" height="12" fill="#111111"/>
  
  <!-- Brand name -->
  <text x="120" y="30" text-anchor="middle" font-family="system-ui, sans-serif" 
        font-size="14" font-weight="700" letter-spacing="3" fill="#10B981">ECOXCHANGE</text>
  
  <!-- QR Code container -->
  <rect x="20" y="60" width="200" height="200" rx="8" fill="white"/>
  
  <!-- QR Code (scaled and positioned) -->
  <g transform="translate(20, 60) scale(1.1)">
    ${qrSvgContent.replace(/<\/?svg[^>]*>/g, "")}
  </g>
  
  <!-- DPP-ID label -->
  <text x="120" y="280" text-anchor="middle" font-family="monospace, system-ui" 
        font-size="9" fill="#6B7280" letter-spacing="1">${dppId}</text>
  
  <!-- Bottom label -->
  <text x="120" y="295" text-anchor="middle" font-family="system-ui, sans-serif" 
        font-size="7" fill="#4B5563">Scan to activate or verify</text>
</svg>`;
}

/**
 * Calculates trust score based on product data
 */
export function calculateTrustScore(params: {
  hasInvoice: boolean;
  repairCount: number;
  ownershipCount: number;
  isVerified: boolean;
  conditionScore: number;
  daysSinceActivation: number;
}): number {
  let score = 0;

  // Invoice verification: 30 points
  if (params.hasInvoice) score += 30;

  // Admin verification: 20 points
  if (params.isVerified) score += 20;

  // Condition score contribution: up to 25 points
  score += (params.conditionScore / 100) * 25;

  // Repair history transparency: up to 15 points
  // Having repairs logged shows transparency
  if (params.repairCount > 0) {
    score += Math.min(15, params.repairCount * 5);
  } else {
    score += 10; // No repairs needed — good product
  }

  // Ownership history: up to 10 points
  // Multiple verified owners increases trust
  score += Math.min(10, params.ownershipCount * 3);

  return Math.min(100, Math.round(score));
}

/**
 * Get passport URL for a product
 */
export function getPassportUrl(dppId: string, baseUrl: string): string {
  return `${baseUrl}/passport/${dppId}`;
}

/**
 * Get activation URL for a product
 */
export function getActivationUrl(dppId: string, baseUrl: string): string {
  return `${baseUrl}/activate/${dppId}`;
}
