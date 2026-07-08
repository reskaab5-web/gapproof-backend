export interface Competitor {
  name: string;
  reviews: number;
  rating: number;
  isYou?: boolean;
}
export interface GeoPoint { rank: number | null; }
export interface AeoResult {
  engine: string;
  mentioned: boolean;
  position: number | null;
  note: string;
}
export interface RevenueModel {
  avgCustomerValue: number;
  monthlySearches: number;
  currentCtr: number;
  potentialCtr: number;
  conversionRate: number;
  lostCustomersPerMonth: number;
  monthlyLost: number;
  annualLost: number;
}
export interface BusinessReport {
  businessName: string;
  category: string;
  city: string;
  rating: number;
  reviewCount: number;
  reviewVelocity: number;
  responseRate: number;
  photoCount: number;
  reviewScore: number;
  visibilityScore: number;
  aeoScore: number;
  overallScore: number;
  geoGrid: GeoPoint[];
  avgRank: number;
  keyword: string;
  competitors: Competitor[];
  reviewGapToLeader: number;
  revenue: RevenueModel;
  aeo: AeoResult[];
  leadScore: number;
  leadTier: "Hot" | "Warm" | "Nurture";
  insights: string[];
  fixes: string[];
  meta?: {
    source: "live" | "partial";
    placeId?: string;
    generatedAt: string;
    warnings: string[];
  };
}
