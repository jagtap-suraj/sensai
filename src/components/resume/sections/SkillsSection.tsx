import { useState, useEffect } from "react";
import { X, PlusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skill } from "@/types/resume";
import { toast } from "sonner";

interface SkillsSectionProps {
  skills: Skill[];
  onChange: (skills: Skill[]) => void;
  isEditMode?: boolean;
  autoSave?: boolean;
}

const SkillsSection = ({
  skills,
  onChange,
  isEditMode = true,
  autoSave = true,
}: SkillsSectionProps) => {
  const [newSkill, setNewSkill] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  // Initialize all categories as collapsed by default
  useEffect(() => {
    const categories = [...new Set(skills.map((skill) => skill.category))];
    const initialState: Record<string, boolean> = {};

    // Set all categories to collapsed initially
    categories.forEach((category) => {
      initialState[category] = false;
    });

    setExpandedCategories(initialState);
  }, [skills]);

  // Remove "Custom" from predefined categories since we have a separate "+ Add Custom Category" option
  const predefinedCategories = [
    "Language",
    "Tool",
    "Framework",
    "Library",
    "Other",
  ];

  // Get unique categories from existing skills to show in dropdown
  const existingCategories = [
    ...new Set(skills.map((skill) => skill.category)),
  ];
  const customCategories = existingCategories.filter(
    (cat) => !predefinedCategories.includes(cat)
  );

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;

    // Use custom category if selected, otherwise use the selected category
    const finalCategory = showCustomInput ? customCategory : newSkillCategory;

    if (!finalCategory) return;

    onChange([
      ...skills,
      {
        name: newSkill.trim(),
        category: finalCategory,
      },
    ]);
    setNewSkill("");

    if (autoSave) {
      toast.success("Skill added successfully!");
    }

    // Don't reset category to allow adding multiple skills in the same category

    // Auto-expand the category when adding a new skill
    setExpandedCategories((prev) => ({
      ...prev,
      [finalCategory]: true,
    }));
  };

  const handleDeleteSkill = (index: number) => {
    const updatedSkills = [...skills];
    updatedSkills.splice(index, 1);
    onChange(updatedSkills);

    if (autoSave) {
      toast.success("Skill deleted successfully!");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      newSkillCategory &&
      newSkill.trim() &&
      (!showCustomInput || (showCustomInput && customCategory.trim()))
    ) {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === "custom") {
      setShowCustomInput(true);
      setNewSkillCategory("");
    } else {
      setShowCustomInput(false);
      setNewSkillCategory(value);
      setCustomCategory("");
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Group skills by category
  const groupedSkills: Record<string, Skill[]> = {};
  skills.forEach((skill) => {
    if (!groupedSkills[skill.category]) {
      groupedSkills[skill.category] = [];
    }
    groupedSkills[skill.category].push(skill);
  });

  return (
    <div className="space-y-6">
      {/* Group skills by category */}
      {Object.entries(groupedSkills).map(([category, categorySkills]) => (
        <div key={category} className="border rounded-lg overflow-hidden">
          <div
            className="flex justify-between items-center p-3 bg-muted/30 cursor-pointer"
            onClick={() => toggleCategory(category)}
          >
            <h4 className="font-medium">{category}</h4>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedCategories[category] ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {expandedCategories[category] && (
            <div className="p-3">
              <div className="flex flex-wrap gap-2">
                {categorySkills.map((skill, skillIndex) => {
                  const originalIndex = skills.findIndex(
                    (s) =>
                      s.name === skill.name && s.category === skill.category
                  );
                  return (
                    <div
                      key={skillIndex}
                      className="bg-muted/50 rounded-full px-3 py-1 text-sm flex items-center"
                    >
                      {skill.name}
                      {isEditMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSkill(originalIndex);
                          }}
                          className="ml-2 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {isEditMode && (
        <div className="space-y-4 border p-4 rounded-lg">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Category</label>
              <div className="flex space-x-2 mt-1">
                <Select
                  value={newSkillCategory}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {predefinedCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    {customCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      + Add Custom Category
                    </SelectItem>
                  </SelectContent>
                </Select>
                {showCustomInput && (
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="New category name"
                    className="flex-1"
                  />
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Skill</label>
              <div className="flex space-x-2 mt-1">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Add a skill"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleAddSkill}
                  disabled={
                    !newSkill.trim() ||
                    (!newSkillCategory && !showCustomInput) ||
                    (showCustomInput && !customCategory.trim())
                  }
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsSection;
