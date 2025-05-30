import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCoverLetters } from "@/lib/actions/cover-letter";
import CoverLetterList from "@/components/cover-letter/CoverLetterList";

export default async function CoverLetterPage() {
  const coverLetters = await getCoverLetters();

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between mb-5">
        <h1 className="text-6xl font-bold gradient-title">My Cover Letters</h1>
        <Link href="/cover-letter/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </Link>
      </div>

      {coverLetters.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            You haven&apos;t created any cover letters yet.
          </p>
          <Link href="/cover-letter/new" className="mt-4 inline-block">
            <Button>Create your first cover letter</Button>
          </Link>
        </div>
      ) : (
        <CoverLetterList coverLetters={coverLetters} />
      )}
    </div>
  );
}
