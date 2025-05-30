"use client";

import { useState, useRef, useEffect } from "react";
import { X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Certification } from "@/types/resume";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface CertificationSectionProps {
  certifications: Certification[];
  onChange: (certifications: Certification[]) => void;
  isEditMode: boolean;
  autoSave: boolean;
}

const CertificationSection = ({
  certifications,
  onChange,
  isEditMode,
  autoSave,
}: CertificationSectionProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Certification>({
    name: "",
    issuer: "",
    issueDate: "",
    expiryDate: "",
    credentialId: "",
    credentialUrl: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      issuer: "",
      issueDate: "",
      expiryDate: "",
      credentialId: "",
      credentialUrl: "",
      description: "",
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCertification = () => {
    if (!formData.name || !formData.issuer || !formData.issueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    let updatedCertifications: Certification[];

    if (editingIndex !== null) {
      // Update existing certification
      const cert = certifications[editingIndex];
      updatedCertifications = certifications.map((c, index) =>
        index === editingIndex
          ? {
              ...formData,
              id: cert.id,
            }
          : c
      );

      if (autoSave) {
        toast.success("Certification updated");
      }
    } else {
      // Add new certification
      const newCertification: Certification = {
        ...formData,
        id: `temp-${Date.now()}`,
      };
      updatedCertifications = [...certifications, newCertification];

      if (autoSave) {
        toast.success("Certification added");
      }
    }

    onChange(updatedCertifications);
    resetForm();
    setIsAdding(false);
    setEditingIndex(null);
  };

  const handleDeleteCertification = (index: number) => {
    const updatedCertifications = certifications.filter((_, i) => i !== index);
    onChange(updatedCertifications);

    if (autoSave) {
      toast.success("Certification removed");
    }
  };

  const handleEditCertification = (index: number) => {
    const certification = certifications[index];

    // Format dates for the form inputs (yyyy-MM-dd format)
    let formattedIssueDate = "";
    let formattedExpiryDate = "";

    // Handle issue date formatting
    if (certification.issueDate) {
      try {
        // Try to parse as ISO date string
        const date = new Date(certification.issueDate);
        if (!isNaN(date.getTime())) {
          formattedIssueDate = format(date, "yyyy-MM-dd");
        } else {
          // If it's already in yyyy-MM-dd format, use it directly
          formattedIssueDate = certification.issueDate;
        }
      } catch {
        formattedIssueDate = certification.issueDate;
      }
    }

    // Handle expiry date formatting
    if (certification.expiryDate) {
      try {
        // Try to parse as ISO date string
        const date = new Date(certification.expiryDate);
        if (!isNaN(date.getTime())) {
          formattedExpiryDate = format(date, "yyyy-MM-dd");
        } else {
          // If it's already in yyyy-MM-dd format, use it directly
          formattedExpiryDate = certification.expiryDate;
        }
      } catch {
        formattedExpiryDate = certification.expiryDate;
      }
    }

    setFormData({
      name: certification.name,
      issuer: certification.issuer,
      issueDate: formattedIssueDate,
      expiryDate: formattedExpiryDate,
      credentialId: certification.credentialId || "",
      credentialUrl: certification.credentialUrl || "",
      description: certification.description || "",
    });

    setEditingIndex(index);
    setIsAdding(true);
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
    setEditingIndex(null);
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

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "MMM yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      {certifications.length > 0 ? (
        <div className="space-y-4">
          {certifications.map((certification, index) => (
            <Card key={certification.id || index} className="overflow-hidden">
              <CardHeader className="bg-muted/50 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg mb-1">
                      {certification.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {certification.issuer}
                    </p>
                  </div>
                  {isEditMode && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditCertification(index)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteCertification(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="py-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline">
                    Issued: {formatDate(certification.issueDate)}
                  </Badge>
                  {certification.expiryDate && (
                    <Badge variant="outline">
                      Expires: {formatDate(certification.expiryDate)}
                    </Badge>
                  )}
                </div>

                {certification.credentialId && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Credential ID: {certification.credentialId}
                  </p>
                )}

                {certification.credentialUrl && (
                  <a
                    href={certification.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block mb-2"
                  >
                    View Credential
                  </a>
                )}

                {certification.description && (
                  <p className="text-sm mt-2">{certification.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">
            No certifications added yet. Click the button below to add one.
          </p>
        </div>
      )}

      {isEditMode &&
        (editingIndex !== null || isAdding || !certifications.length) && (
          <div ref={formRef} className="space-y-4 border p-4 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Certification Name *
              </label>
              <Input
                name="name"
                placeholder="AWS Certified Solutions Architect"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Issuing Organization *
              </label>
              <Input
                name="issuer"
                placeholder="Amazon Web Services"
                value={formData.issuer}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Issue Date *</label>
                <Input
                  name="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiry Date</label>
                <Input
                  name="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Credential ID</label>
              <Input
                name="credentialId"
                placeholder="ABC123XYZ"
                value={formData.credentialId}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Credential URL</label>
              <Input
                name="credentialUrl"
                type="url"
                placeholder="https://www.credly.com/badges/..."
                value={formData.credentialUrl}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                name="description"
                placeholder="Brief description of the certification..."
                className="h-32"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="flex justify-end space-x-2">
              {(editingIndex !== null || isAdding) && (
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSaveCertification}>
                {editingIndex !== null ? "Update" : "Add"} Certification
              </Button>
            </div>
          </div>
        )}

      {isEditMode &&
        editingIndex === null &&
        !isAdding &&
        certifications.length > 0 && (
          <Button
            onClick={() => setIsAdding(true)}
            variant="outline"
            className="w-full py-6"
          >
            + Add Certification
          </Button>
        )}
    </div>
  );
};

export default CertificationSection;
