"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QuizResult from "./QuizResult";
import { AssessmentResult } from "@/types/interview";

interface QuizListProps {
  assessments: AssessmentResult[];
}

const QuizList = ({ assessments }: QuizListProps) => {
  const router = useRouter();
  const [selectedQuiz, setSelectedQuiz] = useState<AssessmentResult | null>(
    null
  );

  const handleStartNewQuiz = () => {
    router.push("/interview/mock");
  };

  const handleQuizSelect = (assessment: AssessmentResult) => {
    setSelectedQuiz(assessment);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="gradient-title text-3xl md:text-4xl">
                Recent Quizzes
              </CardTitle>
              <CardDescription>
                Review your past quiz performance
              </CardDescription>
            </div>
            <Button onClick={handleStartNewQuiz}>Start New Quiz</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assessments?.length > 0 ? (
              assessments.map((assessment, i) => (
                <Card
                  key={assessment.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleQuizSelect(assessment)}
                >
                  <CardHeader>
                    <CardTitle className="gradient-title text-2xl">
                      Quiz {i + 1}
                    </CardTitle>
                    <CardDescription className="flex justify-between w-full">
                      <div>Score: {assessment.quizScore.toFixed(1)}%</div>
                      <div>
                        {format(
                          new Date(assessment.createdAt),
                          "MMMM dd, yyyy HH:mm"
                        )}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  {assessment.improvementTip && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {assessment.improvementTip}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                You haven't taken any quizzes yet. Get started by taking your
                first quiz!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedQuiz}
        onOpenChange={(open) => {
          if (!open) setSelectedQuiz(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Details</DialogTitle>
          </DialogHeader>
          {selectedQuiz && (
            <QuizResult
              result={selectedQuiz}
              hideStartNew
              onStartNew={handleStartNewQuiz}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuizList;
