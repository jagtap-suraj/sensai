"use client"; // Or remove if server component initially

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getCompletedLiveInterviewDetails } from "@/lib/actions/live-interview";
import { LiveInterview } from "@prisma/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function InterviewResultsPage() {
  const params = useParams();
  const interviewId = params.interviewId as string;

  const [interviewDetails, setInterviewDetails] =
    useState<LiveInterview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (interviewId) {
      getCompletedLiveInterviewDetails(interviewId)
        .then((data) => {
          if (data) {
            setInterviewDetails(data);
          } else {
            setError(
              "Interview results not found or you do not have permission to view them."
            );
          }
        })
        .catch((err) => {
          console.error("Error fetching interview details:", err);
          setError(err.message || "Failed to load interview results.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [interviewId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">
          Loading interview results...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">
          Error Loading Results
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <Button asChild variant="outline">
          <Link href="/live-interviews">Back to Live Interviews List</Link>
        </Button>
      </div>
    );
  }

  if (!interviewDetails) {
    // This case should ideally be caught by the error state from the fetch
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive">Interview data not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/live-interviews">Back to Live Interviews List</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-primary">
          Interview Results: {interviewDetails.targetRole}
        </h1>
        <p className="text-lg text-muted-foreground">
          For: {interviewDetails.userName} | Level: {interviewDetails.jobLevel}{" "}
          | Type: {interviewDetails.type}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Completed on:{" "}
          {new Date(interviewDetails.updatedAt).toLocaleDateString()}
        </p>
      </header>

      <div className="bg-card p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-card-foreground border-b pb-2">
          Feedback
        </h2>
        {interviewDetails.feedback ? (
          <div
            className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-primary"
            dangerouslySetInnerHTML={{
              __html: interviewDetails.feedback, // Assuming feedback is HTML/Markdown already processed
              // If feedback is raw Markdown, you'd use a Markdown renderer here
            }}
          />
        ) : (
          <p className="text-muted-foreground italic">
            No feedback was generated for this interview.
          </p>
        )}
      </div>

      <div className="bg-card p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-card-foreground border-b pb-2">
          Transcript
        </h2>
        {interviewDetails.transcript ? (
          <div className="whitespace-pre-wrap text-sm text-card-foreground bg-muted/30 p-4 rounded-md max-h-[500px] overflow-y-auto">
            {interviewDetails.transcript}
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            No transcript was recorded for this interview.
          </p>
        )}
      </div>

      <div className="mt-12 text-center">
        <Button asChild variant="default">
          <Link href="/live-interviews">Back to Live Interviews List</Link>
        </Button>
      </div>
    </div>
  );
}
