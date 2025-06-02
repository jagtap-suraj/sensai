"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Edit3, Save, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { updateCoverLetter } from "@/lib/actions/cover-letter";

// Define a type for the cover letter
interface CoverLetter {
  id: string;
  content: string;
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  createdAt: string;
  updatedAt: string;
}

function CoverLetterDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const editModeQuery = searchParams.get("edit");

  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(editModeQuery === "true");
  const [editableContent, setEditableContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchCoverLetter() {
      if (!id) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/cover-letter?id=${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch cover letter");
        }
        const data = await response.json();
        setCoverLetter(data);
        setEditableContent(data.content || "");
        if (editModeQuery === "true") {
          setIsEditing(true);
        }
      } catch (error) {
        console.error("Error fetching cover letter:", error);
        toast.error("Failed to load cover letter details.");
      } finally {
        setLoading(false);
      }
    }
    fetchCoverLetter();
  }, [id, editModeQuery]);

  const stripLeadingDate = useCallback((text: string): string => {
    const dateRegex =
      /^\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\s*\n?/i;
    return text.replace(dateRegex, "").trimStart();
  }, []);

  const handleCopy = useCallback(() => {
    if (coverLetter?.content) {
      const textToCopy = stripLeadingDate(
        isEditing ? editableContent : coverLetter.content
      );
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          toast.success("Cover letter content copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
          toast.error("Failed to copy content.");
        });
    }
  }, [coverLetter, isEditing, editableContent, stripLeadingDate]);

  const handleSave = async () => {
    if (!id || !editableContent) return;
    setSaving(true);
    try {
      await updateCoverLetter(id, editableContent); // Use the server action

      // Update local state immediately for responsiveness
      setCoverLetter((prev) =>
        prev ? { ...prev, content: editableContent } : null
      );
      setIsEditing(false);
      toast.success("Cover letter updated successfully!");
      router.replace(`/cover-letter/detail?id=${id}`, { scroll: false });
    } catch (error) {
      console.error("Error saving cover letter:", error);
      toast.error("Failed to save cover letter.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (coverLetter) {
      setEditableContent(coverLetter.content);
    }
    setIsEditing(false);
    router.replace(`/cover-letter/detail?id=${id}`, { scroll: false });
  };

  const toggleEditMode = () => {
    if (!isEditing && coverLetter) {
      setEditableContent(coverLetter.content);
    }
    setIsEditing(!isEditing);
  };

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-xl font-semibold">Cover Letter ID Missing</h1>
        <p className="mt-2 text-muted-foreground">
          The cover letter ID is missing from the URL parameters.
        </p>
        <Link href="/cover-letter" className="mt-4">
          <Button>Go Back to Cover Letters</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="mt-4">Loading cover letter...</p>
      </div>
    );
  }

  if (!coverLetter) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-xl font-semibold">Cover Letter Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The requested cover letter could not be found.
        </p>
        <Link href="/cover-letter" className="mt-4">
          <Button>Go Back to Cover Letters</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col space-y-2">
        <Link href="/cover-letter">
          <Button
            variant="link"
            className="gap-2 pl-0 text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cover Letters
          </Button>
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="gradient-title text-3xl md:text-4xl">
            {coverLetter.jobTitle} at {coverLetter.companyName}
          </h1>
        </div>
      </div>

      <div className="relative mt-6 rounded-lg border bg-card p-6 shadow-sm">
        {!isEditing && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-2 left-2 text-muted-foreground hover:text-primary z-10"
              onClick={handleCopy}
              title="Copy content"
            >
              <Copy className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-2 right-2 text-muted-foreground hover:text-primary z-10"
              onClick={toggleEditMode}
              title="Edit content"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              rows={20}
              className="w-full p-2 border rounded-md text-sm bg-background/50"
              placeholder="Enter cover letter content..."
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-lg max-w-none dark:prose-invert pr-10 text-justify pb-12">
            {coverLetter.content ? stripLeadingDate(coverLetter.content) : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// Loading fallback for the suspense boundary
function CoverLetterLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      <p className="mt-4">Loading cover letter...</p>
    </div>
  );
}

// Export the page component wrapped in a suspense boundary
export default function CoverLetterDetailPage() {
  return (
    <Suspense fallback={<CoverLetterLoading />}>
      <CoverLetterDetail />
    </Suspense>
  );
}
