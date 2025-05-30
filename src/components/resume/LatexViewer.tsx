"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";

interface LatexViewerProps {
  latexCode: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const LatexViewer = ({ latexCode, isOpen, onOpenChange }: LatexViewerProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!latexCode) return;

    try {
      await navigator.clipboard.writeText(latexCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>LaTeX Source Code</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-12 top-4 sm:px-3"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </Button>
        </DialogHeader>
        <div className="bg-muted p-4 rounded-md overflow-auto flex-1 mt-4">
          <pre className="text-xs whitespace-pre-wrap">
            {latexCode || "No LaTeX code available"}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LatexViewer;
