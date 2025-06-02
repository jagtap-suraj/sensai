"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLiveInterviewsForUser } from "@/lib/actions/live-interview";
import { LiveInterview } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquareText, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteLiveInterview } from "@/lib/actions/live-interview";
import { format } from "date-fns";

// Helper function to strip basic markdown for plain text display
function stripMarkdown(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold **text**
    .replace(/\*([^*]+)\*/g, "$1") // Italics *text*
    .replace(/_([^_]+)_/g, "$1") // Italics _text_
    .replace(/#+\s*(.*)/g, "$1") // Headers # text
    .replace(/\n/g, " ") // Newlines to spaces for a single line preview
    .replace(/\s{2,}/g, " ") // Multiple spaces to single space
    .trim();
}

type LiveInterviewListItem = Pick<
  LiveInterview,
  | "id"
  | "userName"
  | "targetRole"
  | "jobLevel"
  | "type"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "feedback"
>;

export default function LiveInterviewListPage() {
  const [interviews, setInterviews] = useState<LiveInterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const data = await getLiveInterviewsForUser();
      setInterviews(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching live interviews:", err);
      setError((err as Error).message || "Failed to load live interviews.");
      toast.error("Failed to load live interviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const handleDelete = async (interviewId: string) => {
    toast.loading("Deleting interview...", { id: `delete-${interviewId}` });
    try {
      const result = await deleteLiveInterview(interviewId);
      if (result.success) {
        toast.success("Interview deleted successfully.", {
          id: `delete-${interviewId}`,
        });
        setInterviews((prev) =>
          prev.filter((interview) => interview.id !== interviewId)
        );
      } else {
        throw new Error(result.message || "Failed to delete interview.");
      }
    } catch (err: unknown) {
      console.error("Error deleting interview:", err);
      toast.error((err as Error).message || "Could not delete interview.", {
        id: `delete-${interviewId}`,
      });
    }
  };

  const handleCardClick = (id: string, status: string) => {
    if (status === "COMPLETED") {
      window.location.href = `/interview/live/results/${id}`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        Loading live interviews...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center text-destructive">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-6xl font-bold gradient-title">
          My Live Interviews
        </h1>
        <Button asChild>
          <Link href="/interview/live/new">
            <PlusCircle className="mr-2 h-5 w-5" /> Start New Live Interview
          </Link>
        </Button>
      </div>

      {interviews.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
              <MessageSquareText className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="mt-4 text-2xl">
              No Live Interviews Yet
            </CardTitle>
            <CardDescription>
              Get started by conducting your first mock interview with our AI.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild size="lg">
              <Link href="/interview/live/new">
                <PlusCircle className="mr-2 h-5 w-5" /> Start Your First Live
                Interview
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview) => (
            <Card
              key={interview.id}
              className="group relative cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              onClick={() => handleCardClick(interview.id, interview.status)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl gradient-title">
                      {interview.targetRole}
                      {interview.jobLevel &&
                        `| ${interview.jobLevel.replace("_", " ")} `}
                      {interview.type && `| ${interview.type}`}
                    </CardTitle>
                    <CardDescription>
                      Created {format(new Date(interview.createdAt), "PPP")}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    {interview.status !== "COMPLETED" && (
                      <Badge variant="outline">
                        {interview.status.replace("_", " ")}
                      </Badge>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive-foreground hover:bg-destructive/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete Live Interview?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the interview for {interview.targetRole}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(interview.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {interview.status === "COMPLETED" ? (
                  interview.feedback ? (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {stripMarkdown(interview.feedback)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Feedback processing or not yet available.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Status:{" "}
                    <Badge variant="outline">
                      {interview.status.replace("_", " ")}
                    </Badge>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
