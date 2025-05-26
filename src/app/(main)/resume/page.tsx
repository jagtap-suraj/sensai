import ResumeForm from "@/components/resume/ResumeForm";
import { getResume } from "@/lib/actions/resume";
import { Resume } from "@/types/resume";

export default async function ResumePage() {
  let resume = null;

  try {
    resume = (await getResume()) as unknown as Resume | null;
  } catch (error) {
    console.error("Error fetching resume:", error);
    // Continue with null resume to show empty form
  }

  return (
    <div className="py-8">
      <ResumeForm initialData={resume} />
    </div>
  );
}
