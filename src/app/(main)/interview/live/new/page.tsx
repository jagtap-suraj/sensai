import { LiveInterviewSetupForm } from "@/components/interview/live-interview-setup-form";
import { getUserFromAuth } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export default async function NewLiveInterviewPage() {
  const user = await getUserFromAuth();

  if (!user) {
    redirect("/sign-in"); // Or your appropriate auth redirect
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Setup New Live Interview
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 sm:mt-4">
            Fill in the details below to start your mock audio interview.
          </p>
        </div>
        <LiveInterviewSetupForm userProfile={{ name: user.name || "User" }} />
      </div>
    </div>
  );
}
