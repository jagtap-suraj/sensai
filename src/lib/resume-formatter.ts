import {
  Resume,
  Entry,
  Coursework,
  Skill,
  Project,
  Certification,
} from "@/types/resume";
import fs from "fs";
import path from "path";

// Helper function to escape LaTeX special characters
function escapeLatex(text: string): string {
  if (!text) return "";

  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/</g, "\\textless{}")
    .replace(/>/g, "\\textgreater{}");
}

// Format date to Month Year format
function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "Present";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Format education entries
function formatEducation(education: Entry[]): string {
  if (!education.length) return "";

  let result = `\\section{Education}\n  \\resumeSubHeadingListStart\n`;

  education.forEach((edu) => {
    // Format GPA based on content
    let gpaText = "";
    if (edu.gpa) {
      // If it contains % sign, don't add "GPA:" prefix
      if (edu.gpa.includes("%")) {
        gpaText = ` (${escapeLatex(edu.gpa)})`;
      } else {
        // Otherwise use the regular "GPA:" prefix
        gpaText = ` (GPA: ${escapeLatex(edu.gpa)})`;
      }
    }

    result += `    \\resumeSubheading
      {${escapeLatex(edu.organization)}}{${formatDate(edu.startDate)} -- ${
      edu.current ? "Present" : formatDate(edu.endDate)
    }}
      {${escapeLatex(edu.title)}${gpaText}}{${escapeLatex(
      edu.location || ""
    )}}\n`;

    // Add description if available
    if (edu.description && edu.description.trim()) {
      result += `      \\resumeItemListStart\n`;

      // Split description by newlines or periods to create bullet points
      const bullets = edu.description
        .replace(/\. /g, ".\n")
        .split(/\n/)
        .filter(Boolean);
      bullets.forEach((bullet) => {
        if (bullet.trim()) {
          result += `        \\resumeItem{${escapeLatex(bullet.trim())}}\n`;
        }
      });

      result += `      \\resumeItemListEnd\n`;
    }
  });

  result += `  \\resumeSubHeadingListEnd\n\n`;
  return result;
}

// Format coursework
function formatCoursework(coursework: Coursework[]): string {
  if (!coursework.length) return "";

  let result = `\\section{Relevant Coursework}\n\n`;
  result += `        \\begin{multicols}{4}\n`;
  result += `            \\begin{itemize}[itemsep=-5pt, parsep=3pt]\n`;

  coursework.forEach((course) => {
    result += `                \\item\\small ${escapeLatex(course.name)}\n`;
  });

  result += `            \\end{itemize}\n`;
  result += `        \\end{multicols}\n`;
  result += `        \\vspace*{2.0\\multicolsep}\n\n\n`;

  return result;
}

// Format experience entries
function formatExperience(experience: Entry[]): string {
  if (!experience.length) return "";

  let result = `\\section{Experience}\n  \\resumeSubHeadingListStart\n\n`;

  experience.forEach((exp) => {
    result += `    \\resumeSubheading
      {${escapeLatex(exp.organization)}}{${formatDate(exp.startDate)} -- ${
      exp.current ? "Present" : formatDate(exp.endDate)
    }}
      {${escapeLatex(exp.title)}}{${escapeLatex(exp.location || "")}}\n`;

    result += `      \\resumeItemListStart\n`;

    // Split description by newlines or periods to create bullet points
    const bullets = exp.description
      .replace(/\. /g, ".\n")
      .split(/\n/)
      .filter(Boolean);
    bullets.forEach((bullet) => {
      if (bullet.trim()) {
        result += `        \\resumeItem{${escapeLatex(bullet.trim())}}\n`;
      }
    });

    result += `      \\resumeItemListEnd\n\n`;
  });

  result += `  \\resumeSubHeadingListEnd\n\\vspace{-16pt}\n\n\n`;
  return result;
}

// Format projects - match the exact spacing from the provided example
function formatProjects(projects: Project[]): string {
  if (!projects.length) return "";

  let result = `\\section{Projects}\n    \\vspace{-5pt}\n    \\resumeSubHeadingListStart\n`;

  projects.forEach((proj) => {
    // Build the project title with technologies and deployed link
    let projectHeader = `\\textbf{${escapeLatex(proj.title)}}`;

    // Add technologies if available
    if (proj.technologies) {
      projectHeader += ` $|$ ${escapeLatex(proj.technologies)}`;
    }

    // Add deployed link if available with underline
    if (proj.deployedLink) {
      projectHeader += ` $|$ \\underline{\\href{${proj.deployedLink}}{Deployed Link}}`;
    }

    // Format the date display
    let dateText = "";
    if (proj.startDate && proj.endDate) {
      dateText = `${formatDate(proj.startDate)} - ${formatDate(proj.endDate)}`;
    } else if (proj.startDate && !proj.endDate) {
      dateText = `${formatDate(proj.startDate)}`;
    } else if (!proj.startDate && proj.endDate) {
      dateText = `Until ${formatDate(proj.endDate)}`;
    }

    result += `      \\resumeProjectHeading\n          {${projectHeader}}{${dateText}}\n`;

    result += `          \\resumeItemListStart\n`;

    // Split description by newlines or periods to create bullet points
    const bullets = proj.description
      .replace(/\. /g, ".\n")
      .split(/\n/)
      .filter(Boolean);
    bullets.forEach((bullet) => {
      if (bullet.trim()) {
        result += `            \\resumeItem{${escapeLatex(bullet.trim())}}\n`;
      }
    });

    result += `          \\resumeItemListEnd\n          \\vspace{-13pt}\n`;
  });

  result += `    \\resumeSubHeadingListEnd\n\\vspace{-4pt}\n\n\n`;
  return result;
}

// Format certifications
function formatCertifications(certifications: Certification[]): string {
  if (!certifications.length) return "";

  let result = `\\section{Certifications}\n    \\resumeSubHeadingListStart\n`;

  certifications.forEach((cert) => {
    // Build header with certification name and verify link similar to project title format
    let certHeader = `\\textbf{${escapeLatex(cert.name)}}`;

    // Add issuer if available
    if (cert.issuer) {
      certHeader += `\n${escapeLatex(cert.issuer)}`;
    }

    // Add credential link if available - match the project format with | separator
    if (cert.credentialUrl) {
      certHeader += ` $|$ \\underline{\\href{${cert.credentialUrl}}{Verify credential}}`;
    }

    // Add bullet point for credential ID
    const bulletPoints = [];
    if (cert.credentialId) {
      bulletPoints.push(`Credential ID: ${escapeLatex(cert.credentialId)}`);
    }

    // Add description as bullet points if available
    if (cert.description && cert.description.trim()) {
      const bullets = cert.description
        .replace(/\. /g, ".\n")
        .split(/\n/)
        .filter(Boolean);
      bulletPoints.push(
        ...bullets.map((bullet) => bullet.trim()).filter(Boolean)
      );
    }

    result += `      \\resumeSubheading
        {${certHeader}}
        {${formatDate(cert.issueDate)}${
      cert.expiryDate ? ` -- ${formatDate(cert.expiryDate)}` : ""
    }}
        {}{}`;

    // Add bullet points if we have any
    if (bulletPoints.length > 0) {
      result += `\n     \\vspace{-16pt}\n      \\resumeItemListStart\n`;

      bulletPoints.forEach((bullet) => {
        result += `        \\resumeItem{${escapeLatex(bullet)}}\n`;
      });

      result += `      \\resumeItemListEnd\n`;
    } else {
      result += `\n`;
    }
  });

  result += `    \\resumeSubHeadingListEnd\n\\vspace{-16pt}\n\n\n`;
  return result;
}

// Format skills
function formatSkills(skills: Skill[]): string {
  if (!skills.length) return "";

  // Group skills by category
  const skillsByCategory: Record<string, string[]> = {};

  skills.forEach((skill) => {
    if (!skillsByCategory[skill.category]) {
      skillsByCategory[skill.category] = [];
    }
    skillsByCategory[skill.category].push(skill.name);
  });

  let result = `\\section{Technical Skills}\n \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n`;

  // Add each category with simpler spacing
  Object.entries(skillsByCategory).forEach(([category, skillNames], index) => {
    // Join skills with comma and space
    const skillsText = skillNames.join(", ");
    result += `     \\textbf{${escapeLatex(category)}}{: ${escapeLatex(
      skillsText
    )}}`;

    // Add line break after each category except the last one
    if (index < Object.keys(skillsByCategory).length - 1) {
      result += ` \\\\\n`;
    }
  });

  result += `\n    }}\n \\end{itemize}\n \\vspace{-16pt}\n\n\n`;

  return result;
}

// Format leadership
function formatLeadership(leadership: Entry[]): string {
  if (!leadership.length) return "";

  let result = `\\section{Leadership / Extracurricular}\n    \\resumeSubHeadingListStart\n`;

  leadership.forEach((lead) => {
    result += `        \\resumeSubheading{${escapeLatex(
      lead.organization
    )}}{${formatDate(lead.startDate)} -- ${
      lead.current ? "Present" : formatDate(lead.endDate)
    }}{${escapeLatex(lead.title)}}{${escapeLatex(lead.location || "")}}\n`;

    result += `            \\resumeItemListStart\n`;

    // Split description by newlines or periods to create bullet points
    const bullets = lead.description
      .replace(/\. /g, ".\n")
      .split(/\n/)
      .filter(Boolean);
    bullets.forEach((bullet) => {
      if (bullet.trim()) {
        result += `                \\resumeItem{${escapeLatex(
          bullet.trim()
        )}}\n`;
      }
    });

    result += `            \\resumeItemListEnd\n`;
  });

  result += `        \n    \\resumeSubHeadingListEnd\n\n\n`;
  return result;
}

// Format contact info
function formatContactInfo(resume: Resume): string {
  const fullName =
    `${resume.firstName || ""} ${resume.lastName || ""}`.trim() || "Your Name";

  // Extract first part of summary as professional title
  let professionalTitle = "Full Stack Developer"; // Default title
  if (resume.summary) {
    // Try to extract a professional title from the summary (first sentence or first few words)
    const firstSentence = resume.summary.split(".")[0].trim();
    if (firstSentence.length < 50) {
      // If first sentence is short enough, use it
      professionalTitle = firstSentence;
    } else {
      // Otherwise use first few words
      const words = resume.summary.split(" ");
      if (words.length > 3) {
        professionalTitle = words.slice(0, 5).join(" ");
      }
    }
  }

  // Format address
  const address =
    resume.city && resume.state
      ? `${escapeLatex(resume.city)}, ${escapeLatex(resume.state)}`
      : resume.city || resume.state || "";

  let result = `\\begin{center}\n`;
  result += `    \\textbf{\\Huge \\scshape ${escapeLatex(
    fullName
  )}} \\\\ \\vspace{2pt}\n`;
  result += `    \\textbf{\\Large \\scshape ${escapeLatex(
    professionalTitle
  )}} \\\\ \\vspace{2pt}\n`;

  if (address) {
    result += `    \\faHome~${escapeLatex(address)} \\\\ \\vspace{6pt}\n`;
  }

  result += `    \\small\n`;

  // Phone
  if (resume.phone) {
    const formattedPhone = resume.countryCode
      ? `${resume.countryCode} ${resume.phone}`
      : resume.phone;
    result += `     \\href{tel:${resume.countryCode || ""}${
      resume.phone
    }}{\\faPhone~\\underline{${escapeLatex(formattedPhone)}}} \\quad\n`;
  }

  // Email
  result += `    \\href{mailto:${
    resume.email
  }}{\\faEnvelope~\\underline{${escapeLatex(resume.email)}}} \\quad\n`;

  // LinkedIn
  if (resume.linkedin) {
    const linkedinUsername = resume.linkedin.replace(
      /^https?:\/\/(www\.)?linkedin\.com\/in\//,
      "linkedin.com/in/"
    );
    result += `    \\href{${
      resume.linkedin
    }}{\\faLinkedin~\\underline{${escapeLatex(linkedinUsername)}}} \\quad\n`;
  }

  // GitHub
  if (resume.github) {
    const githubUsername = resume.github.replace(
      /^https?:\/\/(www\.)?github\.com\//,
      "github.com/"
    );
    result += `    \\href{${
      resume.github
    }}{\\faGithub~\\underline{${escapeLatex(githubUsername)}}}\\\\\n`;
  }

  result += `\\end{center}\n\n\n\n`;
  return result;
}

// Main function to format the resume into LaTeX
export function formatResumeToLatex(resume: Resume): string {
  // Read the LaTeX template
  const templatePath = path.join(process.cwd(), "src/lib/resume.tex");
  const template = fs.readFileSync(templatePath, "utf8");

  // Extract the preamble (everything before \begin{document})
  const preambleMatch = template.match(/([^]*?)\\begin\{document\}/);
  const preamble = preambleMatch ? preambleMatch[1] : "";

  // Start building the LaTeX document
  let latexContent = preamble + "\\begin{document}\n\n";

  // Add the contact info section
  latexContent += formatContactInfo(resume);

  // Add education section
  latexContent += formatEducation(resume.education);

  // Add coursework section if available
  latexContent += formatCoursework(resume.coursework);

  // Add experience section
  latexContent += formatExperience(resume.experience);

  // Add projects section
  latexContent += formatProjects(resume.projects);

  // Add certifications section
  latexContent += formatCertifications(resume.certifications);

  // Add skills section after projects
  latexContent += formatSkills(resume.skills);

  // Add leadership section
  latexContent += formatLeadership(resume.leadership);

  // Close the document
  latexContent += "\\end{document}";

  return latexContent;
}
