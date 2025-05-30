import { getUserProfile } from "@/lib/actions/user";
import { industries } from "@/data/industries";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  // Get user profile data
  const userProfile = await getUserProfile();

  // If not logged in or no profile found, redirect to onboarding
  if (!userProfile) {
    redirect("/onboarding");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold gradient-title mb-6">Your Profile</h1>
      <p className="text-muted-foreground mb-8">
        View and update your professional profile information
      </p>

      <ProfileForm initialData={userProfile} industries={industries} />
    </div>
  );
}
