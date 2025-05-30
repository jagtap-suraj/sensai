import { NextRequest, NextResponse } from "next/server";
import { getCoverLetter } from "@/lib/actions/cover-letter";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Cover letter ID is required" },
      { status: 400 }
    );
  }

  try {
    const coverLetter = await getCoverLetter(id);

    if (!coverLetter) {
      return NextResponse.json(
        { error: "Cover letter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(coverLetter);
  } catch (error) {
    console.error("Error fetching cover letter:", error);
    return NextResponse.json(
      { error: "Failed to fetch cover letter" },
      { status: 500 }
    );
  }
}
