"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getCompletedLiveInterviewDetails } from "@/lib/actions/live-interview";
import { LiveInterview } from "@prisma/client";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { marked } from "marked";

export default function LiveInterviewResultsPage() {
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
          <Link href="/interview/live">Back to Live Interviews List</Link>
        </Button>
      </div>
    );
  }

  if (!interviewDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive">Interview data not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/interview/live">Back to Live Interviews List</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex flex-col space-y-2 mb-6">
        <Link href="/interview/live">
          <Button
            variant="link"
            className="gap-2 pl-0 text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Live Interviews List
          </Button>
        </Link>
        <h1 className="gradient-title text-3xl md:text-4xl">
          Interview Results: {interviewDetails.targetRole || "Interview"}
        </h1>
        <p className="text-muted-foreground text-sm">
          For: {interviewDetails.userName || "User"} | Level:{" "}
          {interviewDetails.jobLevel || "N/A"} | Type:{" "}
          {interviewDetails.type || "N/A"}
          <br />
          Completed on:{" "}
          {interviewDetails.updatedAt
            ? new Date(interviewDetails.updatedAt).toLocaleDateString()
            : "N/A"}
        </p>
      </div>

      {/* Feedback Section - Apply bordered box style similar to Cover Letter Detail */}
      <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Feedback</h2>
        {interviewDetails.feedback ? (
          <div
            className="prose prose-lg max-w-none dark:prose-invert feedback-content"
            dangerouslySetInnerHTML={{
              __html: marked(interviewDetails.feedback),
            }}
          />
        ) : (
          <p className="text-muted-foreground">
            No feedback available for this interview.
          </p>
        )}
      </div>
    </div>
  );
}
