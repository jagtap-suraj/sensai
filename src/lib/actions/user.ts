"use server";

import { db } from "@/lib/prisma";
import { getUserFromAuth } from "@/lib/actions/auth";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

interface UpdateUserData {
  industry: string;
  experience: number;
  bio?: string;
  skills?: string[] | undefined;
  subIndustry: string;
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

export const getUserOnboardingStatus = async () => {
  const authUser = await getUserFromAuth();

  if (!authUser) {
    return { isOnboarded: false };
  }

  try {
    // We can directly check if the user has an industry
    return {
      isOnboarded: !!authUser?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
};
