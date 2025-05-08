import { redirect } from "next/navigation";
import { industries } from "@/data/industries";
import { getUserOnboardingStatus } from "@/lib/actions/user";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export default async function OnboardingPage() {
  // Check if user is already onboarded
  const onboardingStatus = await getUserOnboardingStatus();

  if (onboardingStatus?.isOnboarded) {
    redirect("/dashboard");
  }

  return (
    <main>
      <OnboardingForm industries={industries} />
    </main>
  );
}
