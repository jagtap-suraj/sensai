import { useState, useRef, useEffect } from "react";
import { format, parse } from "date-fns";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Entry } from "@/types/resume";
import { toast } from "sonner";

interface EntrySectionProps {
  type: string;
  entries: Entry[];
  onChange: (entries: Entry[]) => void;
  isEditMode?: boolean;
  autoSave?: boolean;
}

// EntrySection Component (for experience, education, projects, leadership)
export default function EntrySection({
  type,
  entries,
  onChange,
  isEditMode = true,
  autoSave = true,
}: EntrySectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Entry>({
    title: "",
    organization: "",
    location: "",
    gpa: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      organization: "",
      location: "",
      gpa: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
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
    // For Education, description is optional
    if (
      !formData.title ||
      !formData.organization ||
      !formData.startDate ||
      (type !== "Education" && !formData.description)
    ) {
      return; // Basic validation
    }

    const formattedEntry = {
      ...formData,
      startDate: formData.startDate,
      endDate: formData.current ? undefined : formData.endDate,
    };

    if (editingIndex !== null) {
      // Update existing entry
      const updatedEntries = [...entries];
      updatedEntries[editingIndex] = formattedEntry;
      onChange(updatedEntries);
      setEditingIndex(null);

      if (autoSave) {
        toast.success(`${type} updated successfully!`);
      }
    } else {
      // Add new entry
      onChange([...entries, formattedEntry]);

      if (autoSave) {
        toast.success(`${type} added successfully!`);
      }
    }

    resetForm();
    setIsAdding(false);
  };

  const handleEdit = (index: number, event: React.MouseEvent) => {
    // Prevent default behavior to avoid page jump
    event.preventDefault();
    event.stopPropagation();

    const entry = entries[index];

    // Format dates for the form inputs (yyyy-MM format)
    let formattedStartDate = "";
    let formattedEndDate = "";

    // Handle different date formats that might come from the database
    if (entry.startDate) {
      // Check if startDate is a string that looks like a date
      if (typeof entry.startDate === "string") {
        try {
          // Try to parse as ISO date string
          const date = new Date(entry.startDate);
          if (!isNaN(date.getTime())) {
            formattedStartDate = format(date, "yyyy-MM");
          } else {
            // If it's already in yyyy-MM format, use it directly
            formattedStartDate = entry.startDate;
          }
        } catch {
          formattedStartDate = entry.startDate;
        }
      } else if (entry.startDate && typeof entry.startDate === "object") {
        // Use type assertion instead of instanceof
        formattedStartDate = format(entry.startDate as Date, "yyyy-MM");
      }
    }

    if (entry.endDate) {
      // Check if endDate is a string that looks like a date
      if (typeof entry.endDate === "string") {
        try {
          // Try to parse as ISO date string
          const date = new Date(entry.endDate);
          if (!isNaN(date.getTime())) {
            formattedEndDate = format(date, "yyyy-MM");
          } else {
            // If it's already in yyyy-MM format, use it directly
            formattedEndDate = entry.endDate;
          }
        } catch {
          formattedEndDate = entry.endDate;
        }
      } else if (entry.endDate && typeof entry.endDate === "object") {
        // Use type assertion instead of instanceof
        formattedEndDate = format(entry.endDate as Date, "yyyy-MM");
      }
    }

    setFormData({
      ...entry,
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
    const newEntries = entries.filter((_, i: number) => i !== index);
    onChange(newEntries);

    if (autoSave) {
      toast.success(`${type} deleted successfully!`);
    }
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
    setEditingIndex(null);
  };

  const formatDisplayDate = (dateString: string) => {
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
      {entries.map((item: Entry, index: number) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="bg-muted/50 py-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg mb-1">{item.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {item.organization}
                  {item.location && ` • ${item.location}`}
                  {type === "Education" && item.gpa && ` • GPA: ${item.gpa}`}
                </p>
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
            <p className="text-sm text-muted-foreground mb-2">
              {item.current
                ? `${formatDisplayDate(item.startDate)} - Present`
                : `${formatDisplayDate(item.startDate)} - ${formatDisplayDate(
                    item.endDate || ""
                  )}`}
            </p>
            <div className="whitespace-pre-line">{item.description}</div>
          </CardContent>
        </Card>
      ))}

      {isEditMode && (editingIndex !== null || isAdding || !entries.length) && (
        <div ref={formRef} className="space-y-4 border p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {type === "Education" ? "Degree" : "Title/Position"}
              </label>
              <Input
                name="title"
                placeholder={
                  type === "Education"
                    ? "Bachelor of Science in Computer Science"
                    : "Title/Position"
                }
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Organization/Company
              </label>
              <Input
                name="organization"
                placeholder="Organization/Company"
                value={formData.organization}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Location (Optional)</label>
            <Input
              name="location"
              placeholder="City, State"
              value={formData.location || ""}
              onChange={handleChange}
            />
          </div>

          {type === "Education" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">GPA (Optional)</label>
              <Input
                name="gpa"
                placeholder="3.8/4.0"
                value={formData.gpa || ""}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                name="startDate"
                type="month"
                value={formData.startDate}
                onChange={handleChange}
                required
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
              id={`current-${type}`}
              name="current"
              checked={formData.current}
              onChange={handleCheckboxChange}
            />
            <label htmlFor={`current-${type}`}>Current {type}</label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description{type === "Education" ? " (Optional)" : ""}
            </label>
            <Textarea
              name="description"
              placeholder={`Description of your ${type.toLowerCase()}`}
              className="h-32"
              value={formData.description}
              onChange={handleChange}
              required={type !== "Education"}
            />
          </div>

          <div className="flex justify-end space-x-2">
            {(editingIndex !== null || isAdding) && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={handleAdd}>
              {editingIndex !== null ? "Update" : "Add"} {type}
            </Button>
          </div>
        </div>
      )}

      {isEditMode &&
        editingIndex === null &&
        !isAdding &&
        entries.length > 0 && (
          <Button
            onClick={() => setIsAdding(true)}
            variant="outline"
            className="w-full py-6"
          >
            + Add {type}
          </Button>
        )}
    </div>
  );
}
