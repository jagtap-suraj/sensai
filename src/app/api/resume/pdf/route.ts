import { NextResponse } from "next/server";
import { proxyPdfDownload } from "@/lib/actions/resume";

export async function GET(request: Request) {
  try {
    // Get the PDF URL from the query parameter
    const url = new URL(request.url);
    const pdfUrl = url.searchParams.get("url");

    if (!pdfUrl) {
      return NextResponse.json(
        { error: "PDF URL is required" },
        { status: 400 }
      );
    }

    // Proxy the PDF download through the server
    const pdfBuffer = await proxyPdfDownload(pdfUrl);

    // Return the PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="resume.pdf"',
      },
    });
  } catch (error) {
    console.error("Error downloading PDF:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to download PDF",
      },
      { status: 500 }
    );
  }
}
