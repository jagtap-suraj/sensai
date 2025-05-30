"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useFetch from "@/hooks/useFetch";
import { updateUser } from "@/lib/actions/user";

// Define types based on the Prisma schema
interface Industry {
  id: string;
  name: string;
  subIndustries: string[];
}

interface UserProfile {
  industry: string;
  subIndustry: string;
  experience: number;
  skills: string[];
  bio?: string;
}

// Form values interface
interface FormData {
  industry: string;
  subIndustry: string;
  experience: string;
  skills: string;
  bio: string;
}

interface ProfileFormProps {
  initialData: UserProfile;
  industries: Industry[];
}

const ProfileForm = ({ initialData, industries }: ProfileFormProps) => {
  const router = useRouter();

  // Parse industry ID from the combined industry string
  const parseIndustryId = (industryString: string): string => {
    const parts = industryString.split("-");
    if (parts.length >= 1) {
      return parts[0];
    }
    return "";
  };

  const industryId = parseIndustryId(initialData.industry);

  // Initialize selected industry state with the user's current industry
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(
    industries.find((ind) => ind.id === industryId) || null
  );

  // Set the selected industry when the component mounts
  useEffect(() => {
    if (industryId && !selectedIndustry) {
      const industry = industries.find((ind) => ind.id === industryId);
      if (industry) {
        setSelectedIndustry(industry);
      }
    }
  }, [industryId, industries, selectedIndustry]);

  const {
    loading: updateLoading,
    fn: updateUserFn,
    data: updateResult,
  } = useFetch(updateUser);

  // Convert skills array to comma-separated string for the form
  const skillsString = initialData.skills ? initialData.skills.join(", ") : "";

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      industry: industryId,
      subIndustry: initialData.subIndustry || "",
      experience: initialData.experience.toString(),
      skills: skillsString,
      bio: initialData.bio || "",
    },
  });

  const onSubmit = async (values: FormData) => {
    try {
      const formattedIndustry = `${values.industry}-${values.subIndustry
        .toLowerCase()
        .replace(/ /g, "-")}`;

      // Convert form data to the format expected by the API
      const apiData = {
        industry: formattedIndustry,
        experience: parseInt(values.experience, 10),
        bio: values.bio,
        skills: values.skills
          ? values.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean)
          : [],
        subIndustry: values.subIndustry,
      };

      await updateUserFn(apiData);
    } catch (error) {
      console.error("Profile update error:", error);
    }
  };

  useEffect(() => {
    if (updateResult?.success && !updateLoading) {
      toast.success("Profile updated successfully!");
      router.refresh();
    }
  }, [updateResult, updateLoading, router]);

  const watchIndustry = watch("industry");

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Edit Your Profile</CardTitle>
        <CardDescription>
          Update your industry and professional information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select
              defaultValue={industryId}
              onValueChange={(value) => {
                setValue("industry", value);
                const industry = industries.find((ind) => ind.id === value);
                setSelectedIndustry(industry || null);
                setValue("subIndustry", "");
              }}
            >
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select an industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Industries</SelectLabel>
                  {industries.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.industry && (
              <p className="text-sm text-red-500">{errors.industry.message}</p>
            )}
          </div>

          {watchIndustry && selectedIndustry && (
            <div className="space-y-2">
              <Label htmlFor="subIndustry">Specialization</Label>
              <Select
                defaultValue={initialData.subIndustry}
                onValueChange={(value) => setValue("subIndustry", value)}
              >
                <SelectTrigger id="subIndustry">
                  <SelectValue placeholder="Select your specialization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Specializations</SelectLabel>
                    {selectedIndustry.subIndustries.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.subIndustry && (
                <p className="text-sm text-red-500">
                  {errors.subIndustry.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="experience">Years of Experience</Label>
            <Input
              id="experience"
              type="number"
              min="0"
              max="50"
              placeholder="Enter years of experience"
              {...register("experience")}
            />
            {errors.experience && (
              <p className="text-sm text-red-500">
                {errors.experience.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Input
              id="skills"
              placeholder="e.g., Python, JavaScript, Project Management"
              {...register("skills")}
            />
            <p className="text-sm text-muted-foreground">
              Separate multiple skills with commas
            </p>
            {errors.skills && (
              <p className="text-sm text-red-500">{errors.skills.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about your professional background..."
              className="h-32"
              {...register("bio")}
            />
            {errors.bio && (
              <p className="text-sm text-red-500">{errors.bio.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateLoading}>
              {updateLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileForm;
