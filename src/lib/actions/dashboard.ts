"use server";

import { db } from "@/lib/prisma";
import { getUserFromAuth } from "./auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { IndustryInsights } from "@/types/industry";

// Check if API key exists
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateAIInsights = async (industry: string | null) => {
  if (!industry) {
    throw new Error("Industry is required to generate insights");
  }

  const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }
          
          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

  return JSON.parse(cleanedText);
};

export const getIndustryInsights = async (): Promise<IndustryInsights | null> => {
  const user = await getUserFromAuth();
  if (!user) return null;

  // Find industry insight from database based on user's industry
  if (user.industry) {
    let industryInsight = await db.industryInsight.findUnique({
      where: { industry: user.industry },
    });

    // If no insights exist, generate them
    if (!industryInsight) {
      const insights = await generateAIInsights(user.industry);

      industryInsight = await db.industryInsight.create({
        data: {
          industry: user.industry,
          ...insights,
          nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return industryInsight as unknown as IndustryInsights;
  }

  return null;
};
