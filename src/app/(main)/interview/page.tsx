import PerformanceChart from "@/components/interview/PerformanceChart";
import QuizList from "@/components/interview/QuizList";
import StatsCards from "@/components/interview/StatsCards";
import { getAssessments } from "@/lib/actions/interview";

export default async function InterviewPrepPage() {
  const assessments = await getAssessments();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-6xl font-bold gradient-title">Technical Quizzes</h1>
      </div>
      <div className="space-y-6">
        <StatsCards assessments={assessments || []} />
        <PerformanceChart assessments={assessments || []} />
        <QuizList assessments={assessments || []} />
      </div>
    </div>
  );
}
