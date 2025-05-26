"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generateResumePdf, checkPdfStatus } from "@/lib/actions/resume";

export function useResumePdf() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("idle");

  // Function to generate and download the PDF
  const generatePdf = async () => {
    try {
      setIsGenerating(true);
      setProgress("Generating PDF...");

      // Step 1: Initiate PDF generation using server action
      const result = await generateResumePdf();
      if (!result?.statusUrl) {
        throw new Error("Failed to generate PDF");
      }

      // Step 2: Poll for status until complete
      setProgress("Processing...");
      const pdfUrl = await pollForPdfStatus(result.statusUrl);

      // Step 3: Download the PDF
      setProgress("Downloading...");
      await downloadPdf(pdfUrl);

      setProgress("idle");
      toast.success("Resume PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate PDF"
      );
      setProgress("idle");
    } finally {
      setIsGenerating(false);
    }
  };

  // Poll the status URL until the PDF is ready
  const pollForPdfStatus = async (statusUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const statusData = await checkPdfStatus(statusUrl);

          // Check if processing is complete
          if (statusData.statusCode === 201) {
            // Processing complete, return the document URL
            resolve(statusData.documentUrl);
          } else if (statusData.statusCode === 102) {
            // Still processing, check again after a delay
            setTimeout(checkStatus, 1000);
          } else {
            // Error or unknown status
            reject(
              new Error(
                `Unexpected status: ${
                  statusData.statusDescription || statusData.statusCode
                }`
              )
            );
          }
        } catch (error) {
          reject(error);
        }
      };

      // Start checking
      checkStatus();
    });
  };

  // Download the PDF from the URL
  const downloadPdf = async (pdfUrl: string) => {
    try {
      // Use our proxy API endpoint instead of fetching directly from S3
      const proxyUrl = `/api/resume/pdf?url=${encodeURIComponent(pdfUrl)}`;

      // Fetch the PDF from our proxy
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      // Get the blob
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "resume.pdf";
      document.body.appendChild(link);
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      throw new Error("Failed to download PDF");
    }
  };

  return {
    generatePdf,
    isGenerating,
    progress,
  };
}
