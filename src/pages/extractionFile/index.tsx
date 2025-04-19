import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import SearchBar from "@/Search";
import {
  ChevronRight,
  Plus,
  FileText,
  Image as ImageIcon,
  File,
  Pencil,
  Archive,
  Eye,
  MoreVertical,
  SortAsc,
  Grid,
  List,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/utils/supa";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Cookies from "js-cookie";
import RichTextEditor from "@/components/RichTextEditor";
import FileOperations from "./components/FileOperations";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import PermissionDialog from "@/components/PermissionDialog";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface Extraction {
  extraction_id: number;
  title: string;
  control_num: string;
  complainant: string;
  assisted_by: string;
  accompanied_by: string;
  witnesses: string;
  respondent: string;
  investigator: string;
  contact_num: string;
  fb_account: string;
  station_unit: string;
  date_release: string;
  signatories: string;
  incident_summary: string;
  file_path: string;
  public_url: string;
  is_archived: boolean;
  folder_id: number;
  created_by: string;
  updated_by: string | null;
  viewed_by: string | null;
  downloaded_by: string | null;
  printed_by: string | null;
  created_at: string;
  updated_at: string | null;
  viewed_at: string | null;
  downloaded_at: string | null;
  printed_at: string | null;
  creator?: { name: string };
  updater?: { name: string };
  viewer?: { name: string };
  downloader?: { name: string };
  printer?: { name: string };
}

interface Folder {
  folder_id: number;
  title: string;
  status: string;
  created_by: string;
  created_at: string;
}

// Helper function to get file type icon
const getFileIcon = (filePath: string) => {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp"];
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

// Add this helper function to strip HTML tags
const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

export default function extractionFile() {
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [files, setFiles] = useState<Extraction[]>([]);
  const [folderDetails, setFolderDetails] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFile, setNewFile] = useState<Partial<Extraction>>({
    title: "",
    control_num: "",
    complainant: "",
    assisted_by: "",
    accompanied_by: "",
    witnesses: "",
    respondent: "",
    investigator: "",
    contact_num: "",
    fb_account: "",
    station_unit: "",
    date_release: new Date().toISOString().split("T")[0],
    signatories: "",
    incident_summary: "",
  });
  const [fileUpload, setFileUpload] = useState<FileList | null>(null);
  const [selectedFile, setSelectedFile] = useState<Extraction | null>(null);
  const [showFileDialog, setShowFileDialog] = useState<
    "edit" | "archive" | "details" | null
  >(null);
  const [previewStates, setPreviewStates] = useState<{
    [key: number]: boolean;
  }>({});
  const [showOptions, setShowOptions] = useState<{ [key: number]: boolean }>(
    {}
  );
  const navigate = useNavigate();
  const location = useLocation();
  const previousPage = "/extraction"; // Path to extraction page
  const previousPageName = "Certification of Extraction"; // Name for breadcrumb
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionAction, setPermissionAction] = useState("");

  const userRole = JSON.parse(Cookies.get("user_data") || "{}").role;

  const canEditOrArchive = () => {
    return (
      userRole === "admin" || userRole === "superadmin" || userRole === "wcpd"
    );
  };

  const handleEditClick = (file: Extraction) => {
    if (!canEditOrArchive()) {
      setPermissionAction("edit this file");
      setShowPermissionDialog(true);
      return;
    }
    setSelectedFile(file);
    setShowFileDialog("edit");
  };

  const handleArchiveClick = (file: Extraction) => {
    if (!canEditOrArchive()) {
      setPermissionAction("archive this file");
      setShowPermissionDialog(true);
      return;
    }
    setSelectedFile(file);
    setShowFileDialog("archive");
  };

  // Handle file upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !fileUpload?.[0]) return;

    try {
      const userData = JSON.parse(Cookies.get("user_data") || "{}");

      const { data: userData2, error: userError } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error("User not found");

      // Upload file to storage
      const file = fileUpload[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `folder_${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("files").getPublicUrl(filePath);

      // Create extraction record
      const { data: extractionData, error: extractionError } = await supabase
        .from("extraction")
        .insert([
          {
            ...newFile,
            incident_summary: stripHtml(newFile.incident_summary || ""),
            file_path: filePath,
            public_url: publicUrl,
            is_archived: false,
            created_by: userData2.user_id,
            folder_id: id,
          },
        ])
        .select(
          `
          *,
          creator:created_by(name),
          updater:updated_by(name),
          viewer:viewed_by(name),
          downloader:downloaded_by(name),
          printer:printed_by(name)
        `
        )
        .single();

      if (extractionError) throw extractionError;

      setFiles([extractionData, ...files]);
      toast.success("Certificate file added successfully");
      setIsAddingFile(false);
      setNewFile({
        title: "",
        control_num: "",
        complainant: "",
        assisted_by: "",
        accompanied_by: "",
        witnesses: "",
        respondent: "",
        investigator: "",
        contact_num: "",
        fb_account: "",
        station_unit: "",
        date_release: new Date().toISOString().split("T")[0],
        signatories: "",
        incident_summary: "",
      });
      setFileUpload(null);
    } catch (error: any) {
      console.error("Error adding certificate file:", error);
      toast.error(error.message || "Failed to add certificate file");
    }
  };

  // Fetch folder details and files
  useEffect(() => {
    const fetchFolderAndFiles = async () => {
      if (!id) return;

      try {
        // Fetch folder details
        const { data: folderData, error: folderError } = await supabase
          .from("folders")
          .select(
            `
            *,
            creator:created_by(name)
          `
          )
          .eq("folder_id", id)
          .single();

        if (folderError) throw folderError;

        setFolderDetails({
          ...folderData,
          created_by: folderData.creator?.name || folderData.created_by,
        });

        // Fetch extraction files in the folder
        const { data: filesData, error: filesError } = await supabase
          .from("extraction")
          .select(
            `
            *,
            creator:created_by(name),
            updater:updated_by(name),
            viewer:viewed_by(name),
            downloader:downloaded_by(name),
            printer:printed_by(name)
          `
          )
          .eq("folder_id", id)
          .eq("is_archived", false)
          .order("created_at", { ascending: false });

        if (filesError) throw filesError;

        const formattedFiles = filesData.map((file) => ({
          ...file,
          created_by: file.creator?.name || file.created_by,
          updated_by: file.updater?.name || file.updated_by,
          viewed_by: file.viewer?.name || file.viewed_by,
          downloaded_by: file.downloader?.name || file.downloaded_by,
          printed_by: file.printer?.name || file.printed_by,
        }));

        setFiles(formattedFiles);
      } catch (error) {
        console.error("Error fetching folder data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFolderAndFiles();
  }, [id]);

  // Filter files based on search query
  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.incident_summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Update the helper function to return an object with class and label
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return { class: "bg-yellow-200 text-yellow-800", label: "Pending" }; // Lighter for pending status
      case "resolved":
        return { class: "bg-green-200 text-green-800", label: "Resolved" }; // Lighter for resolved status
      case "dismissed":
        return { class: "bg-red-200 text-red-800", label: "Dismissed" }; // Lighter for dismissed status
      case "under investigation":
        return {
          class: "bg-blue-200 text-blue-800",
          label: "Under Investigation",
        }; // Lighter for under investigation status
      default:
        return { class: "bg-gray-200 text-black", label: "N/A" }; // Default case
    }
  };
  const [isListView, setIsListView] = useState(() => {
    // Retrieve the view state from localStorage
    const savedView = localStorage.getItem("isListView");
    return savedView ? JSON.parse(savedView) : false; // Default to grid view if not set
  });
  const handleViewChange = (view: boolean) => {
    setIsListView(view);
    localStorage.setItem("isListView", JSON.stringify(view)); // Save the view state to localStorage
  };

  const [sortCriteria, setSortCriteria] = useState("created_at");
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState<{
    [key: number]: boolean;
  }>({});

  // Update the click handler for the MoreVertical button
  const handleMoreOptionsClick = (e: React.MouseEvent, fileId: number) => {
    e.stopPropagation(); // Prevent row click
    setContextMenuVisible((prev) => ({ ...prev, [fileId]: !prev[fileId] })); // Toggle the context menu
  };

  // Fetch folder details and files
  const fetchFolderAndFiles = async () => {
    if (!id) return;

    try {
      // Fetch folder details
      const { data: folderData, error: folderError } = await supabase
        .from("folders")
        .select(
          `
            *,
            creator:created_by(name)
          `
        )
        .eq("folder_id", id)
        .single();

      if (folderError) throw folderError;

      setFolderDetails({
        ...folderData,
        created_by: folderData.creator?.name || folderData.created_by,
      });

      // Fetch files in the folder
      const { data: filesData, error: filesError } = await supabase
        .from("extraction")
        .select(
          `
            *,
            creator:created_by(name),
            updater:updated_by(name),
            viewer:viewed_by(name),
            downloader:downloaded_by(name),
            printer:printed_by(name)
          `
        )
        .eq("folder_id", id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (filesError) throw filesError;

      const formattedFiles = filesData.map((file) => ({
        ...file,
        created_by: file.creator?.name || file.created_by,
        updated_by: file.updater?.name || file.updated_by,
        viewed_by: file.viewer?.name || file.viewed_by,
        downloaded_by: file.downloader?.name || file.downloaded_by,
        printed_by: file.printer?.name || file.printed_by,
      }));

      setFiles(formattedFiles);
    } catch (error) {
      console.error("Error fetching folder data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderAndFiles();
  }, [id]);

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
        />

        <Select onValueChange={setFilter} defaultValue="all">
          <SelectTrigger className="w-full md:w-48 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Files</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="other">Others</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={setSortCriteria} defaultValue="created_at">
          <SelectTrigger className="w-full md:w-48 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 flex items-center gap-2">
            <SortAsc size={16} className="text-gray-600" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date Created</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => setIsAddingFile(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
        >
          <Plus size={16} /> Add File
        </Button>
      </div>

      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-4 text-gray-600 flex space-x-2">
        <BreadcrumbItem>
          <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
            Home
          </Link>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="flex items-center">
          <ChevronRight size={16} />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <Link to={previousPage} className="text-gray-600 hover:text-gray-900">
            {previousPageName}
          </Link>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="flex items-center">
          <ChevronRight size={16} />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <span className="text-gray-900">
            {folderDetails?.title || `Folder ${id}`}
          </span>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Folder Content */}
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-medium font-poppins text-blue-900">
              {folderDetails?.title || `Folder ${id}`}
            </h1>
            <Badge
              variant="outline"
              className={`${
                getStatusBadgeClass(folderDetails?.status || "N/A").class
              } shadow-none`}
            >
              {getStatusBadgeClass(folderDetails?.status || "N/A").label}
            </Badge>
          </div>
          <div className="flex items-center bg-gray-200 rounded-full overflow-hidden border border-gray-300">
            <Button
              onClick={() => handleViewChange(true)}
              className={`flex items-center justify-center w-10 h-8 rounded-s-full ${
                isListView ? "bg-blue-200" : "bg-white"
              } transition-colors hover:${
                isListView ? "bg-blue-300" : "bg-gray-100"
              }`}
            >
              <List size={16} color="black" />
            </Button>
            <Button
              onClick={() => handleViewChange(false)}
              className={`flex items-center justify-center w-10 h-8 rounded-e-full ${
                !isListView ? "bg-blue-200" : "bg-white"
              } transition-colors hover:${
                !isListView ? "bg-blue-300" : "bg-gray-100"
              }`}
            >
              <Grid size={16} color="black" />
            </Button>
          </div>
        </div>

        {/* Loading Skeleton or Files Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : isListView ? (
          <div className="overflow-x-auto">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8 font-poppins">
                <DotLottieReact
                  src="/assets/NoFiles.lottie"
                  loop
                  autoplay
                  className="w-6/12"
                />
                No files found in this folder
              </div>
            ) : (
              <table className="min-w-full bg-gray-50 font-poppins">
                <thead>
                  <tr>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      File Name
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Added By
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Date Added
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr
                      key={file.extraction_id}
                      className="hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                        setSelectedFile(file);
                        setPreviewStates((prev) => ({
                          ...prev,
                          [file.extraction_id]: true,
                        }));
                      }}
                    >
                      <td className="px-4 py-2 border-b flex items-center gap-2">
                        {getFileIcon(file.file_path)}
                        {file.title}
                      </td>
                      <td className="px-4 py-2 border-b">{file.created_by}</td>
                      <td className="px-4 py-2 border-b">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 border-b flex space-x-2">
                        <button
                          className="p-2 rounded-full hover:bg-gray-200 menu-trigger"
                          onClick={(e) =>
                            handleMoreOptionsClick(e, file.extraction_id)
                          }
                        >
                          <MoreVertical size={16} color="black" />
                        </button>
                        {contextMenuVisible[file.extraction_id] && (
                          <div
                            ref={contextMenuRef}
                            className="absolute bg-white border border-gray-300 rounded-lg shadow-lg z-10 context-menu font-poppins"
                          >
                            <button
                              className="block w-full text-left p-2 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(file);
                                setContextMenuVisible((prev) => ({
                                  ...prev,
                                  [file.extraction_id]: false,
                                }));
                              }}
                            >
                              <Pencil className="inline w-4 h-4 mr-2" /> Edit
                            </button>
                            <button
                              className="block w-full text-left p-2 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveClick(file);
                                setContextMenuVisible((prev) => ({
                                  ...prev,
                                  [file.extraction_id]: false,
                                }));
                              }}
                            >
                              <Archive className="inline w-4 h-4 mr-2" />{" "}
                              Archive
                            </button>
                            <button
                              className="block w-full text-left p-2 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setShowFileDialog("details");
                                setContextMenuVisible((prev) => ({
                                  ...prev,
                                  [file.extraction_id]: false,
                                }));
                              }}
                            >
                              <Eye className="inline w-4 h-4 mr-2" /> View
                              Details
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {selectedFile && (
              <FileOperations
                file={selectedFile}
                showPreview={previewStates[selectedFile.extraction_id] || false}
                setShowPreview={(show) => {
                  setPreviewStates((prev) => ({
                    ...prev,
                    [selectedFile.extraction_id]: show,
                  }));
                }}
                showFileDialog={showFileDialog}
                setShowFileDialog={setShowFileDialog}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                onFileUpdate={() => {
                  // Remove the file from the UI if it was archived
                  if (showFileDialog === "archive") {
                    setFiles(
                      files.filter(
                        (f) => f.extraction_id !== selectedFile?.extraction_id
                      )
                    );
                  } else {
                    // Refresh the files list
                    fetchFolderAndFiles();
                  }
                }}
                isListView={isListView}
              />
            )}
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 font-poppins">
            {filteredFiles.map((file) => (
              <div key={file.extraction_id} className="relative">
                <div
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow aspect-square"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowOptions((prev) => ({
                      ...prev,
                      [file.extraction_id]: !prev[file.extraction_id],
                    }));
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(file.file_path)}
                      <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">
                        {file.title}
                      </h3>
                    </div>
                    <button
                      className="p-2 shrink-0 rounded-full hover:bg-gray-200 menu-trigger"
                      onClick={() =>
                        setShowOptions((prev) => ({
                          ...prev,
                          [file.extraction_id]: !prev[file.extraction_id], // Changed from file.file_id to file.extraction_id
                        }))
                      }
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <FileOperations
                    file={file}
                    showPreview={previewStates[file.extraction_id] || false}
                    setShowPreview={(show) => {
                      setPreviewStates((prev) => ({
                        ...prev,
                        [file.extraction_id]: show,
                      }));
                    }}
                    showFileDialog={showFileDialog}
                    setShowFileDialog={setShowFileDialog}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    onFileUpdate={() => {
                      // Remove the file from the UI if it was archived
                      if (showFileDialog === "archive") {
                        setFiles(
                          files.filter(
                            (f) =>
                              f.extraction_id !== selectedFile?.extraction_id
                          )
                        );
                      } else {
                        // Refresh the files list
                        fetchFolderAndFiles();
                      }
                    }}
                    isListView={isListView}
                  />
                  <div className="text-xs text-gray-500 mt-2">
                    Added by {file.created_by} on{" "}
                    {new Date(file.created_at).toLocaleDateString()}
                  </div>
                </div>

                {showOptions[file.extraction_id] && (
                  <div
                    className="absolute top-10 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 font-poppins"
                    ref={contextMenuRef}
                  >
                    <Button
                      variant="ghost"
                      className="block w-full text-left p-2 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(file);
                        setShowOptions((prev) => ({
                          ...prev,
                          [file.extraction_id]: false,
                        }));
                      }}
                    >
                      <Pencil className="inline w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="block w-full text-left p-2 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveClick(file);
                        setShowOptions((prev) => ({
                          ...prev,
                          [file.extraction_id]: false,
                        }));
                      }}
                    >
                      <Archive className="inline w-4 h-4 mr-2" /> Archive
                    </Button>
                    <Button
                      variant="ghost"
                      className="block w-full text-left p-2 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(file);
                        setShowFileDialog("details");
                        setShowOptions((prev) => ({
                          ...prev,
                          [file.extraction_id]: false,
                        }));
                      }}
                    >
                      <Eye className="inline w-4 h-4 mr-2" /> View Details
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
            <DotLottieReact
              src="/assets/NoFiles.lottie"
              loop
              autoplay
              className="w-6/12"
            />
            No files found in this folder
          </div>
        )}
      </div>

      {/* Add File Dialog */}
      <Sheet open={isAddingFile} onOpenChange={setIsAddingFile}>
        <SheetContent className="max-w-6xl w-4/5 h-screen flex flex-col bg-white font-poppins scrollbar scrollbar-thumb-gray-400 scrollbar-track-gray-100 pr-0">
          <SheetHeader>
            <SheetTitle className="text-xl">
              Add New Certificate of Extraction
            </SheetTitle>
            <SheetDescription className="text-sm">
              Enter the details for the new certificate.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto">
            <form onSubmit={handleFileUpload} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto pr-4 space-y-6">

                {/* Basic Information Section */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg mr-6">
                <h3 className="text-sm font-medium text-gray-500">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Case Title</Label>
                      <Input
                        id="title"
                        value={newFile.title}
                        onChange={(e) =>
                          setNewFile({ ...newFile, title: e.target.value })
                        }
                        placeholder="Enter case title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="control_num">Control Number</Label>
                      <Input
                        id="control_num"
                        type="text"
                        value={newFile.control_num}
                        onChange={(e) =>
                          setNewFile({
                            ...newFile,
                            control_num: e.target.value,
                          })
                        }
                        placeholder="Enter control number"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_release">Date of Release</Label>
                      <Input
                        id="date_release"
                        type="date"
                        value={newFile.date_release}
                        onChange={(e) =>
                          setNewFile({
                            ...newFile,
                            date_release: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="station_unit">Station/Unit</Label>
                      <Input
                        id="station_unit"
                        value={newFile.station_unit}
                        onChange={(e) =>
                          setNewFile({
                            ...newFile,
                            station_unit: e.target.value,
                          })
                        }
                        placeholder="Enter station/unit"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Parties Involved Section */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg mr-6">
                <h3 className="text-sm font-medium text-gray-500">
                    Parties Involved
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="complainant">Complainant</Label>
                      <Input
                        id="complainant"
                        value={newFile.complainant}
                        onChange={(e) =>
                          setNewFile({
                            ...newFile,
                            complainant: e.target.value,
                          })
                        }
                        placeholder="Enter complainant name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="respondent">Respondent</Label>
                      <Input
                        id="respondent"
                        value={newFile.respondent}
                        onChange={(e) =>
                          setNewFile({ ...newFile, respondent: e.target.value })
                        }
                        placeholder="Enter respondent name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="witnesses">Witnesses</Label>
                      <Input
                        id="witnesses"
                        value={newFile.witnesses}
                        onChange={(e) =>
                          setNewFile({ ...newFile, witnesses: e.target.value })
                        }
                        placeholder="Enter witness names"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="investigator">Investigator</Label>
                      <Input
                        id="investigator"
                        value={newFile.investigator}
                        onChange={(e) =>
                          setNewFile({
                            ...newFile,
                            investigator: e.target.value,
                          })
                        }
                        placeholder="Enter investigator name"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Supporting Personnel Section */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg mr-6">
                <h3 className="text-sm font-medium text-gray-500">
                    Supporting Personnel
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assisted_by">Assisted By</Label>
                      <Input
                        id="assisted_by"
                        value={newFile.assisted_by}
                        onChange={(e) =>
                          setNewFile({
                            ...newFile,
                            assisted_by: e.target.value,
                          })
                        }
                        placeholder="Enter assisting officer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accompanied_by">Accompanied By</Label>
                      <Input
                        id="accompanied_by"
                        value={newFile.accompanied_by}
                        onChange={(e) =>
                          setNewFile({
                            ...newFile,
                            accompanied_by: e.target.value,
                          })
                        }
                        placeholder="Enter accompanying officer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signatories">Signatories</Label>
                      <Input
                        id="signatories"
                        value={newFile.signatories}
                        onChange={(e) =>
                          setNewFile({
                            ...newFile,
                            signatories: e.target.value,
                          })
                        }
                        placeholder="Enter signatory names"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg mr-6">
                <h3 className="text-sm font-medium text-gray-500">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_num">Contact Number</Label>
                      <Input
                        id="contact_num"
                        value={newFile.contact_num}
                        onChange={(e) =>
                          setNewFile({
                            ...newFile,
                            contact_num: e.target.value,
                          })
                        }
                        placeholder="Enter contact number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fb_account">Facebook Account</Label>
                      <Input
                        id="fb_account"
                        value={newFile.fb_account}
                        onChange={(e) =>
                          setNewFile({ ...newFile, fb_account: e.target.value })
                        }
                        placeholder="Enter Facebook profile"
                      />
                    </div>
                  </div>
                </div>

                {/* Incident Details Section */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg mr-6">
                  <h3 className="text-lg font-semibold">
                    Incident Details
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="incident_summary">Incident Summary</Label>
                    <RichTextEditor
                      content={newFile.incident_summary || ""}
                      onChange={(content) =>
                        setNewFile({ ...newFile, incident_summary: content })
                      }
                    />
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg mr-6">
                  <h3 className="text-sm font-medium text-gray-500">
                    Attachments
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="file">Upload Supporting Document</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setFileUpload(e.target.files)}
                      className="file:bg-blue-50 file:border-0 file:rounded-md file:px-2 file:py-1"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported: Images (.jpg, .png), Docs (.pdf, .docx), Sheets
                      (.xlsx), PPTs (.pptx)
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer with Actions */}
              <SheetFooter className="mt-6 pt-4 border-t mr-6">
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingFile(false);
                      setNewFile({
                        title: "",
                        control_num: "",
                        complainant: "",
                        assisted_by: "",
                        accompanied_by: "",
                        witnesses: "",
                        respondent: "",
                        investigator: "",
                        contact_num: "",
                        fb_account: "",
                        station_unit: "",
                        date_release: new Date().toISOString().split("T")[0],
                        signatories: "",
                        incident_summary: "",
                      });
                      setFileUpload(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-900 hover:bg-blue-800"
                  >
                    Save Certificate
                  </Button>
                </div>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add the PermissionDialog */}
      <PermissionDialog
        isOpen={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
        action={permissionAction}
      />
    </div>
  );
}
