import { getUserOnboardingStatus } from "@/lib/actions/user";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const onboardingStatus = await getUserOnboardingStatus();

  // If not onboarded, redirect to onboarding page
  // Skip this check if already on the onboarding page
  if (!onboardingStatus?.isOnboarded) {
    redirect("/onboarding");
  }

  return <div>Dashboard</div>;
}
