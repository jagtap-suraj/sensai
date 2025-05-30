"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";
import LatexViewer from "./LatexViewer";
import { getLatexCode } from "@/lib/actions/resume";

interface ViewLatexButtonProps {
  className?: string;
}

const ViewLatexButton = ({ className }: ViewLatexButtonProps) => {
  const [isLatexViewerOpen, setIsLatexViewerOpen] = useState(false);
  const [latexCode, setLatexCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleViewLatex = async () => {
    try {
      setIsLoading(true);
      const result = await getLatexCode();
      setLatexCode(result);
      setIsLatexViewerOpen(true);
    } catch (error) {
      console.error("Error getting LaTeX code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleViewLatex}
        variant="outline"
        className={`sm:px-3 ${className || ""}`}
        disabled={isLoading}
      >
        <Code className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">View LaTeX</span>
      </Button>

      <LatexViewer
        latexCode={latexCode}
        isOpen={isLatexViewerOpen}
        onOpenChange={setIsLatexViewerOpen}
      />
    </>
  );
};

export default ViewLatexButton;
