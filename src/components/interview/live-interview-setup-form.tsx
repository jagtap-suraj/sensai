"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobLevel, InterviewType } from "@prisma/client";
import {
  createLiveInterviewSetup,
  ResumeFile,
} from "@/lib/actions/live-interview";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const formSchema = z.object({
  userName: z.string().min(2, "Name must be at least 2 characters.").max(100),
  targetRole: z
    .string()
    .min(2, "Target role must be at least 2 characters.")
    .max(150),
  jobLevel: z.nativeEnum(JobLevel),
  interviewType: z.nativeEnum(InterviewType),
  resumeFile: z
    .custom<FileList>((val) => val instanceof FileList, "Resume is required.")
    .refine((files) => files.length > 0, "Resume is required.")
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE,
      `Max file size is 10MB.`
    )
    .refine(
      (files) => ALLOWED_FILE_TYPES.includes(files?.[0]?.type),
      ".pdf, .docx, and .txt files are supported."
    )
    .optional(), // Making it optional as per original thought, can be required if needed
});

type LiveInterviewFormValues = z.infer<typeof formSchema>;

// Default values can be fetched or set based on user profile later
const defaultValues: Partial<LiveInterviewFormValues> = {
  userName: "",
  targetRole: "",
  jobLevel: JobLevel.ENTRY_LEVEL,
  interviewType: InterviewType.MIXED,
};

export function LiveInterviewSetupForm({
  userProfile,
}: {
  userProfile?: { name?: string | null };
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LiveInterviewFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      userName: userProfile?.name || "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: LiveInterviewFormValues) => {
    setIsLoading(true);
    toast.loading("Setting up your interview...", { id: "interview-setup" });

    let resumeFileData: ResumeFile | undefined = undefined;

    if (data.resumeFile && data.resumeFile.length > 0) {
      const file = data.resumeFile[0];
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () =>
            resolve((reader.result as string).split(",")[1]);
          reader.onerror = (error) => reject(error);
        });
        resumeFileData = {
          base64Data,
          name: file.name,
          type: file.type,
          size: file.size,
        };
      } catch (error) {
        console.error("Error processing resume file:", error);
        toast.error("Error processing resume file. Please try again.", {
          id: "interview-setup",
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      const newInterview = await createLiveInterviewSetup({
        userName: data.userName,
        targetRole: data.targetRole,
        jobLevel: data.jobLevel,
        interviewType: data.interviewType,
        resumeFile: resumeFileData,
      });

      toast.success("Interview setup successful! Redirecting...", {
        id: "interview-setup",
      });
      router.push(`/interview/live/${newInterview.id}`);
    } catch (error) {
      console.error("Failed to create live interview:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to set up interview. Please try again.",
        { id: "interview-setup" }
      );
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="userName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Jane Doe" {...field} />
              </FormControl>
              <FormDescription>
                This name will be used by the interviewer.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetRole"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Role</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Software Engineer, Product Manager"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                What role are you practicing for?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="jobLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(JobLevel).map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the seniority level for this role.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="interviewType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interview Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an interview type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(InterviewType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the focus of your mock interview.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="resumeFile"
          render={({ field: { onChange, ...rest } }) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { value, ...inputProps } = rest; // Exclude value from inputProps for file input
            return (
              <FormItem>
                <FormLabel>Upload Resume (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        onChange(files);
                      }
                    }}
                    {...inputProps} // Spread the rest of the props, excluding value
                  />
                </FormControl>
                <FormDescription>
                  PDF, DOCX, or TXT file (Max 10MB). The interviewer will use
                  this to tailor questions.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Start Interview Setup
        </Button>
      </form>
    </Form>
  );
}
