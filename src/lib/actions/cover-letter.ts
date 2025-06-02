"use server";

import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserFromAuth } from "./auth";
import {
  Resume,
  Education,
  Experience,
  Project,
  Skill,
  User,
} from "@prisma/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Define types for our data
export interface ResumeFile {
  base64Data: string;
  type: string;
  name: string;
  size: number;
}

interface CoverLetterData {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  resumeFile?: ResumeFile;
  resumeText?: string;
}

// Function to get the MIME type for the file
function getMimeType(file: ResumeFile): string {
  // Map common file types to MIME types
  if (file.type === "application/pdf") {
    return "application/pdf";
  } else if (file.type.includes("word")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (file.type === "text/plain") {
    return "text/plain";
  }
  // Default to octet-stream if unknown
  return "application/octet-stream";
}

// Function to extract text from a resume file using Gemini
export async function extractResumeTextWithGemini(
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

    // Create a multimodal model
    const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create a prompt based on file type
    let prompt =
      "Extract all text from this resume. Format it nicely with proper sections (e.g., Education, Experience, Skills). Include all details like dates, job titles, companies, responsibilities, etc.";

    // Add file type specific instructions
    if (file.type === "application/pdf") {
      prompt +=
        " This is a PDF file, so use OCR to extract all text accurately.";
    } else if (file.type.includes("word")) {
      prompt += " This is a Word document.";
    } else if (file.type === "text/plain") {
      prompt +=
        " This is a plain text file. Preserve the formatting as much as possible.";
    }

    // Send to Gemini
    try {
      console.log("Sending request to Gemini API...");

      const result = await visionModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: file.base64Data,
          },
        },
      ]);

      // Log the full response for debugging
      console.log("Gemini API Response:", {
        finishReason: result.response.promptFeedback?.blockReason || "NORMAL",
        status: "SUCCESS",
        candidates:
          result.response.candidates?.map((c) => ({
            finishReason: c.finishReason,
            safetyRatings: c.safetyRatings,
          })) || [],
        textLength: result.response.text().length,
        textPreview: result.response.text().substring(0, 100) + "...",
      });

      const extractedText = result.response.text();

      // Check if we got a meaningful response
      if (!extractedText || extractedText.trim().length < 50) {
        console.error("Extraction returned too little text:", extractedText);
        throw new Error("Extracted text is too short or empty");
      }

      return extractedText;
    } catch (apiError: unknown) {
      // Log detailed error information
      console.error("Gemini API error:", {
        error: apiError instanceof Error ? apiError.message : String(apiError),
        status: (apiError as Record<string, unknown>).status || "UNKNOWN",
        statusCode:
          (apiError as Record<string, unknown>).statusCode || "UNKNOWN",
        details:
          (apiError as Record<string, unknown>).details ||
          "No details available",
        fullError: JSON.stringify(apiError),
      });

      throw new Error(
        `Gemini API error: ${
          apiError instanceof Error ? apiError.message : String(apiError)
        }`
      );
    }
  } catch (error) {
    console.error("Error extracting text from resume:", error);
    return `Failed to extract text from resume file: ${file.name}. Please try a different file format or enter your resume details manually.`;
  }
}

// Function to get resume data from the database
async function getResumeData(userId: string) {
  try {
    const resume = await db.resume.findUnique({
      where: { userId },
      include: {
        education: true,
        experience: true,
        projects: true,
        skills: true,
        leadership: true,
        certifications: true,
      },
    });

    return resume;
  } catch (error) {
    console.error("Error fetching resume data:", error);
    return null;
  }
}

// Function to get user data
async function getUserData(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    return user;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

// Define a type for the resume data with relations
interface ResumeWithRelations extends Resume {
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: Skill[];
  leadership: {
    title: string;
    organization: string;
    startDate: Date;
    endDate?: Date | null;
    current: boolean;
    description: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date | null;
  }[];
}

// Function to format resume data into a string
function formatResumeData(
  resume: ResumeWithRelations | null,
  userData: User | null = null
): string {
  if (!resume) return "";

  // Get user name from resume or user data
  const firstName = resume.firstName || userData?.name?.split(" ")[0] || "";
  const lastName =
    resume.lastName || userData?.name?.split(" ").slice(1).join(" ") || "";
  const fullName = `${firstName} ${lastName}`.trim();

  const formattedResume = `
Name: ${fullName || "[NAME PLACEHOLDER]"}
Email: ${resume.email || userData?.email || ""}
Phone: ${resume.phone || ""}
LinkedIn: ${resume.linkedin || ""}
GitHub: ${resume.github || ""}

Summary:
${resume.summary || ""}

Experience:
${resume.experience
  .map(
    (exp) => `
- ${exp.title} at ${exp.organization} (${new Date(
      exp.startDate
    ).getFullYear()} - ${
      exp.current ? "Present" : new Date(exp.endDate as Date).getFullYear()
    })
  ${exp.description}
`
  )
  .join("")}

Education:
${resume.education
  .map(
    (edu) => `
- ${edu.title} from ${edu.organization} (${new Date(
      edu.startDate
    ).getFullYear()} - ${
      edu.current ? "Present" : new Date(edu.endDate as Date).getFullYear()
    })
  ${edu.gpa ? `GPA: ${edu.gpa}` : ""}
`
  )
  .join("")}

Skills:
${resume.skills.map((skill) => `- ${skill.name}`).join(", ")}

Projects:
${resume.projects
  .map(
    (project) => `
- ${project.title}
  ${project.description}
  ${project.technologies ? `Technologies: ${project.technologies}` : ""}
`
  )
  .join("")}
`;

  return formattedResume;
}

// Step 1: Process the resume file and return the extracted text
export async function processResumeFile(file: ResumeFile): Promise<string> {
  try {
    console.log(
      `Processing resume file: ${file.name} (${file.type}, ${(
        file.size /
        (1024 * 1024)
      ).toFixed(2)} MB)`
    );

    // Check file size
    if (file.size > 10 * 1024 * 1024) {
      // 10MB
      console.error(
        "File too large:",
        (file.size / (1024 * 1024)).toFixed(2) + "MB"
      );
      return "Failed to extract text from resume file: File size exceeds 10MB limit. Please upload a smaller file.";
    }

    // Extract text using Gemini
    const result = await extractResumeTextWithGemini(file);

    // Log the result status
    if (result.startsWith("Failed to extract text")) {
      console.error("Text extraction failed with error message:", result);
    } else {
      console.log(
        "Text extraction successful, extracted length:",
        result.length
      );
    }

    return result;
  } catch (error) {
    console.error("Error in processResumeFile:", error);
    return `Failed to process resume file: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

// Step 2: Generate the cover letter using the extracted text
export async function generateCoverLetter(data: CoverLetterData) {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  let resumeText = data.resumeText || "";
  let candidateName = "";

  // Get user data for name
  const userData = await getUserData(user.id);
  if (userData?.name) {
    candidateName = userData.name;
  }

  // If resumeText wasn't provided but we have a resumeFile, extract text from it
  if (!resumeText && data.resumeFile) {
    resumeText = await extractResumeTextWithGemini(data.resumeFile);

    // Check if extraction failed
    if (resumeText.startsWith("Failed to extract text")) {
      console.error("Resume text extraction failed:", resumeText);
      // We'll continue with empty resume text rather than failing the whole process
      resumeText = "";
    }
  }
  // If no resumeText or resumeFile, try to get resume data from the database
  else if (!resumeText) {
    const resumeData = await getResumeData(user.id);
    if (resumeData) {
      resumeText = formatResumeData(resumeData, userData);
      // Try to extract name from resume data
      if (!candidateName && resumeData.firstName && resumeData.lastName) {
        candidateName = `${resumeData.firstName} ${resumeData.lastName}`;
      }
    }
  }

  // Log the extracted resume text to the console
  console.log(
    "Resume text for cover letter generation:",
    resumeText
      ? `${resumeText.substring(0, 100)}...`
      : "No resume text available"
  );
  console.log(
    "Candidate name for cover letter generation:",
    candidateName || "No name available"
  );

  // Create a prompt for Gemini
  const prompt = `
You are a professional cover letter writer. Write a cover letter for a job application with the following details:

Job Title: ${data.jobTitle}
Company: ${data.companyName}
Job Description: ${data.jobDescription}

${
  resumeText
    ? `Candidate's Resume/Background: ${resumeText}`
    : "Note: No resume information is available. Create a general cover letter based on the job description only."
}
${candidateName ? `Candidate's Name: ${candidateName}` : ""}

Requirements:
1. Use a conversational, friendly but professional tone (not overly formal)
2. Highlight relevant skills and experience that match the job description
3. Show understanding of the company's needs
4. Keep it concise (max 400 words)
5. Use proper business letter formatting in markdown
6. Include specific examples of achievements from the resume
7. Relate candidate's background to job requirements
8. Make it sound natural and human-written, not AI-generated
9. Be specific and personalized, not generic
10. Format the letter in markdown

Style Guidelines:
- Use contractions (e.g., "I'm" instead of "I am") for a more conversational tone
- Include a touch of enthusiasm and personality
- Avoid clichés and overly formal language
- Use active voice and strong verbs

Output Format:
- Start with the current date (${new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })})
- Include proper greeting
- Have 3-4 paragraphs (introduction, 1-2 body paragraphs, conclusion)
- Include a professional closing

CRITICAL INSTRUCTIONS ABOUT PLACEHOLDERS:
1. DO NOT include ANY placeholders whatsoever in the letter. This is extremely important.
2. DO NOT use phrases like "[Platform where candidate saw the advertisement]", "[Insert information]", or anything in brackets, parentheses, or angle brackets that suggests missing information.
3. DO NOT include text like "e.g." or "such as" when referring to specific details.
4. If you don't have specific information (like where the candidate found the job posting):
   - OMIT that detail entirely rather than guessing or using a placeholder
   - Rewrite the sentence to avoid needing that information
   - For example, instead of "I saw your job posting on [platform]", write "I'm excited about the job opportunity at [company]"
5. For the opening, use "Dear Hiring Manager," or "Dear [Company Name] Hiring Team," if no specific recipient is provided
6. For the signature, use just the candidate's name if provided, or simply "Sincerely," if no name is available
7. NEVER mention that information is missing or that you're making assumptions

Remember: A complete letter with no placeholders is better than one with gaps for missing information. Adapt the content to work with the information you have.
`;

  try {
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    // Log the generated content
    console.log("Generated cover letter content:", content);

    const coverLetter = await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    return coverLetter;
  } catch (error: unknown) {
    console.error(
      "Error generating cover letter:",
      error instanceof Error ? error.message : String(error)
    );
    throw new Error("Failed to generate cover letter");
  }
}

export async function getCoverLetters() {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  return await db.coverLetter.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCoverLetter(id: string) {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  return await db.coverLetter.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function updateCoverLetter(id: string, content: string) {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  return await db.coverLetter.update({
    where: {
      id,
      userId: user.id,
    },
    data: {
      content,
    },
  });
}

export async function deleteCoverLetter(id: string) {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  return await db.coverLetter.delete({
    where: {
      id,
      userId: user.id,
    },
  });
}
