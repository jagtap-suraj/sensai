import { useState, useRef, useEffect } from "react";
import { format, parse } from "date-fns";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/types/resume";
import { toast } from "sonner";

interface ProjectSectionProps {
  projects: Project[];
  onChange: (projects: Project[]) => void;
  isEditMode?: boolean;
  autoSave?: boolean;
}

const ProjectSection = ({
  projects,
  onChange,
  isEditMode = true,
  autoSave = true,
}: ProjectSectionProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Project>({
    title: "",
    technologies: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
    deployedLink: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      technologies: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
      deployedLink: "",
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));

    // Clear end date if current is checked
    if (name === "current" && checked) {
      setFormData((prev) => ({ ...prev, endDate: "" }));
    }
  };

  const handleAdd = () => {
    if (!formData.title || !formData.description) {
      return; // Basic validation - removed startDate requirement
    }

    const formattedProject = {
      ...formData,
      startDate: formData.startDate,
      endDate: formData.current ? undefined : formData.endDate,
    };

    if (editingIndex !== null) {
      // Update existing project
      const updatedProjects = [...projects];
      updatedProjects[editingIndex] = formattedProject;
      onChange(updatedProjects);
      setEditingIndex(null);

      if (autoSave) {
        toast.success("Project updated successfully!");
      }
    } else {
      // Add new project
      onChange([...projects, formattedProject]);

      if (autoSave) {
        toast.success("Project added successfully!");
      }
    }

    resetForm();
    setIsAdding(false);
  };

  const handleEdit = (index: number, event: React.MouseEvent) => {
    // Prevent default behavior to avoid page jump
    event.preventDefault();
    event.stopPropagation();

    const project = projects[index];

    // Format dates for the form inputs (yyyy-MM format)
    let formattedStartDate = "";
    let formattedEndDate = "";

    // Handle different date formats that might come from the database
    if (project.startDate) {
      // Check if startDate is a string that looks like a date
      if (typeof project.startDate === "string") {
        try {
          // Try to parse as ISO date string
          const date = new Date(project.startDate);
          if (!isNaN(date.getTime())) {
            formattedStartDate = format(date, "yyyy-MM");
          } else {
            // If it's already in yyyy-MM format, use it directly
            formattedStartDate = project.startDate;
          }
        } catch {
          formattedStartDate = project.startDate;
        }
      }
    }

    if (project.endDate) {
      // Check if endDate is a string that looks like a date
      if (typeof project.endDate === "string") {
        try {
          // Try to parse as ISO date string
          const date = new Date(project.endDate);
          if (!isNaN(date.getTime())) {
            formattedEndDate = format(date, "yyyy-MM");
          } else {
            // If it's already in yyyy-MM format, use it directly
            formattedEndDate = project.endDate;
          }
        } catch {
          formattedEndDate = project.endDate;
        }
      }
    }

    setFormData({
      ...project,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
    });

    setEditingIndex(index);
    setIsAdding(true);
  };

  // Scroll to the form when editing starts
  useEffect(() => {
    if ((editingIndex !== null || isAdding) && formRef.current) {
      // Use a small timeout to ensure DOM has updated
      setTimeout(() => {
        formRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [editingIndex, isAdding]);

  const handleDelete = (index: number) => {
    const newProjects = projects.filter((_, i: number) => i !== index);
    onChange(newProjects);

    if (autoSave) {
      toast.success("Project deleted successfully!");
    }
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
    setEditingIndex(null);
  };

  const formatDisplayDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    try {
      // First try to parse as ISO date string
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return format(date, "MMM yyyy");
      }

      // If that fails, try to parse as yyyy-MM
      return format(parse(dateString, "yyyy-MM", new Date()), "MMM yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      {projects.map((project: Project, index: number) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="bg-muted/50 py-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg mb-1">{project.title}</CardTitle>
                {project.technologies && (
                  <p className="text-sm text-muted-foreground">
                    {project.technologies}
                  </p>
                )}
              </div>
              {isEditMode && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => handleEdit(index, e)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="py-3">
            {(project.startDate || project.endDate) && (
              <p className="text-sm text-muted-foreground mb-2">
                {project.current
                  ? `${formatDisplayDate(project.startDate)} - Present`
                  : project.startDate && project.endDate
                  ? `${formatDisplayDate(
                      project.startDate
                    )} - ${formatDisplayDate(project.endDate)}`
                  : project.startDate
                  ? `${formatDisplayDate(project.startDate)}`
                  : project.endDate
                  ? `Until ${formatDisplayDate(project.endDate)}`
                  : ""}
              </p>
            )}
            <div className="whitespace-pre-line">{project.description}</div>
            {project.deployedLink && (
              <a
                href={project.deployedLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-sm text-blue-600 hover:underline block"
              >
                {project.deployedLink}
              </a>
            )}
          </CardContent>
        </Card>
      ))}

      {isEditMode &&
        (editingIndex !== null || isAdding || !projects.length) && (
          <div ref={formRef} className="space-y-4 border p-4 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Title</label>
              <Input
                name="title"
                placeholder="Project Title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Technologies (Optional)
              </label>
              <Input
                name="technologies"
                placeholder="React, Node.js, MongoDB"
                value={formData.technologies || ""}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Start Date (Optional)
                </label>
                <Input
                  name="startDate"
                  type="month"
                  value={formData.startDate}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  name="endDate"
                  type="month"
                  value={formData.endDate || ""}
                  onChange={handleChange}
                  disabled={formData.current}
                  required={!formData.current}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="current-project"
                name="current"
                checked={formData.current}
                onChange={handleCheckboxChange}
              />
              <label htmlFor="current-project">Current Project</label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Project Link (Optional)
              </label>
              <Input
                name="deployedLink"
                type="url"
                placeholder="https://github.com/yourusername/project"
                value={formData.deployedLink || ""}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                name="description"
                placeholder="Description of your project"
                className="h-32"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              {(editingIndex !== null || isAdding) && (
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleAdd}>
                {editingIndex !== null ? "Update" : "Add"} Project
              </Button>
            </div>
          </div>
        )}

      {isEditMode &&
        editingIndex === null &&
        !isAdding &&
        projects.length > 0 && (
          <Button
            onClick={() => setIsAdding(true)}
            variant="outline"
            className="w-full py-6"
          >
            + Add Project
          </Button>
        )}
    </div>
  );
};

export default ProjectSection;
