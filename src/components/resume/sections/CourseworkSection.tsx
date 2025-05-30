import { useState } from "react";
import { X, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coursework } from "@/types/resume";
import { toast } from "sonner";

interface CourseworkSectionProps {
  coursework: Coursework[];
  onChange: (coursework: Coursework[]) => void;
  isEditMode?: boolean;
  autoSave?: boolean;
}

const CourseworkSection = ({
  coursework,
  onChange,
  isEditMode = true,
  autoSave = true,
}: CourseworkSectionProps) => {
  const [newCourse, setNewCourse] = useState("");

  const handleAddCourse = () => {
    if (!newCourse.trim()) return;

    onChange([...coursework, { name: newCourse.trim() }]);
    setNewCourse("");

    if (autoSave) {
      toast.success("Course added successfully!");
    }
  };

  const handleDeleteCourse = (index: number) => {
    const updatedCoursework = [...coursework];
    updatedCoursework.splice(index, 1);
    onChange(updatedCoursework);

    if (autoSave) {
      toast.success("Course deleted successfully!");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCourse();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {coursework.map((course: Coursework, index: number) => (
          <div
            key={index}
            className="bg-muted/50 rounded-full px-3 py-1 text-sm flex items-center"
          >
            {course.name}
            {isEditMode && (
              <button
                onClick={() => handleDeleteCourse(index)}
                className="ml-2 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditMode && (
        <div className="flex items-center space-x-2">
          <Input
            value={newCourse}
            onChange={(e) => setNewCourse(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Add a course (press Enter to add)"
          />
          <Button
            variant="outline"
            onClick={handleAddCourse}
            disabled={!newCourse.trim()}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CourseworkSection;
