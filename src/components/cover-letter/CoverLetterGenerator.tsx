"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  generateCoverLetter,
  processResumeFile,
} from "@/lib/actions/cover-letter";

const formSchema = z.object({
  jobTitle: z.string().min(2, {
    message: "Job title must be at least 2 characters.",
  }),
  companyName: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  jobDescription: z.string().min(20, {
    message: "Job description must be at least 20 characters.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const CoverLetterGenerator = () => {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [extractedResumeText, setExtractedResumeText] = useState<string | null>(
    null
  );
  const [processingStep, setProcessingStep] = useState<
    "idle" | "extracting" | "generating"
  >("idle");
  const [processingError, setProcessingError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: "",
      companyName: "",
      jobDescription: "",
    },
  });

  // Get file type description for user messages
  const getFileTypeDescription = (file: File | null): string => {
    if (!file) return "";
    if (file.type === "application/pdf") return "PDF";
    if (file.type.includes("word")) return "Word document";
    if (file.type === "text/plain") return "text file";
    return "file";
  };

  // Convert file to base64 on the client side
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // The result will be a data URL like "data:application/pdf;base64,..."
        // We need to extract just the base64 part
        const base64String = reader.result as string;
        const base64Content = base64String.split(",")[1]; // Remove the data:mime/type;base64, part
        resolve(base64Content);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Process the resume file
  const processResume = async (file: File) => {
    setProcessingStep("extracting");
    setIsProcessingFile(true);
    setProcessingError(null);

    try {
      const fileType = getFileTypeDescription(file);
      toast.info(`Processing ${fileType}. This may take a moment...`);

      // Check file size
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        throw new Error(
          "File size exceeds 10MB limit. Please upload a smaller file."
        );
      }

      console.log(
        `Sending file for processing: ${file.name} (${file.type}, ${(
          file.size /
          (1024 * 1024)
        ).toFixed(2)} MB)`
      );

      // Convert file to base64 on the client side
      const base64Data = await fileToBase64(file);

      // Create a server-safe file object
      const fileForServer = {
        base64Data,
        type: file.type,
        name: file.name,
        size: file.size,
      };

      // Extract text from the resume
      const extractedText = await processResumeFile(fileForServer);

      // Log the extracted text to the console
      console.log("Extracted Resume Text:", extractedText);

      // Check if the extraction failed
      if (
        extractedText.startsWith("Failed to extract text") ||
        extractedText.startsWith("Failed to process")
      ) {
        const errorMessage = extractedText.split(": ")[1] || "Unknown error";
        console.error("Resume processing failed:", errorMessage);
        toast.error(`Failed to process resume: ${errorMessage}`);
        setProcessingError(errorMessage);
        setExtractedResumeText(null);
        return null;
      }

      setExtractedResumeText(extractedText);
      toast.success("Resume processed successfully!");

      return extractedText;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error processing resume:", errorMessage);
      toast.error(`Failed to process resume: ${errorMessage}`);
      setProcessingError(errorMessage);
      setExtractedResumeText(null);
      return null;
    } finally {
      setIsProcessingFile(false);
      setProcessingStep("idle");
    }
  };

  // Handle file upload and automatically process
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (
        file.type === "application/pdf" ||
        file.type.includes("word") ||
        file.type === "text/plain"
      ) {
        setResumeFile(file);
        setExtractedResumeText(null);

        // Automatically start processing the file
        await processResume(file);
      } else {
        toast.error("Please upload a PDF, Word document, or text file");
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);

    try {
      let resumeText = extractedResumeText || "";

      // If we have a file but haven't processed it yet, process it first
      if (resumeFile && !extractedResumeText) {
        const processedText = await processResume(resumeFile);
        if (!processedText) {
          setIsGenerating(false);
          return; // Stop if processing failed
        }
        resumeText = processedText;
      }

      // Generate the cover letter with the extracted text
      setProcessingStep("generating");

      try {
        toast.info("Generating cover letter...");

        const coverLetter = await generateCoverLetter({
          ...values,
          resumeText,
        });

        toast.success("Cover letter generated successfully!");
        router.push(`/cover-letter/${coverLetter.id}`);
      } catch (error) {
        console.error("Error generating cover letter:", error);
        toast.error("Failed to generate cover letter");
      } finally {
        setProcessingStep("idle");
      }
    } catch (error) {
      console.error("Error in submission process:", error);
      toast.error("An error occurred during the process");
    } finally {
      setIsGenerating(false);
    }
  };

  // Get button text based on current state
  const getButtonText = () => {
    if (isProcessingFile)
      return `Processing ${getFileTypeDescription(resumeFile)}...`;
    if (processingStep === "generating") return "Generating Cover Letter...";
    return "Generate Cover Letter";
  };

  // Get button disabled state
  const isButtonDisabled = () => {
    return isGenerating || isProcessingFile;
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              placeholder="Software Engineer"
              {...register("jobTitle")}
            />
            {errors.jobTitle && (
              <p className="text-sm text-red-500">{errors.jobTitle.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              placeholder="Acme Inc."
              {...register("companyName")}
            />
            {errors.companyName && (
              <p className="text-sm text-red-500">
                {errors.companyName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the full job description here..."
              className="min-h-[200px]"
              {...register("jobDescription")}
            />
            <p className="text-sm text-muted-foreground">
              Include responsibilities, requirements, and any specific
              qualifications.
            </p>
            {errors.jobDescription && (
              <p className="text-sm text-red-500">
                {errors.jobDescription.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume-upload">Upload Resume (Optional)</Label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="resume-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted ${
                  isProcessingFile ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isProcessingFile ? (
                    <Loader2 className="w-8 h-8 mb-3 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                  )}
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, DOCX, or TXT
                  </p>
                </div>
                <input
                  id="resume-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  disabled={isProcessingFile || isGenerating}
                />
              </label>
            </div>
            {resumeFile && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground mt-2">
                  File selected: {resumeFile.name} (
                  {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
                {extractedResumeText && (
                  <p className="text-sm text-green-500">
                    ✓ Resume processed successfully
                  </p>
                )}
                {isProcessingFile && (
                  <p className="text-sm text-amber-500">Processing resume...</p>
                )}
                {processingError && (
                  <p className="text-sm text-red-500">
                    Error: {processingError}
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Upload your resume to create a more personalized cover letter.
              {resumeFile &&
                !extractedResumeText &&
                !isProcessingFile &&
                !processingError && (
                  <span className="block mt-1 text-red-500">
                    Resume processing failed. Please try a different file
                    format.
                  </span>
                )}
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isButtonDisabled()}
          >
            {isButtonDisabled() ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {getButtonText()}
              </>
            ) : (
              "Generate Cover Letter"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CoverLetterGenerator;
