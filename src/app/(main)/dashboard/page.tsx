import DashboardView from "@/components/dashboard/DashboardView";
import { getIndustryInsights } from "@/lib/actions/dashboard";
import { getUserOnboardingStatus } from "@/lib/actions/user";
import { redirect } from "next/navigation";
import { IndustryInsights } from "@/types/industry";

export default async function DashboardPage() {
  const onboardingStatus = await getUserOnboardingStatus();

  // If not onboarded, redirect to onboarding page
  if (!onboardingStatus?.isOnboarded) {
    redirect("/onboarding");
  }

  const dbInsights = await getIndustryInsights();

  // If no insights, redirect to onboarding to select industry
  if (!dbInsights) {
    redirect("/onboarding");
  }

  // Parse salary ranges from JSON to strongly typed objects
  const parsedSalaryRanges = (
    dbInsights.salaryRanges as Array<{
      role: string;
      min: number;
      max: number;
      median: number;
      location: string;
    }>
  ).map((range) => ({
    role: range.role,
    min: range.min,
    max: range.max,
    median: range.median,
    location: range.location,
  }));

  // Cast and transform the database result to match our IndustryInsights type
  const insights: IndustryInsights = {
    ...dbInsights,
    salaryRanges: parsedSalaryRanges,
    demandLevel: dbInsights.demandLevel as "High" | "Medium" | "Low",
    marketOutlook: dbInsights.marketOutlook as
      | "Positive"
      | "Neutral"
      | "Negative",
  };

  return (
    <div className="container mx-auto">
      <DashboardView insights={insights} />
    </div>
  );
}
