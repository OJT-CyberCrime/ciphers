import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetOverlay,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/utils/supa";
import Cookies from "js-cookie";
import {
  Download,
  Printer,
  File,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface FileRecord {
  file_id: number;
  folder_id: number;
  title: string;
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

interface FileOperationsProps {
  file: FileRecord;
  showPreview?: boolean;
  setShowPreview?: (show: boolean) => void;
  showFileDialog: "edit" | "archive" | "details" | null;
  setShowFileDialog: (dialog: "edit" | "archive" | "details" | null) => void;
  onFileUpdate: () => void;
  selectedFile?: FileRecord | null;
  setSelectedFile: (file: FileRecord | null) => void;
  listView?: boolean;
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

export default function FileOperations({
  file,
  showPreview = false,
  setShowPreview = () => {},
  showFileDialog,
  setShowFileDialog,
  onFileUpdate,
  selectedFile,
  setSelectedFile,
  listView = false,
}: FileOperationsProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // Use currentFile only for file operations and details dialog
  const currentFile = showFileDialog ? selectedFile || file : file;
  const ext = currentFile.file_path.split(".").pop()?.toLowerCase() || "";
  const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
  const pdfType = ["pdf"];
  const officeTypes = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];

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
      a.download = currentFile.title + "." + ext;
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
      const title = formData.get("title") as string;
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
          title,
          investigator,
          desk_officer: deskOfficer,
          incident_summary: summary,
          ...(uploadedFile &&
          uploadedFile instanceof globalThis.File &&
          uploadedFile.size > 0
            ? {
                file_path: filePath,
                public_url: publicUrl,
              }
            : {}),
          updated_by: userData2.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq("file_id", fileToEdit.file_id);

      if (updateError) throw updateError;

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
            alt={currentFile.title}
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
            title={currentFile.title}
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

  // Only render preview-related UI if showPreview prop is provided
  const renderPreviewUI = () => {
    if (showPreview === undefined) return null;

    return (
      <>
        {/* Preview Dialog */}
        <Sheet
          open={showPreview}
          onOpenChange={(open) => {
            setShowPreview(open);
            if (!open) {
              setSelectedFile(null);
            }
          }}
        >
          <SheetOverlay className="bg-black/60 " />
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

        {/* Card Preview - Only show in grid view */}
        {!listView && (
          <div className="mt-2 relative">{renderCardPreview()}</div>
        )}
      </>
    );
  };

  return (
    <>
      {renderPreviewUI()}

      {/* File Operations Dialog */}
      <Sheet
        open={showFileDialog !== null && showFileDialog !== "archive"}
        onOpenChange={() => setShowFileDialog(null)}
      >
        <SheetContent className="max-w-6xl w-4/5 h-screen flex flex-col bg-white font-poppins scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-100">
          <SheetHeader className="sticky top-0 z-10">
            <SheetTitle className="text-xl font-semibold">
              {showFileDialog === "edit"
                ? "Edit File"
                : showFileDialog === "details"
                ? "File Details"
                : ""}
            </SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              {showFileDialog === "edit"
                ? "You can modify the file details below."
                : showFileDialog === "details"
                ? "View complete details of the file."
                : ""}
            </SheetDescription>
          </SheetHeader>
          {/* <Separator className="w-full mb-3"/> */}
          <div className="space-y-4 font-poppins">
            {showFileDialog === "edit" && (
              <form onSubmit={handleEditFile}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-gray-700">File Title</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={(selectedFile || file).title}
                      required
                      className="border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="investigator" className="text-gray-700">Investigator</Label>
                    <Input
                      id="investigator"
                      name="investigator"
                      defaultValue={(selectedFile || file).investigator}
                      required
                      className="border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="desk_officer" className="text-gray-700">Desk Officer</Label>
                    <Input
                      id="desk_officer"
                      name="desk_officer"
                      defaultValue={(selectedFile || file).desk_officer}
                      required
                      className="border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="summary" className="text-gray-700">Incident Summary</Label>
                    <Textarea
                      id="summary"
                      name="summary"
                      defaultValue={(selectedFile || file).incident_summary}
                      required
                      className="h-32 resize-none border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label
                      htmlFor="file"
                      className="text-sm font-medium text-gray-700"
                    >
                      Update File (Optional)
                    </Label>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      className="border-gray-300 rounded-md px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 font-light">
                      Leave empty to keep the current file
                    </p>
                  </div>
                </div>
                <SheetFooter className="mt-10 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowFileDialog(null)}
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-800 text-white hover:bg-blue-700"
                  >
                    Save Changes
                  </Button>
                </SheetFooter>
              </form>
            )}

            {showFileDialog === "details" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">File Title</Label>
                  <Input
                    id="file-title"
                    name="file-title"
                    defaultValue={currentFile.title}
                    readOnly
                    className="border-gray-300 rounded-md font-regular text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Investigator</Label>
                  <Input
                    id="investigator"
                    name="investigator"
                    defaultValue={currentFile.investigator}
                    readOnly
                    className="border-gray-300 rounded-md font-regular text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Desk Officer</Label>
                  <Input
                    id="desk-officer"
                    name="desk-officer"
                    defaultValue={currentFile.desk_officer}
                    readOnly
                    className="border-gray-300 rounded-md font-regular text-gray-500"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Incident Summary</Label>
                  <Textarea
                    id="summary"
                    name="summary"
                    defaultValue={currentFile.incident_summary}
                    readOnly
                    className="h-32 resize-none border-gray-300 rounded-md font-regular text-gray-500"
                  />
                </div>
                <SheetFooter className="flex justify-end">
                  <Button
                    className="bg-blue-800 text-white hover:bg-blue-700 mt-10"
                    onClick={() => {
                      setSelectedFile(null);
                      setShowFileDialog(null);
                    }}
                  >
                    Close
                  </Button>
                </SheetFooter>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Archive Dialog */}
      <Dialog
        open={showFileDialog === "archive"}
        onOpenChange={() => setShowFileDialog(null)}
      >
        <DialogContent className="font-poppins">
          <DialogHeader className="text-xl">
            <DialogTitle>Archive File</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-gray-600 text-sm">
            Are you sure you want to archive this file? This will remove it from
            the active files list.
          </DialogDescription>
          <DialogFooter className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFileDialog(null)}
              className="mr-2"
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

      {/* Download and Print buttons - only show when not in list view */}
      {!listView && (
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
