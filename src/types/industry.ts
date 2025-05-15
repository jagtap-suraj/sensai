export interface SalaryRange {
  role: string;
  min: number;
  max: number;
  median: number;
  location: string;
}

export interface IndustryInsights {
  id?: string;
  industry: string;
  salaryRanges: SalaryRange[];
  growthRate: number;
  demandLevel: "High" | "Medium" | "Low";
  topSkills: string[];
  marketOutlook: "Positive" | "Neutral" | "Negative";
  keyTrends: string[];
  recommendedSkills: string[];
  lastUpdated: string | Date;
  nextUpdate: string | Date;
}
