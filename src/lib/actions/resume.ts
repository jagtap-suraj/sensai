"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ResumeFormData, Resume } from "@/types/resume";
import { formatResumeToLatex } from "@/lib/resume-formatter";
import { getUserFromAuth } from "./auth";

export async function getResume() {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  try {
    // Use the correct include syntax
    const resume = await db.resume.findUnique({
      where: { userId: user.id },
      include: {
        education: true,
        experience: true,
        projects: true,
        skills: true,
        coursework: true,
        leadership: true,
        certifications: true,
      },
    });

    return resume;
  } catch (error) {
    console.error("Error fetching resume:", error);
    return null;
  }
}

export async function saveResume(formData: ResumeFormData) {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  try {
    // Check if resume exists
    const existingResume = await db.resume.findUnique({
      where: { userId: user.id },
    });

    // Prepare base resume data
    const baseResumeData = {
      firstName: formData.contactInfo.firstName || null,
      lastName: formData.contactInfo.lastName || null,
      email: formData.contactInfo.email,
      countryCode: formData.contactInfo.countryCode || null,
      phone: formData.contactInfo.phone || null,
      address: formData.contactInfo.address || null,
      city: formData.contactInfo.city || null,
      state: formData.contactInfo.state || null,
      zipCode: formData.contactInfo.zipCode || null,
      linkedin: formData.contactInfo.linkedin || null,
      github: formData.contactInfo.github || null,
      summary: formData.summary || null,
    };

    let resume;

    if (existingResume) {
      // Update existing resume
      resume = await db.resume.update({
        where: { id: existingResume.id },
        data: {
          ...baseResumeData,
          education: {
            deleteMany: {},
            create: formData.education.map((edu) => ({
              title: edu.title,
              organization: edu.organization,
              location: edu.location || null,
              gpa: edu.gpa || null,
              startDate: new Date(edu.startDate),
              endDate: edu.endDate ? new Date(edu.endDate) : null,
              current: edu.current,
              description: edu.description || null,
            })),
          },
          experience: {
            deleteMany: {},
            create: formData.experience.map((exp) => ({
              title: exp.title,
              organization: exp.organization,
              location: exp.location || null,
              startDate: new Date(exp.startDate),
              endDate: exp.endDate ? new Date(exp.endDate) : null,
              current: exp.current,
              description: exp.description,
            })),
          },
          projects: {
            deleteMany: {},
            create: formData.projects.map((proj) => ({
              title: proj.title,
              organization: proj.organization || null,
              technologies: proj.technologies || null,
              deployedLink: proj.deployedLink || null,
              startDate: proj.startDate ? new Date(proj.startDate) : null,
              endDate: proj.endDate ? new Date(proj.endDate) : null,
              current: proj.current,
              description: proj.description,
            })),
          },
          leadership: {
            deleteMany: {},
            create: formData.leadership.map((lead) => ({
              title: lead.title,
              organization: lead.organization,
              startDate: new Date(lead.startDate),
              endDate: lead.endDate ? new Date(lead.endDate) : null,
              current: lead.current,
              description: lead.description,
            })),
          },
          coursework: {
            deleteMany: {},
            create: formData.coursework.map((course) => ({
              name: course.name,
            })),
          },
          skills: {
            deleteMany: {},
            create: formData.skills.map((skill) => ({
              category: skill.category,
              name: skill.name,
            })),
          },
          certifications: {
            deleteMany: {},
            create: formData.certifications.map((cert) => ({
              name: cert.name,
              issuer: cert.issuer,
              issueDate: new Date(cert.issueDate),
              expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
              credentialId: cert.credentialId || null,
              credentialUrl: cert.credentialUrl || null,
              description: cert.description || null,
            })),
          },
        },
      });
    } else {
      // Create new resume
      resume = await db.resume.create({
        data: {
          userId: user.id,
          ...baseResumeData,
          education: {
            create: formData.education.map((edu) => ({
              title: edu.title,
              organization: edu.organization,
              location: edu.location || null,
              gpa: edu.gpa || null,
              startDate: new Date(edu.startDate),
              endDate: edu.endDate ? new Date(edu.endDate) : null,
              current: edu.current,
              description: edu.description || null,
            })),
          },
          experience: {
            create: formData.experience.map((exp) => ({
              title: exp.title,
              organization: exp.organization,
              location: exp.location || null,
              startDate: new Date(exp.startDate),
              endDate: exp.endDate ? new Date(exp.endDate) : null,
              current: exp.current,
              description: exp.description,
            })),
          },
          projects: {
            create: formData.projects.map((proj) => ({
              title: proj.title,
              organization: proj.organization || null,
              technologies: proj.technologies || null,
              deployedLink: proj.deployedLink || null,
              startDate: proj.startDate ? new Date(proj.startDate) : null,
              endDate: proj.endDate ? new Date(proj.endDate) : null,
              current: proj.current,
              description: proj.description,
            })),
          },
          leadership: {
            create: formData.leadership.map((lead) => ({
              title: lead.title,
              organization: lead.organization,
              startDate: new Date(lead.startDate),
              endDate: lead.endDate ? new Date(lead.endDate) : null,
              current: lead.current,
              description: lead.description,
            })),
          },
          coursework: {
            create: formData.coursework.map((course) => ({
              name: course.name,
            })),
          },
          skills: {
            create: formData.skills.map((skill) => ({
              category: skill.category,
              name: skill.name,
            })),
          },
          certifications: {
            create: formData.certifications.map((cert) => ({
              name: cert.name,
              issuer: cert.issuer,
              issueDate: new Date(cert.issueDate),
              expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
              credentialId: cert.credentialId || null,
              credentialUrl: cert.credentialUrl || null,
              description: cert.description || null,
            })),
          },
        },
      });
    }

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getLatexCode() {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  // Get resume data
  const resume = await getResume();
  if (!resume) throw new Error("Resume not found");

  // Generate LaTeX content
  // Convert database resume to the Resume type expected by the formatter
  const resumeData: Resume = {
    id: resume.id,
    userId: resume.userId,
    firstName: resume.firstName || (user.name ? user.name.split(" ")[0] : ""),
    lastName:
      resume.lastName ||
      (user.name ? user.name.split(" ").slice(1).join(" ") : ""),
    email: resume.email,
    countryCode: resume.countryCode || undefined,
    phone: resume.phone || undefined,
    address: resume.address || undefined,
    city: resume.city || undefined,
    state: resume.state || undefined,
    zipCode: resume.zipCode || undefined,
    linkedin: resume.linkedin || undefined,
    github: resume.github || undefined,
    summary: resume.summary || undefined,
    // Convert database entries to the Entry type
    education: resume.education.map((edu) => ({
      id: edu.id,
      title: edu.title,
      organization: edu.organization,
      location: edu.location || undefined,
      gpa: edu.gpa || undefined,
      startDate: edu.startDate.toISOString(),
      endDate: edu.endDate ? edu.endDate.toISOString() : undefined,
      current: edu.current,
      description: edu.description || "", // Empty string fallback for formatter
    })),
    experience: resume.experience.map((exp) => ({
      id: exp.id,
      title: exp.title,
      organization: exp.organization,
      location: exp.location || undefined,
      startDate: exp.startDate.toISOString(),
      endDate: exp.endDate ? exp.endDate.toISOString() : undefined,
      current: exp.current,
      description: exp.description || "",
    })),
    projects: resume.projects.map((proj) => ({
      id: proj.id,
      title: proj.title,
      organization: proj.organization || undefined,
      technologies: proj.technologies || undefined,
      deployedLink: proj.deployedLink || undefined,
      startDate: proj.startDate ? proj.startDate.toISOString() : undefined,
      endDate: proj.endDate ? proj.endDate.toISOString() : undefined,
      current: proj.current,
      description: proj.description || "",
    })),
    coursework: resume.coursework.map((course) => ({
      id: course.id,
      name: course.name,
    })),
    skills: resume.skills.map((skill) => ({
      id: skill.id,
      category: skill.category,
      name: skill.name,
    })),
    leadership: resume.leadership.map((lead) => ({
      id: lead.id,
      title: lead.title,
      organization: lead.organization,
      location: undefined, // leadership might not have location in DB
      startDate: lead.startDate.toISOString(),
      endDate: lead.endDate ? lead.endDate.toISOString() : undefined,
      current: lead.current,
      description: lead.description || "",
    })),
    certifications: resume.certifications.map((cert) => ({
      id: cert.id,
      name: cert.name,
      issuer: cert.issuer,
      issueDate: cert.issueDate.toISOString(),
      expiryDate: cert.expiryDate ? cert.expiryDate.toISOString() : undefined,
      credentialId: cert.credentialId || undefined,
      credentialUrl: cert.credentialUrl || undefined,
      description: cert.description || undefined,
    })),
    atsScore: resume.atsScore || undefined,
    feedback: resume.feedback || undefined,
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString(),
  };

  return formatResumeToLatex(resumeData);
}

export async function generateResumePdf() {
  const user = await getUserFromAuth();
  if (!user) throw new Error("Unauthorized");

  // Get resume data
  const resume = await getResume();
  if (!resume) throw new Error("Resume not found");

  // Generate LaTeX content using the getLatexCode function
  const latexContent = await getLatexCode();

  // Make API call to Advicement
  const apiKey = process.env.ADVICEMENT_API_KEY;
  if (!apiKey) throw new Error("API key not configured");

  try {
    const response = await fetch(
      "https://api.advicement.io/v1/templates/pub-tex-to-pdf-with-pdflatex-v1/compile",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Adv-Security-Token": apiKey,
        },
        body: JSON.stringify({
          texFileContent: latexContent,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Advicement API error:", errorText);
      throw new Error("Failed to generate PDF");
    }

    const data = await response.json();
    return { statusUrl: data.documentStatusUrl, latexContent };
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF");
  }
}

export async function checkPdfStatus(statusUrl: string) {
  if (!statusUrl) throw new Error("Status URL is required");

  try {
    // Fetch the status from the provided URL
    const response = await fetch(statusUrl);
    if (!response.ok) {
      throw new Error("Failed to check status");
    }

    return await response.json();
  } catch (error) {
    console.error("Error checking PDF status:", error);
    throw new Error("Failed to check PDF status");
  }
}

// Add a new function to proxy the PDF download through the server
export async function proxyPdfDownload(pdfUrl: string) {
  if (!pdfUrl) throw new Error("PDF URL is required");

  try {
    // Fetch the PDF through the server
    const response = await fetch(pdfUrl);

    if (!response.ok) {
      throw new Error("Failed to download PDF");
    }

    // Get the PDF as an ArrayBuffer
    const pdfBuffer = await response.arrayBuffer();

    // Return the PDF data
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    throw new Error("Failed to download PDF");
  }
}
