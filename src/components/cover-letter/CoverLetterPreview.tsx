"use client";

import React, { useState, useEffect } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Save, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateCoverLetter,
  deleteCoverLetter,
} from "@/lib/actions/cover-letter";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CoverLetterPreviewProps {
  content?: string;
  id?: string;
}

const CoverLetterPreview: React.FC<CoverLetterPreviewProps> = ({
  content: initialContent,
  id,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [content, setContent] = useState(initialContent || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Check if edit parameter is present in URL
  useEffect(() => {
    if (searchParams.get("edit") === "true") {
      setIsEditing(true);
    }
  }, [searchParams]);

  if (!content) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        No content to display
      </div>
    );
  }

  const handleSave = async () => {
    if (!id) return;

    setIsSaving(true);
    try {
      await updateCoverLetter(id, content);
      toast.success("Cover letter saved successfully!");
      setIsEditing(false);

      // Remove the edit parameter from the URL
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      router.replace(url.pathname);
    } catch (error) {
      toast.error("Failed to save changes");
      console.error("Error saving cover letter:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    // Add edit parameter to URL
    const url = new URL(window.location.href);
    url.searchParams.set("edit", "true");
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
  };

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      await deleteCoverLetter(id);
      toast.success("Cover letter deleted successfully!");
      router.push("/cover-letter");
    } catch (error) {
      toast.error("Failed to delete cover letter");
      console.error("Error deleting cover letter:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex justify-end gap-2">
        {isEditing ? (
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </>
        )}
      </div>

      <MDEditor
        value={content}
        onChange={(value) => setContent(value || "")}
        preview={isEditing ? "edit" : "preview"}
        height={700}
        hideToolbar={!isEditing}
        visibleDragbar={isEditing}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              cover letter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CoverLetterPreview;
