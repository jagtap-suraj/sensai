import ResumeForm from "@/components/resume/ResumeForm";
import { getResume } from "@/lib/actions/resume";
import { Resume } from "@/types/resume";

// Add dynamic export configuration
export const dynamic = "force-dynamic";

export default async function ResumePage() {
  let resume = null;

  try {
    resume = (await getResume()) as unknown as Resume | null;
  } catch (error) {
    console.error("Error fetching resume:", error);
    // Continue with null resume to show empty form
  }

  return (
    <div>
      <ResumeForm initialData={resume} />
    </div>
  );
}
