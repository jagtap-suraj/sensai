"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCoverLetter() {
      if (!id) return;

      try {
        const response = await fetch(`/api/cover-letter?id=${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch cover letter");
        }
        const data = await response.json();
        setCoverLetter(data);
      } catch (error) {
        console.error("Error fetching cover letter:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCoverLetter();
  }, [id]);

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
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Cover Letters
          </Button>
        </Link>

        <h1 className="gradient-title text-3xl md:text-4xl">
          {coverLetter.jobTitle} at {coverLetter.companyName}
        </h1>
      </div>

      <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="prose prose-lg max-w-none dark:prose-invert">
          {coverLetter.content}
        </div>
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
