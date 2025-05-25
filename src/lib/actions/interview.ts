"use server";

import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserFromAuth } from "./auth";
import {
  QuizQuestion,
  QuestionResult,
  AssessmentResult,
} from "@/types/interview";
import { Prisma } from "@prisma/client";

// Check if API key exists
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateQuiz(): Promise<QuizQuestion[] | null> {
  const authUser = await getUserFromAuth();
  if (!authUser) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: authUser.clerkUserId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const prompt = `
    Generate 10 technical interview questions for a ${
      user.industry
    } professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
    
    Each question should be multiple choice with 4 options.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

export async function saveQuizResult(
  questions: QuizQuestion[],
  answers: string[],
  score: number
): Promise<AssessmentResult | null> {
  const authUser = await getUserFromAuth();
  if (!authUser) {
    return null;
  }

  // Verify input data
  if (
    !Array.isArray(questions) ||
    !Array.isArray(answers) ||
    typeof score !== "number"
  ) {
    throw new Error("Invalid input data");
  }

  const questionResults: QuestionResult[] = questions.map(
    (q: QuizQuestion, index: number) => ({
      question: q.question,
      answer: q.correctAnswer,
      userAnswer: answers[index] || "",
      isCorrect: q.correctAnswer === answers[index],
      explanation: q.explanation,
    })
  );

  // Get wrong answers
  const wrongAnswers = questionResults.filter(
    (q: QuestionResult) => !q.isCorrect
  );

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q: QuestionResult) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${
        authUser.industry || "technical"
      } technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResult = await model.generateContent(improvementPrompt);
      improvementTip = tipResult.response.text().trim();
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: authUser.id,
        quizScore: score,
        questions: questionResults as unknown as Prisma.InputJsonValue[],
        category: "Technical",
        improvementTip,
      },
    });

    const result: AssessmentResult = {
      id: assessment.id,
      userId: assessment.userId,
      quizScore: assessment.quizScore,
      questions: assessment.questions as unknown as QuestionResult[],
      category: assessment.category,
      improvementTip: assessment.improvementTip,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
    };

    return result;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments(): Promise<AssessmentResult[] | null> {
  const authUser = await getUserFromAuth();
  if (!authUser) {
    return null;
  }

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: authUser.id,
      },
      orderBy: {
        createdAt: "desc", // Newest first
      },
    });

    return assessments.map((assessment) => ({
      id: assessment.id,
      userId: assessment.userId,
      quizScore: assessment.quizScore,
      questions: assessment.questions as unknown as QuestionResult[],
      category: assessment.category,
      improvementTip: assessment.improvementTip,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
    }));
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
