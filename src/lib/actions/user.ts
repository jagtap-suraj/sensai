"use server";

import { db } from "@/lib/prisma";
import { getUserFromAuth } from "@/lib/actions/auth";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";
import { industries } from "@/data/industries";

interface UpdateUserData {
  industry: string;
  experience: number;
  bio?: string;
  skills?: string[] | undefined;
  subIndustry: string;
}

// Helper function to extract and convert subIndustry from industry string
function extractSubIndustry(industryString: string) {
  const parts = industryString.split("-");
  if (parts.length >= 2) {
    const industryId = parts[0];
    const slugifiedSubIndustry = parts.slice(1).join("-");

    // Find the industry in our data
    const industry = industries.find((ind) => ind.id === industryId);
    if (industry) {
      // Find the matching subIndustry by comparing slugified versions
      const subIndustry = industry.subIndustries.find(
        (sub) => sub.toLowerCase().replace(/ /g, "-") === slugifiedSubIndustry
      );
      return subIndustry || "";
    }
  }
  return "";
}

// Get user profile data
export async function getUserProfile() {
  const user = await getUserFromAuth();
  if (!user) return null;

  try {
    const userData = await db.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        industry: true,
        experience: true,
        bio: true,
        skills: true,
      },
    });

    if (!userData) return null;

    const industryString = userData.industry || "";

    return {
      industry: industryString,
      experience: userData.experience || 0,
      bio: userData.bio || "",
      skills: userData.skills || [],
      // Extract and convert subIndustry from the industry string
      subIndustry: extractSubIndustry(industryString),
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

// Get user onboarding status
export async function getUserOnboardingStatus() {
  const user = await getUserFromAuth();
  if (!user) return null;

  try {
    const userData = await db.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        industry: true,
      },
    });

    return {
      isOnboarded: !!userData?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return null;
  }
}

export const updateUser = async (data: UpdateUserData) => {
  const user = await getUserFromAuth();
  if (!user) return;

  try {
    // Start a transaction to handle both operations
    const result = await db.$transaction(
      async (tx) => {
        // First check if industry exists
        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // If industry doesn't exist, create it with default values
        if (!industryInsight) {
          const insights = await generateAIInsights(data.industry);

          industryInsight = await db.industryInsight.create({
            data: {
              industry: data.industry,
              ...insights,
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

        // Now update the user
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });

        return { updatedUser, industryInsight };
      },
      {
        timeout: 10000, // default: 5000
      }
    );

    // Revalidate multiple paths to ensure fresh data
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    revalidatePath("/profile");

    return {
      success: true,
      user: result.updatedUser,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error updating user and industry:", error.message);
      throw new Error("Failed to update profile");
    }
    return { success: false };
  }
};
