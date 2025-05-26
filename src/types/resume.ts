export interface ContactInfo {
  firstName?: string;
  lastName?: string;
  email: string;
  countryCode?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  linkedin?: string;
  github?: string;
}

export interface Entry {
  id?: string;
  title: string;
  organization: string;
  location?: string;
  gpa?: string; // GPA field for education entries
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface Project {
  id?: string;
  title: string;
  organization?: string;
  technologies?: string;
  deployedLink?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface Certification {
  id?: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  description?: string;
}

export interface Coursework {
  id?: string;
  name: string;
}

export interface Skill {
  id?: string;
  category: string;
  name: string;
}

export interface ResumeFormData {
  contactInfo: ContactInfo;
  summary: string;
  coursework: Coursework[];
  skills: Skill[];
  experience: Entry[];
  education: Entry[];
  projects: Project[];
  leadership: Entry[];
  certifications: Certification[];
}

export interface Resume {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  countryCode?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  education: Entry[];
  experience: Entry[];
  projects: Project[];
  coursework: Coursework[];
  skills: Skill[];
  leadership: Entry[];
  certifications: Certification[];
  atsScore?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}
