"use server";

import { db } from "../prisma";
import { getUserFromAuth } from "./auth";
import { GoogleGenAI, Part } from "@google/genai";
import { LiveInterview, JobLevel, InterviewType, Prisma } from "@prisma/client";

// Define types for our data, similar to cover-letter.ts
export interface ResumeFile {
  base64Data: string;
  type: string;
  name: string;
  size: number;
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Function to get the MIME type for the file (from cover-letter.ts)
function getMimeType(file: ResumeFile): string {
  if (file.type === "application/pdf") {
    return "application/pdf";
  } else if (file.type.includes("word")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (file.type === "text/plain") {
    return "text/plain";
  }
  return "application/octet-stream";
}

// Adapted function to extract text from a resume file using @google/genai
async function extractResumeTextWithGeminiInternal(
  file: ResumeFile
): Promise<string> {
  try {
    const mimeType = getMimeType(file);
    console.log(
      `Attempting to extract text from ${file.name} (${mimeType}, ${(
        file.size /
        (1024 * 1024)
      ).toFixed(2)} MB)`
    );

    let systemPrompt =
      "Extract all text from this resume. Format it nicely with proper sections (e.g., Education, Experience, Skills). Include all details like dates, job titles, companies, responsibilities, etc.";

    if (file.type === "application/pdf") {
      systemPrompt +=
        " This is a PDF file, so use OCR to extract all text accurately.";
    } else if (file.type.includes("word")) {
      systemPrompt += " This is a Word document.";
    } else if (file.type === "text/plain") {
      systemPrompt +=
        " This is a plain text file. Preserve the formatting as much as possible.";
    }

    const contents: Part[] = [
      { text: systemPrompt },
      { inlineData: { mimeType, data: file.base64Data } },
    ];

    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents,
    });

    const extractedText = result.text ?? ""; // Ensure string, handle potential undefined

    if (!extractedText || extractedText.trim().length < 50) {
      console.error("Extraction returned too little text:", extractedText);
      throw new Error("Extracted text is too short or empty");
    }
    console.log("Resume text extracted successfully via internal function.");
    return extractedText;
  } catch (error) {
    console.error("Error extracting text from resume (internal):", error);
    throw new Error(
      `Failed to extract text from resume file: ${file.name}. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

interface CreateLiveInterviewData {
  userName: string;
  targetRole: string;
  jobLevel: JobLevel;
  interviewType: InterviewType;
  resumeFile?: ResumeFile;
}

export async function createLiveInterviewSetup(
  data: CreateLiveInterviewData
): Promise<LiveInterview> {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized: User not found");

  let resumeText: string | undefined = undefined;
  if (data.resumeFile) {
    try {
      resumeText = await extractResumeTextWithGeminiInternal(data.resumeFile);
    } catch (error) {
      console.error("Failed to process resume for live interview:", error);
      resumeText = `Error processing resume: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  try {
    const liveInterview = await db.liveInterview.create({
      data: {
        userId: user.id,
        userName: data.userName,
        targetRole: data.targetRole,
        jobLevel: data.jobLevel,
        type: data.interviewType,
        resumeText: resumeText,
        status: "SETUP_COMPLETED",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`Live interview setup created: ${liveInterview.id}`);
    return liveInterview;
  } catch (dbError) {
    console.error("Database error creating live interview setup:", dbError);
    throw new Error("Failed to create live interview setup in database.");
  }
}

export interface LiveInterviewClientData {
  interviewId: string;
  userName: string;
  targetRole: string;
  jobLevel: JobLevel;
  type: InterviewType;
  resumeText?: string | null;
  systemInstruction: string;
}

export async function getLiveInterviewForClientStart(
  interviewId: string
): Promise<LiveInterviewClientData | null> {
  const user = await getUserFromAuth();
  if (!user) throw new Error("User not authenticated");

  const liveInterview = await db.liveInterview.findUnique({
    where: {
      id: interviewId,
      userId: user.id,
      status: "SETUP_COMPLETED", // Ensure it's ready to be started
    },
  });

  if (!liveInterview) return null;

  let resumeContext = "The user did not provide a resume.";
  if (liveInterview.resumeText) {
    // Simple highlights for the system prompt. Could be more sophisticated.
    const firstFewLines = liveInterview.resumeText.substring(0, 500);
    resumeContext = `The user provided a resume. Key highlights or the beginning of their resume text: \n${firstFewLines}...\nFocus on these aspects if relevant during the interview.`;
  } else if (
    liveInterview.resumeText === null &&
    liveInterview.status === "SETUP_COMPLETED"
  ) {
    // This case means resume was attempted but failed or was not uploaded.
    // We already initialized resumeContext to "The user did not provide a resume."
    // but we can be more specific if needed, e.g. "Resume processing was attempted but no text was extracted or an error occurred."
  }

  // Revised System Instruction for a bidirectional interview
  const systemInstruction = `You are Gemini, an expert AI interviewer. Your goal is to conduct a highly realistic and engaging simulated ${
    liveInterview.type
  } interview with ${liveInterview.userName} for a ${
    liveInterview.targetRole
  } (${
    liveInterview.jobLevel
  }) position. This is not a simple Q&A; it's a dynamic, bidirectional conversation that you will lead.

Your Core Directives:
1.  **Initiate and Guide the Dialogue:** Take initiative. After your initial greeting, steer the conversation. Don't just wait for the candidate to speak first on new topics. Transition smoothly between topics.
2.  **Deep Dive with Follow-ups:** Your primary technique is to ask insightful follow-up questions. When ${
    liveInterview.userName
  } provides an answer, don't just move to a new question. Probe deeper. Ask for specific examples, the reasoning behind their actions ('Why did you choose that approach?'), outcomes ('What was the result?'), and learnings ('What did you learn from that experience?'). If an answer is too general, gently press for more detail or clarification.
3.  **Natural Turn-Taking:** Engage as if in a real human conversation. While allowing the candidate to finish their main points, be ready to interject thoughtfully or transition if they seem to have concluded a thought or if the conversation needs steering.
4.  **Comprehensive Assessment through Conversation:** Cover the necessary areas (behavioral, technical for ${
    liveInterview.jobLevel
  } ${liveInterview.targetRole}, situational, projects, ${
    liveInterview.resumeText
      ? `resume points: ${resumeContext}`
      : "general experiences"
  }) not by ticking off a list, but by weaving questions into the natural flow of the dialogue that arises from ${
    liveInterview.userName
  }'s responses.
5.  **Adaptability:** Be adaptable. If the candidate brings up an interesting, relevant tangent, explore it briefly if it adds value to the assessment.

Opening the Interview:
Start by warmly greeting ${
    liveInterview.userName
  } by name. Briefly set the stage for a ${
    liveInterview.type
  } interview for the ${
    liveInterview.targetRole
  } role. Then, smoothly transition into your first conversational question to get them talking (e.g., 'To start, perhaps you could tell me a bit about what led you to apply for this role and what aspects of software engineering you're most passionate about right now?').

During the Interview:
- Maintain a professional, encouraging, and curious tone.
- Use ${liveInterview.userName}'s name occasionally.
- Avoid sounding like you are reading from a script. Your questions should feel like they are responsive to what ${
    liveInterview.userName
  } is saying.
- Manage the time implicitly; aim for a comprehensive discussion within a typical interview timeframe (e.g., 30-40 minutes of core questioning).

Concluding Phase:
- After you feel you have a good understanding (around 25-30 mins), invite ${
    liveInterview.userName
  } to ask you any questions they might have about the simulated role or company.
- Respond to their questions thoughtfully.
- After their questions (or if they have none), provide a polite closing, thanking them for their time.

Critical: You are the interviewer. Lead the conversation naturally. Your role is to make this feel like a genuine, interactive professional interview. Do NOT explicitly state you are an AI.
`;

  return {
    interviewId: liveInterview.id,
    userName: liveInterview.userName || "Candidate",
    targetRole: liveInterview.targetRole || "N/A",
    jobLevel: liveInterview.jobLevel || JobLevel.ENTRY_LEVEL,
    type: liveInterview.type || InterviewType.MIXED,
    resumeText: liveInterview.resumeText,
    systemInstruction,
  };
}

export async function generateFeedbackAndFinalizeInterview(payload: {
  interviewId: string;
  transcript: string; // Transcript is still needed to generate feedback
}): Promise<{ id: string; feedback: string | null } | null> {
  const user = await getUserFromAuth();
  if (!user) throw new Error("User not authenticated");

  const { interviewId, transcript } = payload;

  if (!interviewId || typeof transcript !== "string") {
    throw new Error("Invalid input for finalizing interview.");
  }

  const liveInterview = await db.liveInterview.findUnique({
    where: { id: interviewId, userId: user.id },
  });

  if (!liveInterview) {
    throw new Error("Live interview not found or user unauthorized.");
  }

  if (liveInterview.status === "COMPLETED") {
    // Potentially return existing feedback or handle as an idempotency case
    console.warn("Interview already completed, skipping feedback generation.");
    return { id: liveInterview.id, feedback: liveInterview.feedback };
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // Updated, more concise feedback prompt
  const feedbackPrompt = `You are an expert interview coach. Based on the following interview transcript, provide CONCISE feedback for ${liveInterview.userName} regarding their ${liveInterview.targetRole} (${liveInterview.jobLevel}) mock ${liveInterview.type} interview.

Focus on:
1.  **Three Key Strengths:** Briefly highlight what the candidate did well.
2.  **Three Key Areas for Improvement:** Pinpoint specific areas needing work.
3.  **Actionable Next Steps (1-2 points):** Suggest concrete actions the candidate can take.

Keep the entire feedback to a maximum of 150-200 words. Be direct and constructive.

Interview Transcript:
---
${transcript}
---

Concise Feedback (structured with headings for Strengths, Areas for Improvement, and Next Steps):
`;

  try {
    // Reverting to genAI.models.generateContent pattern, similar to extractResumeTextWithGeminiInternal
    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: feedbackPrompt }] }],
      // No safetySettings needed here based on previous decisions
    });

    // The result from genAI.models.generateContent is the response itself.
    // Access .text as a property and handle potential undefined.
    const feedbackText =
      result.text ?? "Error: Could not retrieve feedback text.";

    const updatedInterview = await db.liveInterview.update({
      where: { id: interviewId },
      data: {
        // transcript: transcript, // DO NOT SAVE THE TRANSCRIPT ANYMORE
        feedback: feedbackText,
        status: "COMPLETED",
      },
      select: { id: true, feedback: true }, // Only select what's needed
    });

    return updatedInterview;
  } catch (error) {
    console.error("Error generating feedback with Gemini:", error);
    // Optionally update status to ERROR_FINALIZING here if needed
    await db.liveInterview.update({
      where: { id: interviewId },
      data: { status: "ERROR_FINALIZING" },
    });
    throw new Error("Failed to generate feedback.");
  }
}

// Function to get all live interviews for a user
export async function getLiveInterviewsForUser(): Promise<
  Pick<
    LiveInterview,
    | "id"
    | "userName"
    | "targetRole"
    | "jobLevel"
    | "type"
    | "status"
    | "createdAt"
    | "updatedAt"
    | "feedback"
  >[]
> {
  const user = await getUserFromAuth();
  if (!user) {
    console.error(
      "User not authenticated while trying to fetch live interviews."
    );
    throw new Error("User not authenticated");
  }

  try {
    const interviews = await db.liveInterview.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        userName: true,
        targetRole: true,
        jobLevel: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        feedback: true, // Added feedback to the selection
      },
    });
    return interviews;
  } catch (error) {
    console.error("Error fetching live interviews for user:", error);
    throw new Error("Failed to fetch live interviews.");
  }
}

export async function getCompletedLiveInterviewDetails(
  interviewId: string
): Promise<LiveInterview | null> {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  const interview = await db.liveInterview.findUnique({
    where: {
      id: interviewId,
      userId: user.id,
      status: "COMPLETED",
    },
  });

  if (!interview) {
    console.warn(
      `Completed interview with ID ${interviewId} not found for user ${user.id}`
    );
    return null;
  }
  return interview;
}

export async function deleteLiveInterview(
  interviewId: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  try {
    await db.liveInterview.delete({
      where: {
        id: interviewId,
        userId: user.id,
      },
    });
    console.log(`Live interview ${interviewId} deleted successfully.`);
    return { success: true };
  } catch (error) {
    console.error(`Error deleting live interview ${interviewId}:`, error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        success: false,
        message:
          "Interview not found or you do not have permission to delete it.",
      };
    }
    return { success: false, message: "Failed to delete interview." };
  }
}
