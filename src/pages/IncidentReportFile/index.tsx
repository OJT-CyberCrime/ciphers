import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
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
  List,
  Grid,
  SortAsc,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetOverlay,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/utils/supa";
import { Badge } from "@/components/ui/badge";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Cookies from "js-cookie";
import RichTextEditor from "@/components/RichTextEditor";
import FileOperations from "./components/FileOperations";
import { Skeleton } from "@/components/ui/skeleton";

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
  status?: string;
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

export default function FolderPage() {
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folderDetails, setFolderDetails] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState("");
  const [newFileSummary, setNewFileSummary] = useState("");
  const [fileUpload, setFileUpload] = useState<FileList | null>(null);
  const [newInvestigator, setNewInvestigator] = useState("");
  const [newDeskOfficer, setNewDeskOfficer] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [showFileDialog, setShowFileDialog] = useState<
    "edit" | "archive" | "details" | null
  >(null);
  const [previewStates, setPreviewStates] = useState<{
    [key: number]: boolean;
  }>({});
  const [showOptions, setShowOptions] = useState<{ [key: number]: boolean }>({});
  // const navigate = useNavigate();
  // const location = useLocation();
  const previousPage = "/incident-report"; // Always navigate to incident report
  const previousPageName = "Incident Reports";
  const [isListView, setIsListView] = useState(() => {
    // Retrieve the view mode from local storage or default to false (grid view)
    const storedView = localStorage.getItem("viewPreference");
    return storedView ? JSON.parse(storedView) : false;
  });
  const [sortCriteria, setSortCriteria] = useState("created_at");

  // Add click outside handler for context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.context-menu') && !target.closest('.menu-trigger')) {
        setShowOptions({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id || !fileUpload?.[0]) return;

      try {
        const userData = JSON.parse(Cookies.get("user_data") || "{}");

        // Get the user's ID from the users table using their email
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

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        // Get the public URL for the uploaded file
        const {
          data: { publicUrl },
        } = supabase.storage.from("files").getPublicUrl(filePath);

        // Strip HTML tags from the incident summary
        const cleanSummary = stripHtml(newFileSummary);

        // Create file record in database
        const { data: fileData, error: fileError } = await supabase
          .from("files")
          .insert([
            {
              folder_id: id,
              title: newFileTitle,
              incident_summary: cleanSummary,
              file_path: filePath,
              created_by: userData2.user_id,
              is_archived: false,
              public_url: publicUrl,
              investigator: newInvestigator,
              desk_officer: newDeskOfficer,
              viewed_by: null,
              downloaded_by: null,
              printed_by: null,
              viewed_at: null,
              downloaded_at: null,
              printed_at: null,
            },
          ])
          .select()
          .single();

        if (fileError) throw fileError;

        // Fetch the complete file data with user information
        const { data: newFileWithUser, error: fetchError } = await supabase
          .from("files")
          .select(
            `
          *,
          creator:created_by(name),
          updater:updated_by(name)
        `
          )
          .eq("file_id", fileData.file_id)
          .single();

        if (fetchError) throw fetchError;

        // Format the file data for the UI
        const formattedFile = {
          ...newFileWithUser,
          created_by:
            newFileWithUser.creator?.name || newFileWithUser.created_by,
          updated_by:
            newFileWithUser.updater?.name || newFileWithUser.updated_by,
        };

        // Update the UI with the new file
        setFiles([formattedFile, ...files]);
        toast.success("File uploaded successfully");
        setIsAddingFile(false);
        setNewFileTitle("");
        setNewFileSummary("");
        setNewInvestigator("");
        setNewDeskOfficer("");
        setFileUpload(null);
      } catch (error: any) {
        console.error("Error uploading file:", error);
        toast.error(error.message || "Failed to upload file");
      }
    },
    [
      id,
      fileUpload,
      newFileSummary,
      newFileTitle,
      newInvestigator,
      newDeskOfficer,
      files,
    ]
  );

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

        // Fetch files in the folder
        const { data: filesData, error: filesError } = await supabase
          .from("files")
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

  // Filter files based on search query and type
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch =
        file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.incident_summary.toLowerCase().includes(searchQuery.toLowerCase());
      const fileExtension =
        file.file_path.split(".").pop()?.toLowerCase() || "";

      let matchesFilter = true;
      if (filter !== "all") {
        const documentTypes = ["pdf", "doc", "docx", "txt"];
        const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp"];

        if (filter === "document") {
          matchesFilter = documentTypes.includes(fileExtension);
        } else if (filter === "image") {
          matchesFilter = imageTypes.includes(fileExtension);
        } else if (filter === "other") {
          matchesFilter =
            !documentTypes.includes(fileExtension) &&
            !imageTypes.includes(fileExtension);
        }
      }

      return matchesSearch && matchesFilter;
    });
  }, [files, searchQuery, filter]);

  // Sort files based on the selected criteria
  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      if (sortCriteria === "created_at") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else if (sortCriteria === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [filteredFiles, sortCriteria]);

  const handleViewChange = (view: boolean) => {
    setIsListView(view);
    setShowOptions({}); // Reset context menu state
    localStorage.setItem("viewPreference", JSON.stringify(view));
  };

  const handleRowClick = useCallback((fileId: number) => {
    const file = sortedFiles.find(f => f.file_id === fileId);
    if (file) {
      setSelectedFile(file);
      setPreviewStates(prev => ({
        ...prev,
        [fileId]: true
      }));
    }
  }, [sortedFiles]);

  return (
    <div className="p-6">
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

      {/* Folder Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Skeletons for grid view */}
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center mb-2">
                  <Skeleton className="h-40 w-12 rounded-full" /> {/* Placeholder for icon */}
                  <div className="ml-3 flex-1">
                    <Skeleton className="h-4 w-full mb-1" /> 
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedFiles.length > 0 ? (
          isListView ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-50">
                <thead>
                  <tr>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">File Name</th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">Added By</th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">Date Added</th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">Folder Status</th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiles.map((file) => (
                    <tr
                      key={file.file_id}
                      className="hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(file.file_id)}
                    >
                      <td className="px-4 py-2 border-b flex items-center gap-2">
                        {getFileIcon(file.file_path)}
                        <span 
                          className="cursor-pointer hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            setSelectedFile(file);
                            setPreviewStates(prev => ({
                              ...prev,
                              [file.file_id]: true
                            }));
                          }}
                        >
                          {file.title}
                        </span>
                      </td>
                      <td className="px-4 py-2 border-b">{file.created_by}</td>
                      <td className="px-4 py-2 border-b">{new Date(file.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2 border-b">
                        <Badge variant="outline" className={`${getStatusBadgeClass(folderDetails?.status || 'N/A').class} shadow-none`}>
                          {getStatusBadgeClass(folderDetails?.status || 'N/A').label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 border-b flex space-x-2">
                        <button
                          className="p-2 rounded-full hover:bg-gray-200 menu-trigger"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            setShowOptions((prev) => ({
                              ...prev,
                              [file.file_id]: !prev[file.file_id],
                            }));
                          }}
                        >
                          <MoreVertical size={16} color="black" />
                        </button>
                        {showOptions[file.file_id] && (
                          <div className="absolute bg-white border border-gray-300 rounded-lg shadow-lg z-10 context-menu">
                            <button
                              className="block w-full text-left p-2 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setShowFileDialog('edit');
                                setShowOptions((prev) => ({
                                  ...prev,
                                  [file.file_id]: false,
                                }));
                              }}
                            >
                              <Pencil className="inline w-4 h-4 mr-2" /> Edit
                            </button>
                            <button
                              className="block w-full text-left p-2 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setShowFileDialog('archive');
                                setShowOptions((prev) => ({
                                  ...prev,
                                  [file.file_id]: false,
                                }));
                              }}
                            >
                              <Archive className="inline w-4 h-4 mr-2" /> Archive
                            </button>
                            <button
                              className="block w-full text-left p-2 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setShowFileDialog('details');
                                setShowOptions((prev) => ({
                                  ...prev,
                                  [file.file_id]: false,
                                }));
                              }}
                            >
                              <Eye className="inline w-4 h-4 mr-2" /> View Details
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <FileOperations
                file={selectedFile || sortedFiles[0]}
                showFileDialog={showFileDialog}
                setShowFileDialog={setShowFileDialog}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                showPreview={selectedFile ? previewStates[selectedFile.file_id] : false}
                setShowPreview={(show) => {
                  if (selectedFile) {
                    setPreviewStates(prev => ({
                      ...prev,
                      [selectedFile.file_id]: show
                    }));
                  }
                }}
                onFileUpdate={() => {
                  if (showFileDialog === 'archive' && selectedFile) {
                    setFiles(files.filter((f) => f.file_id !== selectedFile.file_id));
                  } else {
                    window.location.reload();
                  }
                }}
                listView={true}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 font-poppins">
              {sortedFiles.map((file) => (
                <div key={file.file_id} className="relative">
                  <div
                    className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow aspect-square"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setShowOptions((prev) => ({
                        ...prev,
                        [file.file_id]: !prev[file.file_id],
                      }));
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.file_path)}
                        <h3 className="font-medium text-gray-900">{file.title}</h3>
                      </div>
                      <button
                        className="p-2 rounded-full hover:bg-gray-200 menu-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOptions((prev) => ({
                            ...prev,
                            [file.file_id]: !prev[file.file_id],
                          }));
                        }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <FileOperations
                      file={file}
                      showPreview={previewStates[file.file_id] || false}
                      setShowPreview={(show) => {
                        setPreviewStates((prev) => ({
                          ...prev,
                          [file.file_id]: show,
                        }));
                      }}
                      showFileDialog={showFileDialog}
                      setShowFileDialog={setShowFileDialog}
                      selectedFile={selectedFile}
                      setSelectedFile={setSelectedFile}
                      onFileUpdate={() => {
                        if (showFileDialog === 'archive') {
                          setFiles(files.filter((f) => f.file_id !== selectedFile?.file_id));
                        } else {
                          window.location.reload();
                        }
                      }}
                      listView={false}
                    />
                    <div className="text-xs text-gray-500 mt-2">
                      Added by {file.created_by} on {new Date(file.created_at).toLocaleDateString()}
                    </div>
                  </div>
      
                  {showOptions[file.file_id] && (
                    <div className="absolute top-10 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 context-menu">
                      <button
                        className="block w-full text-left p-2 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(file);
                          setShowFileDialog('edit');
                          setShowOptions((prev) => ({
                            ...prev,
                            [file.file_id]: false,
                          }));
                        }}
                      >
                        <Pencil className="inline w-4 h-4 mr-2" /> Edit
                      </button>
                      <button
                        className="block w-full text-left p-2 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(file);
                          setShowFileDialog('archive');
                          setShowOptions((prev) => ({
                            ...prev,
                            [file.file_id]: false,
                          }));
                        }}
                      >
                        <Archive className="inline w-4 h-4 mr-2" /> Archive
                      </button>
                      <button
                        className="block w-full text-left p-2 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(file);
                          setShowFileDialog('details');
                          setShowOptions((prev) => ({
                            ...prev,
                            [file.file_id]: false,
                          }));
                        }}
                      >
                        <Eye className="inline w-4 h-4 mr-2" /> View Details
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center text-gray-500 py-8">
            <File className="mx-auto mb-4 text-gray-400" size={48} />
            No files found in this folder
          </div>
        )}
      </div>

      {/* Add File Dialog */}
      <Sheet open={isAddingFile} onOpenChange={setIsAddingFile}>
        <SheetContent className="max-w-4xl w-4/5 p-8 bg-white font-poppins overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">Add New File</SheetTitle>
            <SheetDescription className="text-sm">
              Upload a file and provide its details.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleFileUpload}>
            <div className="space-y-4 py-4">
              <div className="space-y-2 text-sm">
                <Label htmlFor="title">File Title</Label>
                <Input
                  id="title"
                  placeholder="Enter file title"
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investigator">Investigator</Label>
                <Input
                  id="investigator"
                  placeholder="Enter investigator name"
                  value={newInvestigator}
                  onChange={(e) => setNewInvestigator(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desk_officer">Desk Officer</Label>
                <Input
                  id="desk_officer"
                  placeholder="Enter desk officer name"
                  value={newDeskOfficer}
                  onChange={(e) => setNewDeskOfficer(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Incident Summary</Label>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  <RichTextEditor
                    content={newFileSummary}
                    onChange={setNewFileSummary}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Upload File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setFileUpload(e.target.files)}
                  required
                />
              </div>
            </div>

            <SheetFooter className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingFile(false);
                  setNewFileTitle("");
                  setNewFileSummary("");
                  setNewInvestigator("");
                  setNewDeskOfficer("");
                  setFileUpload(null);
                }}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Upload File
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
