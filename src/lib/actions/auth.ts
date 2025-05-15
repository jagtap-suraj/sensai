"use server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export const getUserFromAuth = async () => {
  // Get the Clerk auth session
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Try to find the user in our database
  let dbUser = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  // If user doesn't exist in our database, create one from Clerk data
  if (!dbUser) {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      throw new Error("Clerk user not found");
    }

    // Create user record
    dbUser = await db.user.create({
      data: {
        clerkUserId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name:
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          null,
        imageUrl: clerkUser.imageUrl || null,
        skills: [],
      },
    });
  }

  return dbUser;
};
