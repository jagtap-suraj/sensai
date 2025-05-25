export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuestionResult {
  question: string;
  answer: string;
  userAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface AssessmentResult {
  id: string;
  userId: string;
  quizScore: number;
  questions: QuestionResult[];
  category: string;
  improvementTip: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

// Interview-related types to match schema.prisma
export interface Interview {
  id: string;
  userId: string;
  role?: string;
  level?: string;
  type?: string;
  techstack: string[];
  questions: string[];
  vapiCallId?: string;
  recordingUrl?: string;
  finalized: boolean;
  feedback?: InterviewFeedback;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewFeedback {
  totalScore: number;
  categoryScores: Record<string, number>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
}

// Salary data from IndustryInsight model
export interface SalaryRange {
  role: string;
  min: number;
  max: number;
  median: number;
  location: string;
}

export interface IndustryInsight {
  id?: string;
  industry: string;
  salaryRanges: SalaryRange[];
  growthRate: number;
  demandLevel: "High" | "Medium" | "Low";
  topSkills: string[];
  marketOutlook: "Positive" | "Neutral" | "Negative";
  keyTrends: string[];
  recommendedSkills: string[];
  lastUpdated: Date;
  nextUpdate: Date;
}
