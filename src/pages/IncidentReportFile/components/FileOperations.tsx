import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/utils/supa";
import Cookies from "js-cookie";
import {
  Download,
  Plus,
  FileText,
  Image as ImageIcon,
  File,
  Pencil,
  Archive,
  Eye,
  MoreVertical,
  Printer,
  X,
  ZoomIn,
  CheckCircle,
  Edit,
} from "lucide-react";
import { useState, useEffect, useRef} from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface FileRecord {
  file_id: number;
  folder_id: number;
  title: string;
  case_title: string;
  blotter_number: string;
  incident_summary: string;
  file_path: string;
  public_url: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
  is_archived: boolean;
  investigator: string;
  desk_officer: string;
  viewed_by: string | null;
  downloaded_by: string | null;
  printed_by: string | null;
  viewed_at: string | null;
  downloaded_at: string | null;
  printed_at: string | null;
  creator?: { name: string };
  updater?: { name: string };
  viewer?: { name: string };
  downloader?: { name: string };
  printer?: { name: string };
}

interface ReportingPersonDetails {
  full_name: string;
  age: number;
  birthday: string;
  gender: "Male" | "Female" | "Other";
  complete_address: string;
  contact_number: string;
  date_reported: string;
  time_reported: string;
  date_of_incident: string;
  time_of_incident: string;
  place_of_incident: string;
}

interface Suspect {
  suspect_id?: number;
  full_name: string;
  age: number;
  birthday: string;
  gender: "Male" | "Female" | "Other";
  complete_address: string;
  contact_number: string;
}

interface FileOperationsProps {
  file: FileRecord;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  showFileDialog: "edit" | "archive" | "details" | null;
  setShowFileDialog: (dialog: "edit" | "archive" | "details" | null) => void;
  onFileUpdate: () => void;
  selectedFile?: FileRecord | null;
  setSelectedFile: (file: FileRecord | null) => void;
  isListView: boolean;
}

// Helper function to get file type icon
const getFileIcon = (filePath: string) => {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
  const documentTypes = ["pdf", "doc", "docx"];
  const spreadsheetTypes = ["xls", "xlsx"];
  const presentationTypes = ["ppt", "pptx"];

  if (imageTypes.includes(ext))
    return <ImageIcon size={24} className="text-green-600" />;
  if (documentTypes.includes(ext))
    return <FileText size={24} className="text-blue-900" />;
  if (spreadsheetTypes.includes(ext))
    return <FileText size={24} className="text-emerald-600" />;
  if (presentationTypes.includes(ext))
    return <FileText size={24} className="text-orange-600" />;
  return <File size={24} className="text-gray-600" />;
};

// Add this helper function at the top level
const formatDateForInput = (dateString: string) => {
  if (!dateString) return "";
  return new Date(dateString).toISOString().split("T")[0];
};

export default function FileOperations({
  file,
  showPreview,
  setShowPreview,
  showFileDialog,
  setShowFileDialog,
  onFileUpdate,
  selectedFile,
  setSelectedFile,
  isListView,
}: FileOperationsProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const currentFile = showFileDialog ? selectedFile || file : file;
  const ext = currentFile.file_path.split(".").pop()?.toLowerCase() || "";
  const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
  const pdfType = ["pdf"];
  const officeTypes = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];

  // Add state for reporting person and suspects
  const [reportingPerson, setReportingPerson] =
    useState<ReportingPersonDetails | null>(null);
  const [suspects, setSuspects] = useState<Suspect[]>([]);

  // Fetch reporting person and suspects when viewing or editing a file
  useEffect(() => {
    const fetchFileDetails = async () => {
      if (!showFileDialog || !currentFile) return;

      try {
        // Fetch reporting person details
        const { data: reportingData, error: reportingError } = await supabase
          .from("reporting_person_details")
          .select("*")
          .eq("file_id", currentFile.file_id)
          .single();

        if (reportingError) throw reportingError;
        setReportingPerson(reportingData);

        // Fetch suspects
        const { data: suspectsData, error: suspectsError } = await supabase
          .from("suspects")
          .select("*")
          .eq("file_id", currentFile.file_id);

        if (suspectsError) throw suspectsError;
        setSuspects(suspectsData || []);
      } catch (error) {
        console.error("Error fetching file details:", error);
        toast.error("Failed to load file details");
      }
    };

    fetchFileDetails();
  }, [showFileDialog, currentFile]);

  // Function to add a new suspect form
  const addSuspect = () => {
    setSuspects([
      ...suspects,
      {
        full_name: "",
        age: 0,
        birthday: "",
        gender: "Male",
        complete_address: "",
        contact_number: "",
      },
    ]);
  };

  // Function to update suspect details
  const updateSuspect = (
    index: number,
    field: keyof Suspect,
    value: string | number
  ) => {
    const updatedSuspects = [...suspects];
    updatedSuspects[index] = { ...updatedSuspects[index], [field]: value };
    setSuspects(updatedSuspects);
  };

  // Function to remove a suspect
  const removeSuspect = (index: number) => {
    if (suspects.length > 1) {
      const updatedSuspects = suspects.filter((_, i) => i !== index);
      setSuspects(updatedSuspects);
    }
  };

  // Get signed URL on component mount and when showing preview
  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        setIsLoading(true);
        setError(undefined);

        // Check if file exists first
        const { data: checkData, error: checkError } = await supabase.storage
          .from("files")
          .list(`folder_${currentFile.folder_id}`);

        if (checkError) throw checkError;

        const fileExists = checkData.some(
          (f) => f.name === currentFile.file_path.split("/").pop()
        );
        if (!fileExists) {
          throw new Error("File no longer exists in storage");
        }

        const { data, error } = await supabase.storage
          .from("files")
          .createSignedUrl(currentFile.file_path, 60 * 60 * 24); // 24 hour expiry

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (error: any) {
        console.error("Error getting signed URL:", error);
        setError(error.message || "Error loading file preview");
        setSignedUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (
      showPreview ||
      imageTypes.includes(ext) ||
      pdfType.includes(ext) ||
      officeTypes.includes(ext)
    ) {
      getSignedUrl();
    }

    // Cleanup function
    return () => {
      if (!showPreview) {
        setSignedUrl(null);
        setError(undefined);
      }
    };
  }, [currentFile.file_path, currentFile.folder_id, showPreview, ext]);

  // Track file view when preview is opened
  useEffect(() => {
    const trackView = async () => {
      if (showPreview) {
        await handleFileView();
      }
    };
    trackView();
  }, [showPreview]);

  // Function to handle file view tracking
  const handleFileView = async () => {
    try {
      const userData = JSON.parse(Cookies.get("user_data") || "{}");

      // Get the user's ID and name from the users table using their email
      const { data: userData2, error: userError } = await supabase
        .from("users")
        .select("user_id, name")
        .eq("email", userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error("User not found");

      // Update the file's viewed_by and viewed_at
      const { error: updateError } = await supabase
        .from("files")
        .update({
          viewed_by: userData2.user_id,
          viewed_at: new Date().toISOString(),
        })
        .eq("file_id", currentFile.file_id);

      if (updateError) throw updateError;

      // Update the local state with the new user name
      currentFile.viewed_by = userData2.name;
      currentFile.viewed_at = new Date().toISOString();
    } catch (error) {
      console.error("Error updating view tracking:", error);
    }
  };

  // Function to handle file download
  const handleFileDownload = async () => {
    try {
      // Check if file exists first
      const { data: checkData, error: checkError } = await supabase.storage
        .from("files")
        .list(`folder_${currentFile.folder_id}`);

      if (checkError) throw checkError;

      const fileExists = checkData.some(
        (f) => f.name === currentFile.file_path.split("/").pop()
      );
      if (!fileExists) {
        toast.error("File no longer exists in storage");
        return;
      }

      // Get user data from cookies
      const userData = JSON.parse(Cookies.get("user_data") || "{}");

      // Get the user's ID and name from the users table using their email
      const { data: userData2, error: userError } = await supabase
        .from("users")
        .select("user_id, name")
        .eq("email", userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error("User not found");

      // Update the file's downloaded_by and downloaded_at
      const { error: updateError } = await supabase
        .from("files")
        .update({
          downloaded_by: userData2.user_id,
          downloaded_at: new Date().toISOString(),
        })
        .eq("file_id", currentFile.file_id);

      if (updateError) throw updateError;

      // Update the local state with the new user name
      currentFile.downloaded_by = userData2.name;
      currentFile.downloaded_at = new Date().toISOString();

      // Download the file
      const { data, error } = await supabase.storage
        .from("files")
        .download(currentFile.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentFile.case_title + "." + ext;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("File downloaded successfully");
      onFileUpdate();
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast.error(error.message || "Error downloading file. Please try again.");
    }
  };

  // Function to handle file printing
  const handleFilePrint = async () => {
    try {
      // Check if file exists first
      const { data: checkData, error: checkError } = await supabase.storage
        .from("files")
        .list(`folder_${currentFile.folder_id}`);

      if (checkError) throw checkError;

      const fileExists = checkData.some(
        (f) => f.name === currentFile.file_path.split("/").pop()
      );
      if (!fileExists) {
        toast.error("File no longer exists in storage");
        return;
      }

      // Get user data from cookies
      const userData = JSON.parse(Cookies.get("user_data") || "{}");

      // Get the user's ID and name from the users table using their email
      const { data: userData2, error: userError } = await supabase
        .from("users")
        .select("user_id, name")
        .eq("email", userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error("User not found");

      // Update the file's printed_by and printed_at
      const { error: updateError } = await supabase
        .from("files")
        .update({
          printed_by: userData2.user_id,
          printed_at: new Date().toISOString(),
        })
        .eq("file_id", currentFile.file_id);

      if (updateError) throw updateError;

      // Update the local state with the new user name
      currentFile.printed_by = userData2.name;
      currentFile.printed_at = new Date().toISOString();

      // Get the signed URL for the file
      const { data: urlData, error: urlError } = await supabase.storage
        .from("files")
        .createSignedUrl(currentFile.file_path, 60 * 60); // 1 hour expiry

      if (urlError) throw urlError;

      // Open Google Docs viewer in a new tab
      const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
        urlData.signedUrl
      )}&embedded=false`;
      window.open(googleDocsUrl, "_blank");

      toast.success("Opening file for printing...");
      onFileUpdate();
    } catch (error: any) {
      console.error("Error preparing file for print:", error);
      toast.error(
        error.message || "Error preparing file for print. Please try again."
      );
    }
  };

  // Function to handle file archiving
  const handleArchiveFile = async () => {
    try {
      const fileToArchive = selectedFile || file;

      // Get user data from cookies
      const userData = JSON.parse(Cookies.get("user_data") || "{}");

      // Get the user's ID from the users table using their email
      const { data: userData2, error: userError } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error("User not found");

      const { error } = await supabase
        .from("files")
        .update({
          is_archived: true,
          updated_by: userData2.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq("file_id", fileToArchive.file_id);

      if (error) throw error;
      toast.success("File archived successfully");
      onFileUpdate(); // Refresh the files list
    } catch (error: any) {
      console.error("Error archiving file:", error);
      toast.error(error.message || "Failed to archive file");
    }
  };

  // Function to handle file editing
  const handleEditFile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const fileToEdit = selectedFile || file;
      const formData = new FormData(e.currentTarget);
      const fileTitle = formData.get("title") as string;
      const caseTitle = formData.get("case_title") as string;
      const blotterNumber = formData.get("blotter_number") as string;
      const investigator = formData.get("investigator") as string;
      const deskOfficer = formData.get("desk_officer") as string;
      const summary = formData.get("summary") as string;
      const uploadedFile = formData.get(
        "file"
      ) as unknown as globalThis.File | null;

      const userData = JSON.parse(Cookies.get("user_data") || "{}");

      // Get the user's ID from the users table using their email
      const { data: userData2, error: userError } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error("User not found");

      let filePath = fileToEdit.file_path;
      let publicUrl = fileToEdit.public_url;

      // Only handle file upload if a new file was actually uploaded
      if (
        uploadedFile &&
        uploadedFile instanceof globalThis.File &&
        uploadedFile.size > 0
      ) {
        const fileExt = uploadedFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const newFilePath = `folder_${fileToEdit.folder_id}/${fileName}`;

        // Delete the old file first
        const { error: deleteError } = await supabase.storage
          .from("files")
          .remove([fileToEdit.file_path]);

        if (deleteError) throw deleteError;

        // Upload the new file
        const { error: uploadError } = await supabase.storage
          .from("files")
          .upload(newFilePath, uploadedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Update file path and get new public URL
        filePath = newFilePath;
        const {
          data: { publicUrl: newPublicUrl },
        } = supabase.storage.from("files").getPublicUrl(newFilePath);
        publicUrl = newPublicUrl;
      }

      // Update the file record
      const { error: updateError } = await supabase
        .from("files")
        .update({
          title: fileTitle,
          case_title: caseTitle,
          blotter_number: blotterNumber,
          investigator,
          desk_officer: deskOfficer,
          incident_summary: summary,
          ...(uploadedFile &&
          uploadedFile instanceof globalThis.File &&
          uploadedFile.size > 0
            ? {
                file_path: filePath,
                public_url: publicUrl,
                file_name: uploadedFile.name,
              }
            : {}),
          updated_by: userData2.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq("file_id", fileToEdit.file_id);

      if (updateError) throw updateError;

      // Update reporting person details
      if (reportingPerson) {
        const { error: reportingError } = await supabase
          .from("reporting_person_details")
          .update({
            ...reportingPerson,
            birthday: new Date(reportingPerson.birthday).toISOString(),
            date_reported: new Date(
              reportingPerson.date_reported
            ).toISOString(),
            date_of_incident: new Date(
              reportingPerson.date_of_incident
            ).toISOString(),
          })
          .eq("file_id", fileToEdit.file_id);

        if (reportingError) throw reportingError;
      }

      // Update suspects
      const { error: deleteError } = await supabase
        .from("suspects")
        .delete()
        .eq("file_id", fileToEdit.file_id);

      if (deleteError) throw deleteError;

      // Split suspects into existing and new
      const existingSuspects = suspects.filter((s) => s.suspect_id);
      const newSuspects = suspects.filter((s) => !s.suspect_id);

      // Update existing suspects
      if (existingSuspects.length > 0) {
        const { error: updateError } = await supabase.from("suspects").upsert(
          existingSuspects.map((suspect) => ({
            suspect_id: suspect.suspect_id,
            file_id: fileToEdit.file_id,
            ...suspect,
            birthday: new Date(suspect.birthday).toISOString(),
          }))
        );

        if (updateError) throw updateError;
      }

      // Insert new suspects
      if (newSuspects.length > 0) {
        const { error: insertError } = await supabase.from("suspects").insert(
          newSuspects.map((suspect) => ({
            file_id: fileToEdit.file_id,
            ...suspect,
            birthday: new Date(suspect.birthday).toISOString(),
          }))
        );

        if (insertError) throw insertError;
      }

      toast.success("File updated successfully");
      setShowFileDialog(null);
      onFileUpdate(); // Refresh the files list
    } catch (error: any) {
      console.error("Error updating file:", error);
      toast.error(error.message || "Failed to update file");
    }
  };

  // Render preview content
  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          <p className="mt-4 text-gray-600">Loading preview...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <FileText size={48} className="text-red-400 mb-4" />
          <p className="text-red-600 mb-4">
            Error loading preview: {error}
            <br />
            Please try refreshing the page.
          </p>
        </div>
      );
    }

    if (!signedUrl) return null;

    if (imageTypes.includes(ext)) {
      return (
        <div className="relative aspect-video">
          <img
            src={signedUrl}
            alt={currentFile.case_title}
            className="w-full h-full object-contain"
            onError={() => setError("Failed to load image")}
          />
        </div>
      );
    }

    // For PDFs and Office documents, use Google Docs viewer
    if (pdfType.includes(ext) || officeTypes.includes(ext)) {
      return (
        <div className="w-full h-[calc(80vh-8rem)]">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(
              signedUrl
            )}&embedded=true&rm=minimal`}
            className="w-full h-full border-none"
            title={currentFile.case_title}
            onError={() => setError("Failed to load document preview")}
          />
        </div>
      );
    }

    // For other file types
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText size={48} className="text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">
          This file type cannot be previewed.
          <br />
          Please use the buttons below to download or print the file.
        </p>
      </div>
    );
  };

  // Render card preview
  // Render card preview
  const renderCardPreview = () => {
    if (isLoading) {
      return (
        <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
          <span className="mt-2 text-sm text-gray-600">Loading preview...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border">
          {getFileIcon(currentFile.file_path)}
          <span className="mt-2 text-sm text-red-600">
            Error loading preview
          </span>
          <span className="text-xs text-gray-500">{ext.toUpperCase()}</span>
        </div>
      );
    }

    if (!signedUrl) {
      return (
        <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border">
          {getFileIcon(currentFile.file_path)}
          <span className="mt-2 text-sm text-gray-600">
            Preview not available
          </span>
          <span className="text-xs text-gray-500">{ext.toUpperCase()}</span>
        </div>
      );
    }

    if (imageTypes.includes(ext)) {
      return (
        <div className="w-full h-48 bg-gray-100 rounded-lg border overflow-hidden">
          <img
            src={signedUrl || undefined}
            alt={currentFile.title}
            className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
            onClick={() => {
              setSelectedFile(currentFile);
              setShowPreview(true);
            }}
          />
        </div>
      );
    }

    // For PDFs and Office documents
    if (pdfType.includes(ext) || officeTypes.includes(ext)) {
      return (
        <div className="w-full h-48 bg-white rounded-lg border overflow-hidden relative group">
          <div className="w-full h-full overflow-auto">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                signedUrl
              )}&embedded=true&rm=minimal`}
              className="w-full h-[400px] border-none"
              title={currentFile.title}
            />
          </div>
          {/* Expand button overlay */}
          <div className="absolute top-4 right-4 z-10">
            <Button
              size="default"
              variant="secondary"
              className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
              onClick={() => {
                setSelectedFile(currentFile);
                setShowPreview(true);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" />
              </svg>
            </Button>
          </div>
        </div>
      );
    }

    // For other file types
    return (
      <div
        className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border hover:border-blue-300 transition-colors cursor-pointer"
        onClick={() => {
          setSelectedFile(currentFile);
          setShowPreview(true);
        }}
      >
        {getFileIcon(currentFile.file_path)}
        <span className="mt-2 text-sm text-gray-600">Click to preview</span>
        <span className="text-xs text-gray-500">{ext.toUpperCase()}</span>
      </div>
    );
  };
  const formRef = useRef<HTMLFormElement | null>(null);
  return (
    <>
      {/* Preview Sheet */}
      <Sheet
        open={showPreview}
        onOpenChange={(open) => {
          setShowPreview(open);
          if (!open) {
            setSelectedFile(null);
          }
        }}
      >
        <SheetContent className="max-w-6xl w-4/5 h-screen flex flex-col bg-white font-poppins scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-100">
          <SheetHeader>
            <div className="flex justify-between items-center">
              <div>
                <SheetTitle className="text-xl font-semibold">
                  {currentFile.title}
                </SheetTitle>
                <SheetDescription className="text-xs text-gray-500 mt-1">
                  {ext.toUpperCase()} Document • Added by{" "}
                  {currentFile.created_by}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable Preview Content */}
          <div className="flex-1 overflow-auto rounded-lg border max-h-[calc(100vh-150px)] mt-5">
            {renderPreviewContent()}
          </div>

          <div className="flex gap-2 justify-center">
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              onClick={handleFileDownload}
            >
              <Download size={16} />
              Download
            </Button>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              onClick={handleFilePrint}
            >
              <Printer size={16} />
              Print
            </Button>
          </div>

          <SheetFooter className="flex justify-between items-center mt-auto">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {currentFile.viewed_at && (
                <span>
                  Last viewed:{" "}
                  {new Date(currentFile.viewed_at).toLocaleString()}
                </span>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* File Operations Dialog (Archive remains as Dialog) */}
      <Sheet
        open={showFileDialog === "edit"}
        onOpenChange={() => setShowFileDialog(null)}
      >
        <SheetContent className="max-w-6xl w-4/5 h-screen flex flex-col bg-white font-poppins scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-100 pr-0">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">Edit File</SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              Modify the file details below.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto pr-0">
            <form ref={formRef} onSubmit={handleEditFile} className="space-y-6">
              {/* File Details Section */}
              <div className="space-y-4 py-4">
                <div className="space-y-4 p-4 mr-6 rounded-lg bg-slate-50">
                  <h3 className="text-lg font-semibold">File Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">File Name</Label>
                      <Input
                        id="title"
                        name="title"
                        defaultValue={(selectedFile || file).title}
                        required
                        className="border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor="case_title">Case Title</Label>
                      <Input
                        id="case_title"
                        name="case_title"
                        defaultValue={(selectedFile || file).case_title}
                        required
                        className="border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor="blotter_number">Blotter Number</Label>
                      <Input
                        id="blotter_number"
                        name="blotter_number"
                        defaultValue={(selectedFile || file).blotter_number}
                        required
                        className="border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor="investigator">Investigator</Label>
                      <Input
                        id="investigator"
                        name="investigator"
                        defaultValue={(selectedFile || file).investigator}
                        required
                        className="border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor="desk_officer">Desk Officer</Label>
                      <Input
                        id="desk_officer"
                        name="desk_officer"
                        defaultValue={(selectedFile || file).desk_officer}
                        required
                        className="border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor="file">Update File (Optional)</Label>
                      <Input
                        id="file"
                        name="file"
                        type="file"
                        className="border-gray-300 rounded-md text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        Leave empty to keep the current file
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <Label htmlFor="summary">Incident Summary</Label>
                    <Textarea
                      id="summary"
                      name="summary"
                      defaultValue={(selectedFile || file).incident_summary}
                      required
                      className="h-24 resize-none border-gray-300 rounded-md font-poppins"
                    />
                  </div>
                </div>
              </div>

              {/* Reporting Person Details */}
              {reportingPerson && (
                <div className="space-y-4 p-4 rounded-lg mr-6 bg-slate-50">
                  <p className="text-lg font-semibold">
                    Reporting Person Details
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rp_full_name">Full Name</Label>
                      <Input
                        id="rp_full_name"
                        value={reportingPerson.full_name}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            full_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_age">Age</Label>
                      <Input
                        id="rp_age"
                        type="number"
                        value={reportingPerson.age}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            age: Number(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_birthday">Birthday</Label>
                      <Input
                        id="rp_birthday"
                        type="date"
                        value={formatDateForInput(reportingPerson.birthday)}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            birthday: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_gender">Gender</Label>
                      <Select
                        value={reportingPerson.gender}
                        onValueChange={(value) =>
                          setReportingPerson({
                            ...reportingPerson,
                            gender: value as "Male" | "Female" | "Other",
                          })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="rp_complete_address">
                        Complete Address
                      </Label>
                      <Textarea
                        id="rp_complete_address"
                        value={reportingPerson.complete_address}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            complete_address: e.target.value,
                          })
                        }
                        required
                        className="h-24 resize-none border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_contact_number">Contact Number</Label>
                      <Input
                        id="rp_contact_number"
                        value={reportingPerson.contact_number}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            contact_number: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_date_reported">Date Reported</Label>
                      <Input
                        id="rp_date_reported"
                        type="date"
                        value={formatDateForInput(
                          reportingPerson.date_reported
                        )}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            date_reported: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_time_reported">Time Reported</Label>
                      <Input
                        id="rp_time_reported"
                        value={reportingPerson.time_reported}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            time_reported: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_date_of_incident">
                        Date of Incident
                      </Label>
                      <Input
                        id="rp_date_of_incident"
                        type="date"
                        value={formatDateForInput(
                          reportingPerson.date_of_incident
                        )}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            date_of_incident: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_time_of_incident">
                        Time of Incident
                      </Label>
                      <Input
                        id="rp_time_of_incident"
                        value={reportingPerson.time_of_incident}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            time_of_incident: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="rp_place_of_incident">
                        Place of Incident
                      </Label>
                      <Textarea
                        id="rp_place_of_incident"
                        value={reportingPerson.place_of_incident}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            place_of_incident: e.target.value,
                          })
                        }
                        required
                        className="h-24 resize-none border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Suspects Section */}
              <div className="space-y-4 p-4 rounded-lg bg-slate-50 mr-6">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold">Suspects</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSuspect}
                    className="text-sm"
                  >
                    Add Another Suspect
                  </Button>
                </div>
                {suspects.map((suspect, index) => (
                  <div key={index} className="space-y-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor={`suspect_${index}_full_name`}>
                        Full Name
                      </Label>
                      <Input
                        id={`suspect_${index}_full_name`}
                        value={suspect.full_name}
                        onChange={(e) =>
                          updateSuspect(index, "full_name", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`suspect_${index}_age`}>Age</Label>
                      <Input
                        id={`suspect_${index}_age`}
                        type="number"
                        value={suspect.age}
                        onChange={(e) =>
                          updateSuspect(index, "age", Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`suspect_${index}_birthday`}>
                        Birthday
                      </Label>
                      <Input
                        id={`suspect_${index}_birthday`}
                        type="date"
                        value={formatDateForInput(suspect.birthday)}
                        onChange={(e) =>
                          updateSuspect(index, "birthday", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`suspect_${index}_gender`}>Gender</Label>
                      <Select
                        value={suspect.gender}
                        onValueChange={(value) =>
                          updateSuspect(
                            index,
                            "gender",
                            value as "Male" | "Female" | "Other"
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`suspect_${index}_complete_address`}>
                        Complete Address
                      </Label>
                      <Textarea
                        id={`suspect_${index}_complete_address`}
                        value={suspect.complete_address}
                        onChange={(e) =>
                          updateSuspect(
                            index,
                            "complete_address",
                            e.target.value
                          )
                        }
                        className="h-24 resize-none border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`suspect_${index}_contact_number`}>
                        Contact Number
                      </Label>
                      <Input
                        id={`suspect_${index}_contact_number`}
                        value={suspect.contact_number}
                        onChange={(e) =>
                          updateSuspect(index, "contact_number", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeSuspect(index)}
                        className="text-sm"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          </div>
          {/* Move the SheetFooter outside the form */}
          <SheetFooter className="mr-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFileDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-900 text-white hover:bg-blue-700"
              onClick={() =>
                formRef.current?.dispatchEvent(
                  new Event("submit", { bubbles: true })
                )
              } // Trigger form submission
            >
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* New Sheet for Viewing Details without Footer */}
      <Sheet
        open={showFileDialog === "details"}
        onOpenChange={() => setShowFileDialog(null)}
      >
        <SheetContent className="max-w-6xl w-4/5 h-screen flex flex-col bg-white font-poppins scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-100 pr-0">
          <SheetHeader>
            <SheetTitle>File Details</SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              View complete details of the file.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto pr-0">
            {/* File Details Section */}
            <div className="space-y-4 py-4">
              <div className="space-y-4 p-4 mr-6 rounded-lg bg-slate-50">
                <h3 className="text-lg font-semibold">File Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>File Name</Label>
                    <p className="text-gray-900 mt-1">{currentFile.title}</p>
                  </div>
                  <div>
                    <Label>Case Title</Label>
                    <p className="text-gray-900 mt-1">
                      {currentFile.case_title}
                    </p>
                  </div>
                  <div>
                    <Label>Blotter Number</Label>
                    <p className="text-gray-900 mt-1">
                      {currentFile.blotter_number}
                    </p>
                  </div>
                  <div>
                    <Label>Investigator</Label>
                    <p className="text-gray-900 mt-1">
                      {currentFile.investigator}
                    </p>
                  </div>
                  <div>
                    <Label>Desk Officer</Label>
                    <p className="text-gray-900 mt-1">
                      {currentFile.desk_officer}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label>Incident Summary</Label>
                    <div className="mt-1 p-3 bg-slate-50 border rounded-md whitespace-pre-wrap font-poppins text-sm">
                      {currentFile.incident_summary}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reporting Person Details */}
            {reportingPerson && (
              <div className="space-y-4 p-4 rounded-lg mr-6 bg-slate-50">
                <p className="text-lg font-semibold">
                  Reporting Person Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <p className="text-gray-900 mt-1">
                      {reportingPerson.full_name}
                    </p>
                  </div>
                  <div>
                    <Label>Age</Label>
                    <p className="text-gray-900 mt-1">{reportingPerson.age}</p>
                  </div>
                  <div>
                    <Label>Birthday</Label>
                    <p className="text-gray-900 mt-1">
                      {formatDateForInput(reportingPerson.birthday)}
                    </p>
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <p className="text-gray-900 mt-1">
                      {reportingPerson.gender}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label>Complete Address</Label>
                    <div className="mt-1 p-3 bg-slate-50 border rounded-md whitespace-pre-wrap font-poppins text-sm">
                      {reportingPerson.complete_address}
                    </div>
                  </div>
                  <div>
                    <Label>Contact Number</Label>
                    <p className="text-gray-900 mt-1">
                      {reportingPerson.contact_number}
                    </p>
                  </div>
                  <div>
                    <Label>Date Reported</Label>
                    <p className="text-gray-900 mt-1">
                      {formatDateForInput(reportingPerson.date_reported)}
                    </p>
                  </div>
                  <div>
                    <Label>Time Reported</Label>
                    <p className="text-gray-900 mt-1">
                      {reportingPerson.time_reported}
                    </p>
                  </div>
                  <div>
                    <Label>Date of Incident</Label>
                    <p className="text-gray-900 mt-1">
                      {formatDateForInput(reportingPerson.date_of_incident)}
                    </p>
                  </div>
                  <div>
                    <Label>Time of Incident</Label>
                    <p className="text-gray-900 mt-1">
                      {reportingPerson.time_of_incident}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label>Place of Incident</Label>
                    <div className="mt-1 p-3 bg-slate-50 border rounded-md whitespace-pre-wrap font-poppins text-sm">
                      {reportingPerson.place_of_incident}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Suspects Section */}
            {suspects.length > 0 && (
              <div className="space-y-4 p-4 rounded-lg bg-slate-50 mr-6">
                <p className="text-lg font-semibold">Suspects</p>
                {suspects.map((suspect, index) => (
                  <div key={index} className="space-y-4 p-4 border rounded-lg">
                    <div>
                      <Label>Full Name</Label>
                      <p className="text-gray-900 mt-1">{suspect.full_name}</p>
                    </div>
                    <div>
                      <Label>Age</Label>
                      <p className="text-gray-900 mt-1">{suspect.age}</p>
                    </div>
                    <div>
                      <Label>Birthday</Label>
                      <p className="text-gray-900 mt-1">
                        {formatDateForInput(suspect.birthday)}
                      </p>
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <p className="text-gray-900 mt-1">{suspect.gender}</p>
                    </div>
                    <div className="col-span-2">
                      <Label>Complete Address</Label>
                      <div className="mt-1 p-3 bg-white border rounded-md whitespace-pre-wrap font-mono text-sm">
                        {suspect.complete_address}
                      </div>
                    </div>
                    <div>
                      <Label>Contact Number</Label>
                      <p className="text-gray-900 mt-1">
                        {suspect.contact_number}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* File Activity */}
            <div className="p-4 mr-6 mt-5">
              <h3 className="font-medium">File Activity</h3>
              <div className="p-2 space-y-2 text-gray-600">
                <div className="flex items-center justify-between text-xs ">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <Label className="font-normal">Created</Label>
                    <p className="text-gray-600">
                      {new Date(currentFile.created_at).toLocaleString()} by{" "}
                      <span className="text-blue-900">
                        {currentFile.created_by}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <Label className="font-normal">Last Updated</Label>
                    <p className="text-gray-600">
                      {currentFile.updated_at ? (
                        <span>
                          {new Date(currentFile.updated_at).toLocaleString()} by{" "}
                          <span className="text-blue-900">
                            {currentFile.updated_by}
                          </span>
                        </span>
                      ) : (
                        "Never"
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 " />
                    <Label className="font-normal">Last Viewed</Label>
                    <p className="text-gray-600">
                      {currentFile.viewed_at ? (
                        <span>
                          {new Date(currentFile.viewed_at).toLocaleString()} by{" "}
                          <span className="text-blue-900">
                            {currentFile.viewed_by}
                          </span>
                        </span>
                      ) : (
                        "Never"
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <Label className="font-normal">Last Downloaded</Label>
                    <p className="text-gray-600">
                      {currentFile.downloaded_at ? (
                        <span>
                          {new Date(currentFile.downloaded_at).toLocaleString()}{" "}
                          by{" "}
                          <span className="text-blue-900">
                            {currentFile.downloaded_by}
                          </span>
                        </span>
                      ) : (
                        "Never"
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Printer className="w-4 h-4" />
                    <Label className="font-normal">Last Printed</Label>
                    <p className="text-gray-600">
                      {currentFile.printed_at ? (
                        <span>
                          {new Date(currentFile.printed_at).toLocaleString()} by{" "}
                          <span className="text-blue-900">
                            {currentFile.printed_by}
                          </span>
                        </span>
                      ) : (
                        "Never"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={showFileDialog === "archive"}
        onOpenChange={() => setShowFileDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive File</DialogTitle>
            <DialogDescription>
              This action will archive the folder and remove it from the active
              folders list. You can access it later in the Archives section.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFileDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={async () => {
                await handleArchiveFile();
                setShowFileDialog(null);
              }}
            >
              Yes, Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render card preview in both list and grid view */}
      {!isListView && renderCardPreview()}

      {/* Download and Print buttons - only show when not in list view */}
      {!isListView && (
        <div className="flex gap-2 justify-center">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            onClick={handleFileDownload}
          >
            <Download size={16} />
            Download
          </Button>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            onClick={handleFilePrint}
          >
            <Printer size={16} />
            Print
          </Button>
        </div>
      )}
    </>
  );
}
