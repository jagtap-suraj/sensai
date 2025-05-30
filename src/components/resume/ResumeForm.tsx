"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Save, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { saveResume } from "@/lib/actions/resume";
import {
  Coursework,
  Entry,
  Resume,
  ResumeFormData,
  Skill,
  Project,
  Certification,
} from "@/types/resume";
import DownloadResumeButton from "@/components/resume/DownloadResumeButton";
import ViewLatexButton from "@/components/resume/ViewLatexButton";
import EntrySection from "@/components/resume/sections/EntrySection";
import CourseworkSection from "@/components/resume/sections/CourseworkSection";
import SkillsSection from "@/components/resume/sections/SkillsSection";
import ProjectSection from "@/components/resume/sections/ProjectSection";
import CertificationSection from "@/components/resume/sections/CertificationSection";
import { resumeSchema, ResumeFormValues } from "@/lib/schema";

interface ResumeFormProps {
  initialData?: Resume | null;
}

const ResumeForm = ({ initialData }: ResumeFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [isEditMode, setIsEditMode] = useState(!initialData);
  const [autoSaveEnabled] = useState(true);

  // Initialize form with data if available
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
    watch,
  } = useForm<ResumeFormValues>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contactInfo: {
        firstName: initialData?.firstName || "",
        lastName: initialData?.lastName || "",
        email: initialData?.email || "",
        countryCode: initialData?.countryCode || "+1",
        phone: initialData?.phone || "",
        address: initialData?.address || "",
        city: initialData?.city || "",
        state: initialData?.state || "",
        zipCode: initialData?.zipCode || "",
        linkedin: initialData?.linkedin || "",
        github: initialData?.github || "",
      },
      summary: initialData?.summary || "",
      coursework: initialData?.coursework || [],
      skills: initialData?.skills || [],
      experience: initialData?.experience || [],
      education: initialData?.education || [],
      projects: initialData?.projects || [],
      leadership: initialData?.leadership || [],
      certifications: initialData?.certifications || [],
    },
  });

  // Watch form values
  const formValues = watch();

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditMode) {
      // If currently in edit mode, submit the form
      handleSubmit(onSubmit)();
    } else {
      // If not in edit mode, enable editing
      setIsEditMode(true);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ResumeFormValues) => {
    try {
      setIsSubmitting(true);

      // Format the data for API
      const formattedData: ResumeFormData = {
        contactInfo: data.contactInfo,
        summary: data.summary,
        coursework: data.coursework as Coursework[],
        skills: data.skills as Skill[],
        experience: data.experience as Entry[],
        education: data.education as Entry[],
        projects: data.projects as Project[],
        leadership: data.leadership as Entry[],
        certifications: data.certifications as Certification[],
      };

      await saveResume(formattedData);
      toast.success("Resume saved successfully!");

      // Disable edit mode after successful save
      setIsEditMode(false);
    } catch (error) {
      console.error("Error saving resume:", error);
      toast.error("Failed to save resume");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-save function for individual section updates
  const handleSectionChange = useCallback(
    async (
      fieldName: keyof ResumeFormValues,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: any,
      shouldAutoSave: boolean = true
    ) => {
      // Update the form value
      setValue(fieldName, value);

      // Auto-save if enabled
      if (shouldAutoSave && autoSaveEnabled) {
        try {
          setIsSubmitting(true);

          // Get current form values and update with new value
          const currentValues = getValues();

          // Format the data for API
          const formattedData: ResumeFormData = {
            contactInfo: currentValues.contactInfo,
            summary: currentValues.summary,
            coursework: currentValues.coursework as Coursework[],
            skills: currentValues.skills as Skill[],
            experience: currentValues.experience as Entry[],
            education: currentValues.education as Entry[],
            projects: currentValues.projects as Project[],
            leadership: currentValues.leadership as Entry[],
            certifications: currentValues.certifications as Certification[],
          };

          await saveResume(formattedData);
          // Toast is shown by the component that made the change
        } catch (error) {
          console.error("Error auto-saving resume:", error);
          toast.error("Failed to auto-save resume");
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [setValue, getValues, autoSaveEnabled]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between mb-5">
        <h1 className="text-6xl font-bold gradient-title">Resume Builder</h1>
        <div className="flex gap-2">
          {!isEditMode && (
            <>
              <DownloadResumeButton />
              <ViewLatexButton />
            </>
          )}
          <Button
            onClick={toggleEditMode}
            disabled={isSubmitting}
            className="sm:px-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : isEditMode ? (
              <>
                <Save className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Save Resume</span>
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit Resume</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile dropdown for tabs */}
        <div className="md:hidden mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full flex justify-between items-center"
              >
                <span>
                  {activeTab === "info" && "Contact Info"}
                  {activeTab === "education" && "Education"}
                  {activeTab === "experience" && "Experience"}
                  {activeTab === "skills" && "Skills & Projects"}
                  {activeTab === "certifications" && "Certifications"}
                </span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setActiveTab("info")}>
                Contact Info
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("education")}>
                Education
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("experience")}>
                Experience
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("skills")}>
                Skills & Projects
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("certifications")}>
                Certifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop tabs */}
        <TabsList className="hidden md:grid grid-cols-5 mb-8">
          <TabsTrigger value="info">Contact Info</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="skills">Skills & Projects</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* CONTACT INFO TAB */}
          <TabsContent value="info" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name *</label>
                  <Input
                    {...register("contactInfo.firstName")}
                    type="text"
                    placeholder="John"
                    disabled={!isEditMode}
                  />
                  {errors.contactInfo?.firstName && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name *</label>
                  <Input
                    {...register("contactInfo.lastName")}
                    type="text"
                    placeholder="Doe"
                    disabled={!isEditMode}
                  />
                  {errors.contactInfo?.lastName && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.lastName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    {...register("contactInfo.email")}
                    type="email"
                    placeholder="your@email.com"
                    disabled={!isEditMode}
                  />
                  {errors.contactInfo?.email && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="w-24">
                      <Input
                        {...register("contactInfo.countryCode")}
                        type="text"
                        placeholder="+1"
                        disabled={!isEditMode}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        {...register("contactInfo.phone")}
                        type="tel"
                        placeholder="234 567 8900"
                        disabled={!isEditMode}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    {...register("contactInfo.address")}
                    placeholder="123 Street Name"
                    disabled={!isEditMode}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input
                      {...register("contactInfo.city")}
                      placeholder="Town"
                      disabled={!isEditMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <Input
                      {...register("contactInfo.state")}
                      placeholder="State"
                      disabled={!isEditMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Zip Code</label>
                    <Input
                      {...register("contactInfo.zipCode")}
                      placeholder="12345"
                      disabled={!isEditMode}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">LinkedIn URL</label>
                  <Input
                    {...register("contactInfo.linkedin")}
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                    disabled={!isEditMode}
                  />
                  {errors.contactInfo?.linkedin && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.linkedin.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">GitHub URL</label>
                  <Input
                    {...register("contactInfo.github")}
                    type="url"
                    placeholder="https://github.com/your-username"
                    disabled={!isEditMode}
                  />
                  {errors.contactInfo?.github && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.github.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Professional Summary</h3>
              <Textarea
                {...register("summary")}
                className="h-32"
                placeholder="Write a compelling professional summary..."
                disabled={!isEditMode}
              />
              {errors.summary && (
                <p className="text-sm text-red-500">{errors.summary.message}</p>
              )}
            </div>
          </TabsContent>

          {/* EDUCATION TAB */}
          <TabsContent value="education" className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Education</h3>
              <EntrySection
                type="Education"
                entries={formValues.education}
                onChange={(entries: Entry[]) =>
                  handleSectionChange("education", entries)
                }
                isEditMode={isEditMode}
                autoSave={autoSaveEnabled}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Relevant Coursework</h3>
              <CourseworkSection
                coursework={formValues.coursework}
                onChange={(coursework: Coursework[]) =>
                  handleSectionChange("coursework", coursework)
                }
                isEditMode={isEditMode}
                autoSave={autoSaveEnabled}
              />
            </div>
          </TabsContent>

          {/* EXPERIENCE TAB */}
          <TabsContent value="experience" className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Work Experience</h3>
              <EntrySection
                type="Experience"
                entries={formValues.experience}
                onChange={(entries: Entry[]) =>
                  handleSectionChange("experience", entries)
                }
                isEditMode={isEditMode}
                autoSave={autoSaveEnabled}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Leadership & Extracurricular
              </h3>
              <EntrySection
                type="Leadership"
                entries={formValues.leadership}
                onChange={(entries: Entry[]) =>
                  handleSectionChange("leadership", entries)
                }
                isEditMode={isEditMode}
                autoSave={autoSaveEnabled}
              />
            </div>
          </TabsContent>

          {/* SKILLS & PROJECTS TAB */}
          <TabsContent value="skills" className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Technical Skills</h3>
              <SkillsSection
                skills={formValues.skills}
                onChange={(skills: Skill[]) =>
                  handleSectionChange("skills", skills)
                }
                isEditMode={isEditMode}
                autoSave={autoSaveEnabled}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Projects</h3>
              <ProjectSection
                projects={formValues.projects}
                onChange={(projects: Project[]) =>
                  handleSectionChange("projects", projects)
                }
                isEditMode={isEditMode}
                autoSave={autoSaveEnabled}
              />
            </div>
          </TabsContent>

          {/* CERTIFICATIONS TAB */}
          <TabsContent value="certifications" className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Professional Certifications
              </h3>
              <CertificationSection
                certifications={formValues.certifications}
                onChange={(certifications: Certification[]) =>
                  handleSectionChange("certifications", certifications)
                }
                isEditMode={isEditMode}
                autoSave={autoSaveEnabled}
              />
            </div>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
};

export default ResumeForm;
