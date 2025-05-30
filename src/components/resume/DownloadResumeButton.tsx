"use client";

import { Button } from "@/components/ui/button";
import { useResumePdf } from "@/hooks/useResumePdf";
import { Download, Loader2 } from "lucide-react";

interface DownloadResumeButtonProps {
  className?: string;
}

const DownloadResumeButton = ({ className }: DownloadResumeButtonProps) => {
  const { generatePdf, isGenerating, progress } = useResumePdf();

  return (
    <Button
      onClick={generatePdf}
      disabled={isGenerating}
      variant="outline"
      className={`sm:px-3 ${className || ""}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
          <span className="hidden sm:inline">
            {progress === "Generating PDF..." && "Generating..."}
            {progress === "Processing..." && "Processing..."}
            {progress === "Downloading..." && "Downloading..."}
          </span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Download PDF</span>
        </>
      )}
    </Button>
  );
};

export default DownloadResumeButton;
