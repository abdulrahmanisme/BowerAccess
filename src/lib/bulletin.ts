export type BulletinCategory = "funding" | "events" | "hiring" | "news" | "something_new";

export type BulletinSource = "db" | "seed";

export interface BannerCrop {
  x: number;
  y: number;
  zoom: number;
  ratio: number;
}

export interface BulletinItem {
  id: string;
  title: string;
  description: string;
  jobDescription?: string;
  detailBullets?: string[];
  category: BulletinCategory;
  status: "draft" | "published" | "archived";
  dateLabel?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string; // ISO date string, needed for urgency calculation
  timeLabel?: string;
  venue?: string;
  amountLabel?: string;
  link?: string;
  imageUrl?: string;
  bannerCrop?: BannerCrop;
  itemOrder?: number;
  sectors?: string[]; // Array of sector tags
  source: BulletinSource;
  fundingStage?: string;   // e.g. "Pre-seed", "Seed"
  fundingAmount?: string;  // e.g. "₹50L", "$100K"
}

export interface BulletinSection {
  category: BulletinCategory;
  title: string;
  subtitle: string;
}

export const BULLETIN_SECTIONS: BulletinSection[] = [
  {
    category: "funding",
    title: "Capital/Opportunities worth ₹ 126 Crore",
    subtitle: "Curated capital and opportunities relevent for idea and early stage startups.",
  },
  {
    category: "events",
    title: "Events",
    subtitle: "Rooms you must explore in online/Hyderabad to meet your customers, investors, other startup enthusiasts, SMEs, learn from experts directly.",
  },
  {
    category: "news",
    title: "Ecosystem Policy Updates/News",
    subtitle: "Key ecosystem updates that may affect founder decisions.",
  },
  {
    category: "hiring",
    title: "Hiring - VC / PE Cohort",
    subtitle: "Relevant roles for operators and investment talent.",
  },
  {
    category: "something_new",
    title: "Something New For You",
    subtitle: "Fresh support tracks and founder-specific opportunities.",
  },
];

export const OPTIONAL_POSTER_CATEGORIES: BulletinCategory[] = [
  "news",
  "hiring",
  "something_new",
];

export function isPosterOptionalForCategory(category: BulletinCategory) {
  return OPTIONAL_POSTER_CATEGORIES.includes(category);
}
