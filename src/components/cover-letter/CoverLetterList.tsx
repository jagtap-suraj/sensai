"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Edit2, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { deleteCoverLetter } from "@/lib/actions/cover-letter";

interface CoverLetter {
  id: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string | null;
  createdAt: string | Date;
  content: string;
}

interface CoverLetterListProps {
  coverLetters: CoverLetter[];
}

const CoverLetterList = ({ coverLetters }: CoverLetterListProps) => {
  const router = useRouter();

  const stripLeadingDate = (text: string): string => {
    const dateRegex =
      /^\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\s*\n?/i;
    return text.replace(dateRegex, "").trimStart();
  };

  const handleCopyToList = (content: string) => {
    if (content) {
      const textToCopy = stripLeadingDate(content);
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          toast.success("Cover letter content copied!");
        })
        .catch((err) => {
          console.error("Failed to copy content from list: ", err);
          toast.error("Failed to copy content.");
        });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCoverLetter(id);
      toast.success("Cover letter deleted successfully!");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete cover letter"
      );
    }
  };

  const handleCardClick = (id: string) => {
    router.push(`/cover-letter/detail?id=${id}`);
  };

  const handleEditClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent card click
    router.push(`/cover-letter/detail?id=${id}&edit=true`);
  };

  if (!coverLetters?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Cover Letters Yet</CardTitle>
          <CardDescription>
            Create your first cover letter to get started
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {coverLetters.map((letter) => (
        <Card
          key={letter.id}
          className="group relative cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1"
          onClick={() => handleCardClick(letter.id)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl gradient-title">
                  {letter.jobTitle} at {letter.companyName}
                </CardTitle>
                <CardDescription>
                  Created {format(new Date(letter.createdAt), "PPP")}
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => handleEditClick(e, letter.id)}
                  title="Edit Cover Letter"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    handleCopyToList(letter.content);
                  }}
                  title="Copy Cover Letter"
                >
                  <Copy className="h-4 w-4" />
                </Button>
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
                      <AlertDialogTitle>Delete Cover Letter?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete your cover letter for {letter.jobTitle} at{" "}
                        {letter.companyName}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(letter.id)}
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
            <div className="text-muted-foreground text-sm line-clamp-3">
              {letter.jobDescription || "No job description provided"}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CoverLetterList;
