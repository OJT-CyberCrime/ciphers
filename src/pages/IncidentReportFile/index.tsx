import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
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
  X,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  // DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Cookies from "js-cookie";
// import RichTextEditor from "@/components/RichTextEditor";
import FileOperations from "./components/FileOperations";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import PermissionDialog from "@/components/PermissionDialog";
import { Switch } from "@/components/ui/switch";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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
  is_collage?: boolean;
  collage_photos?: string[];
}

interface Folder {
  folder_id: number;
  title: string;
  status: string;
  created_by: string;
  created_at: string;
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
  full_name: string;
  age: number;
  birthday: string;
  gender: "Male" | "Female" | "Other";
  complete_address: string;
  contact_number: string;
}

// Add new interface for collage state
interface CollageState {
  files: File[];
  previewUrls: string[];
  layout: string;
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

const CollagePreview = ({
  collageState,
  onLayoutChange,
  onPhotoRemove,
}: {
  collageState: CollageState;
  onLayoutChange: (layout: string) => void;
  onPhotoRemove: (index: number) => void;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label>Layout:</Label>
        <Select value={collageState.layout} onValueChange={onLayoutChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Choose layout" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1x1">1 x 1</SelectItem>
            <SelectItem value="2x2">2 x 2</SelectItem>
            <SelectItem value="3x3">3 x 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div
        className={`grid gap-2 ${
          collageState.layout === "1x1"
            ? "grid-cols-1"
            : collageState.layout === "2x2"
            ? "grid-cols-2"
            : "grid-cols-3"
        }`}
      >
        {collageState.previewUrls.map((url, index) => (
          <div key={index} className="relative group">
            <img
              src={url}
              alt={`Collage photo ${index + 1}`}
              className="w-full h-40 object-cover rounded-md"
            />
            <button
              onClick={() => onPhotoRemove(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function IncidentReport() {
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folderDetails, setFolderDetails] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState("");
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newBlotterNumber, setNewBlotterNumber] = useState("");
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
  const [showOptions, setShowOptions] = useState<{ [key: number]: boolean }>(
    {}
  );
  const navigate = useNavigate();
  const location = useLocation();
  const previousPage = "/incident-report";
  const previousPageName = "Incident Report"; // Update to correct page name
  const [sortCriteria, setSortCriteria] = useState("created_at");
  const [reportingPerson, setReportingPerson] =
    useState<ReportingPersonDetails>({
      full_name: "",
      age: 0,
      birthday: "",
      gender: "Male",
      complete_address: "",
      contact_number: "",
      date_reported: "",
      time_reported: "",
      date_of_incident: "",
      time_of_incident: "",
      place_of_incident: "",
    });
  const [suspects, setSuspects] = useState<Suspect[]>([
    {
      full_name: "",
      age: 0,
      birthday: "",
      gender: "Male",
      complete_address: "",
      contact_number: "",
    },
  ]);
  const [isListView, setIsListView] = useState(() => {
    // Retrieve the view state from localStorage
    const savedView = localStorage.getItem("isListView");
    return savedView ? JSON.parse(savedView) : false; // Default to grid view if not set
  });
  const contextMenuRef = useRef<HTMLDivElement | null>(null); // Create a ref for the context menu
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionAction, setPermissionAction] = useState("");
  const [collageState, setCollageState] = useState<CollageState>({
    files: [],
    previewUrls: [],
    layout: "2x2", // default layout
  });
  const [isCollageMode, setIsCollageMode] = useState(false);

  const userRole = JSON.parse(Cookies.get("user_data") || "{}").role;

  const canEditOrArchive = () => {
    return (
      userRole === "admin" || userRole === "superadmin" || userRole === "wcpd"
    );
  };

  const handleEditClick = async (file: FileRecord) => {
    try {
      // Client-side check first
      if (!canEditOrArchive()) {
        setPermissionAction("edit this file");
        setShowPermissionDialog(true);
        return;
      }

      // Server-side permission validation
      const editUserData = JSON.parse(Cookies.get("user_data") || "{}");
      const { data: editUserDetails, error: editUserError } = await supabase
        .from("users")
        .select("role")
        .eq("email", editUserData.email)
        .single();

      if (editUserError) throw editUserError;
      if (!editUserDetails) throw new Error("User not found");

      if (!["admin", "superadmin", "wcpd"].includes(editUserDetails.role)) {
        toast.error("You do not have permission to perform this action");
        return;
      }

      setSelectedFile(file);
      setShowFileDialog("edit");
    } catch (error: any) {
      console.error("Error checking permissions:", error);
      toast.error("Failed to verify permissions");
    }
  };

  const handleArchiveClick = async (file: FileRecord) => {
    try {
      // Client-side check first
      if (!canEditOrArchive()) {
        setPermissionAction("archive this file");
        setShowPermissionDialog(true);
        return;
      }

      // Server-side permission validation
      const archiveUserData = JSON.parse(Cookies.get("user_data") || "{}");
      const { data: archiveUserDetails, error: archiveUserError } =
        await supabase
          .from("users")
          .select("role")
          .eq("email", archiveUserData.email)
          .single();

      if (archiveUserError) throw archiveUserError;
      if (!archiveUserDetails) throw new Error("User not found");

      if (!["admin", "superadmin", "wcpd"].includes(archiveUserDetails.role)) {
        toast.error("You do not have permission to perform this action");
        return;
      }

      setSelectedFile(file);
      setShowFileDialog("archive");
    } catch (error: any) {
      console.error("Error checking permissions:", error);
      toast.error("Failed to verify permissions");
    }
  };

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

  // Handle file upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !fileUpload?.[0]) return;

    try {
      const userData = JSON.parse(Cookies.get("user_data") || "{}");

      // Get user data and validate permissions
      const { data: userData2, error: userError } = await supabase
        .from("users")
        .select("user_id, role")
        .eq("email", userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error("User not found");

      // Server-side permission check
      if (!["admin", "superadmin", "wcpd"].includes(userData2.role)) {
        toast.error("You do not have permission to perform this action");
        return;
      }

      let publicUrl = "";
      let filePath = "";
      let collagePhotos: string[] = [];

      // Upload file to storage
      const file = fileUpload[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      filePath = `folder_${id}/${fileName}`;

      if (isCollageMode) {
        // Upload each photo in the collage
        for (const file of collageState.files) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const photoPath = `folder_${id}/collage_photos/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("files")
            .upload(photoPath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl: photoUrl },
          } = supabase.storage.from("files").getPublicUrl(photoPath);

          collagePhotos.push(photoUrl);
        }

        // Create a collage preview image using HTML Canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const [cols, rows] = collageState.layout.split("x").map(Number);
        const photoWidth = 800 / cols;
        const photoHeight = 800 / rows;

        canvas.width = 800;
        canvas.height = 800;

        // Load all images and draw them on the canvas
        const images = await Promise.all(
          collageState.previewUrls.map((url) => {
            return new Promise<HTMLImageElement>((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.src = url;
            });
          })
        );

        images.forEach((img, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          ctx?.drawImage(
            img,
            col * photoWidth,
            row * photoHeight,
            photoWidth,
            photoHeight
          );
        });

        // Convert canvas to blob and upload
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((blob) => resolve(blob!))
        );
        const collageFileName = `collage_${Math.random()}.png`;
        filePath = `folder_${id}/${collageFileName}`;

        const { error: collageUploadError } = await supabase.storage
          .from("files")
          .upload(filePath, blob, {
            cacheControl: "3600",
            upsert: false,
          });

        if (collageUploadError) throw collageUploadError;

        const {
          data: { publicUrl: collagePublicUrl },
        } = supabase.storage.from("files").getPublicUrl(filePath);

        publicUrl = collagePublicUrl;
      } else {
        // Handle single file upload
        const { error: uploadError } = await supabase.storage
          .from("files")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl: singleFileUrl },
        } = supabase.storage.from("files").getPublicUrl(filePath);

        publicUrl = singleFileUrl;
      }

      // Create file record in database
      const { data: fileData, error: fileError } = await supabase
        .from("files")
        .insert([
          {
            folder_id: id,
            title: newFileTitle,
            case_title: newCaseTitle,
            blotter_number: newBlotterNumber,
            incident_summary: newFileSummary,
            file_path: filePath,
            created_by: userData2.user_id,
            is_archived: false,
            public_url: publicUrl,
            investigator: newInvestigator,
            desk_officer: newDeskOfficer,
            is_collage: isCollageMode,
            collage_photos: isCollageMode ? collagePhotos : null,
          },
        ])
        .select()
        .single();

      if (fileError) throw fileError;

      // Only insert reporting person details if at least one field is filled
      const hasReportingPersonData = Object.values(reportingPerson).some(
        (value) => value !== "" && value !== 0
      );

      if (hasReportingPersonData) {
        // Create a cleaned version of reporting person data
        const cleanedReportingPerson = {
          file_id: fileData.file_id,
          full_name: reportingPerson.full_name || null,
          age: reportingPerson.age || null,
          gender: reportingPerson.gender || null,
          complete_address: reportingPerson.complete_address || null,
          contact_number: reportingPerson.contact_number || null,
          birthday: reportingPerson.birthday
            ? new Date(reportingPerson.birthday).toISOString()
            : null,
          date_reported: reportingPerson.date_reported
            ? new Date(reportingPerson.date_reported).toISOString()
            : null,
          time_reported: reportingPerson.time_reported || null,
          date_of_incident: reportingPerson.date_of_incident
            ? new Date(reportingPerson.date_of_incident).toISOString()
            : null,
          time_of_incident: reportingPerson.time_of_incident || null,
          place_of_incident: reportingPerson.place_of_incident || null,
        };

        const { error: reportingError } = await supabase
          .from("reporting_person_details")
          .insert([cleanedReportingPerson]);

        if (reportingError) throw reportingError;
      }

      // Update the suspects handling as well
      const suspectsWithData = suspects.filter(
        (suspect) =>
          suspect.full_name ||
          suspect.age ||
          suspect.birthday ||
          suspect.complete_address ||
          suspect.contact_number
      );

      if (suspectsWithData.length > 0) {
        const cleanedSuspects = suspectsWithData.map((suspect) => ({
          file_id: fileData.file_id,
          full_name: suspect.full_name || null,
          age: suspect.age || null,
          birthday: suspect.birthday
            ? new Date(suspect.birthday).toISOString()
            : null,
          gender: suspect.gender || null,
          complete_address: suspect.complete_address || null,
          contact_number: suspect.contact_number || null,
        }));

        const { error: insertSuspectsError } = await supabase
          .from("suspects")
          .insert(cleanedSuspects);

        if (insertSuspectsError) throw insertSuspectsError;
      }

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
        created_by: newFileWithUser.creator?.name || newFileWithUser.created_by,
        updated_by: newFileWithUser.updater?.name || newFileWithUser.updated_by,
      };

      // Update the UI with the new file
      setFiles([formattedFile, ...files]);
      toast.success("File uploaded successfully");
      setIsAddingFile(false);

      // Reset all form fields
      setNewFileTitle("");
      setNewCaseTitle("");
      setNewBlotterNumber("");
      setNewFileSummary("");
      setNewInvestigator("");
      setNewDeskOfficer("");
      setFileUpload(null);
      setReportingPerson({
        full_name: "",
        age: 0,
        birthday: "",
        gender: "Male",
        complete_address: "",
        contact_number: "",
        date_reported: "",
        time_reported: "",
        date_of_incident: "",
        time_of_incident: "",
        place_of_incident: "",
      });
      setSuspects([
        {
          full_name: "",
          age: 0,
          birthday: "",
          gender: "Male",
          complete_address: "",
          contact_number: "",
        },
      ]);

      // Reset collage state
      setIsCollageMode(false);
      setCollageState({
        files: [],
        previewUrls: [],
        layout: "2x2",
      });
    } catch (error: any) {
      console.error("Error adding file:", error);
      toast.error(error.message || "Failed to add file");
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
  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      (file.case_title?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      ) ||
      (file.incident_summary?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      );
    const fileExtension = file.file_path?.split(".").pop()?.toLowerCase() || "";

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

  // Function to handle view change
  const handleViewChange = (view: boolean) => {
    setIsListView(view);
    localStorage.setItem("isListView", JSON.stringify(view)); // Save the view state to localStorage
  };

  // Function to handle clicks outside the context menu
  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setShowOptions({}); // Close the context menu
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const formRef = useRef<HTMLFormElement | null>(null);
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
                      key={file.file_id}
                      className="hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                        setSelectedFile(file);
                        setPreviewStates((prev) => ({
                          ...prev,
                          [file.file_id]: true,
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
                          <div
                            ref={contextMenuRef}
                            className="absolute bg-white border border-gray-300 rounded-lg shadow-lg z-10 context-menu font-poppins"
                          >
                            <button
                              className="block w-full text-left p-2 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                // setSelectedFile(file);
                                // setShowFileDialog("edit");
                                handleEditClick(file);
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
                                // setSelectedFile(file);
                                // setShowFileDialog("archive");
                                handleArchiveClick(file);
                                setShowOptions((prev) => ({
                                  ...prev,
                                  [file.file_id]: false,
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
                                setShowOptions((prev) => ({
                                  ...prev,
                                  [file.file_id]: false,
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
                showPreview={previewStates[selectedFile.file_id] || false}
                setShowPreview={(show) => {
                  setPreviewStates((prev) => ({
                    ...prev,
                    [selectedFile.file_id]: show,
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
                      files.filter((f) => f.file_id !== selectedFile?.file_id)
                    );
                  } else {
                    // Refresh the files list
                    window.location.reload();
                  }
                }}
                isListView={isListView} // Pass the isListView prop
              />
            )}
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 font-poppins">
            {filteredFiles.map((file) => (
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
                      <h3 className="font-medium text-gray-900">
                        {file.title}
                      </h3>
                    </div>
                    <button
                      className="p-2 rounded-full hover:bg-gray-200"
                      onClick={() =>
                        setShowOptions((prev) => ({
                          ...prev,
                          [file.file_id]: !prev[file.file_id],
                        }))
                      }
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
                      // Remove the file from the UI if it was archived
                      if (showFileDialog === "archive") {
                        setFiles(
                          files.filter(
                            (f) => f.file_id !== selectedFile?.file_id
                          )
                        );
                      } else {
                        // Refresh the files list
                        window.location.reload();
                      }
                    }}
                    isListView={isListView} // Pass the isListView prop
                  />
                  <div className="text-sm text-gray-500 mt-2">
                    Added by {file.created_by} on{" "}
                    {new Date(file.created_at).toLocaleDateString()}
                  </div>
                </div>

                {showOptions[file.file_id] && (
                  <div className="absolute top-10 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 font-poppins">
                    <Button
                      variant="ghost"
                      className="block w-full text-left p-2 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(file);
                        setShowOptions((prev) => ({
                          ...prev,
                          [file.file_id]: false,
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
                          [file.file_id]: false,
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
                          [file.file_id]: false,
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
            <SheetTitle className="text-xl">Add New File</SheetTitle>
            <SheetDescription className="text-sm">
              Upload a file and provide its details.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto">
            <form ref={formRef} onSubmit={handleFileUpload}>
              <div className="space-y-4 py-4">
                <div className="space-y-4 p-4 mr-6 rounded-lg bg-slate-50">
                  <div className="space-y-2">
                    <Label htmlFor="title">File Name</Label>
                    <Input
                      id="title"
                      placeholder="Enter file name"
                      value={newFileTitle}
                      onChange={(e) => setNewFileTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="case_title">Case Title</Label>
                    <Input
                      id="case_title"
                      placeholder="Enter case title"
                      value={newCaseTitle}
                      onChange={(e) => setNewCaseTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blotter_number">Blotter Number</Label>
                    <Input
                      id="blotter_number"
                      placeholder="Enter blotter number"
                      value={newBlotterNumber}
                      onChange={(e) => setNewBlotterNumber(e.target.value)}
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
                    <Textarea
                      id="summary"
                      name="summary"
                      value={newFileSummary}
                      placeholder="Please provide a detailed narrative of the incident..."
                      onChange={(e) => setNewFileSummary(e.target.value)}
                      required
                      className="h-48 resize-none border-gray-300 rounded-md font-poppins"
                    />
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="file">Upload File(s)</Label>
                    <Input
                      id="file"
                      type="file"
                      multiple={isCollageMode}
                      accept={isCollageMode ? "image/*" : undefined}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files) return;

                        if (isCollageMode) {
                          const newFiles = Array.from(files);
                          const newPreviewUrls = newFiles.map((file) =>
                            URL.createObjectURL(file)
                          );

                          setCollageState((prev) => ({
                            ...prev,
                            files: [...prev.files, ...newFiles],
                            previewUrls: [
                              ...prev.previewUrls,
                              ...newPreviewUrls,
                            ],
                          }));
                        } else {
                          setFileUpload(files);
                        }
                      }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Label>Create Collage</Label>
                      <Switch
                        checked={isCollageMode}
                        onCheckedChange={setIsCollageMode}
                      />
                    </div>

                    {isCollageMode && (
                      <CollagePreview
                        collageState={collageState}
                        onLayoutChange={(layout) =>
                          setCollageState((prev) => ({ ...prev, layout }))
                        }
                        onPhotoRemove={(index) => {
                          setCollageState((prev) => ({
                            ...prev,
                            files: prev.files.filter((_, i) => i !== index),
                            previewUrls: prev.previewUrls.filter(
                              (_, i) => i !== index
                            ),
                          }));
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 p-4 rounded-lg mr-6">
                  <h3 className="text-lg font-semibold">
                    Reporting Person Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
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
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_age">Age</Label>
                      <Input
                        id="rp_age"
                        type="number"
                        min="0"
                        max="100"
                        value={reportingPerson.age}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            age: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_birthday">Birthday</Label>
                      <Input
                        id="rp_birthday"
                        type="date"
                        value={reportingPerson.birthday}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            birthday: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_gender">Gender</Label>
                      <Select
                        onValueChange={(value) =>
                          setReportingPerson({
                            ...reportingPerson,
                            gender: value as "Male" | "Female" | "Other",
                          })
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
                      <Label htmlFor="rp_address">Complete Address</Label>
                      <Textarea
                        id="rp_address"
                        value={reportingPerson.complete_address}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            complete_address: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="rp_contact">Contact Number</Label>
                      <Input
                        id="rp_contact"
                        value={reportingPerson.contact_number}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            contact_number: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="date_reported">Date Reported</Label>
                      <Input
                        id="date_reported"
                        type="date"
                        value={reportingPerson.date_reported}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            date_reported: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="time_reported">Time Reported</Label>
                      <Input
                        id="time_reported"
                        type="time"
                        value={reportingPerson.time_reported}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            time_reported: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="date_of_incident">Date of Incident</Label>
                      <Input
                        id="date_of_incident"
                        type="date"
                        value={reportingPerson.date_of_incident}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            date_of_incident: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="time_of_incident">Time of Incident</Label>
                      <Input
                        id="time_of_incident"
                        type="time"
                        value={reportingPerson.time_of_incident}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            time_of_incident: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="place_of_incident">
                        Place of Incident
                      </Label>
                      <Textarea
                        id="place_of_incident"
                        value={reportingPerson.place_of_incident}
                        onChange={(e) =>
                          setReportingPerson({
                            ...reportingPerson,
                            place_of_incident: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 p-4 mr-6 rounded-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Suspects</h3>
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
                    <div
                      key={index}
                      className="space-y-4 p-4 border rounded-lg"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Suspect {index + 1}</h4>
                        {suspects.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeSuspect(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`suspect_${index}_name`}>
                            Full Name
                          </Label>
                          <Input
                            id={`suspect_${index}_name`}
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
                            min="0"
                            max="100"
                            value={suspect.age}
                            onChange={(e) =>
                              updateSuspect(
                                index,
                                "age",
                                parseInt(e.target.value)
                              )
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
                            value={suspect.birthday}
                            onChange={(e) =>
                              updateSuspect(index, "birthday", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor={`suspect_${index}_gender`}>
                            Gender
                          </Label>
                          <Select
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
                          <Label htmlFor={`suspect_${index}_address`}>
                            Complete Address
                          </Label>
                          <Textarea
                            id={`suspect_${index}_address`}
                            value={suspect.complete_address}
                            onChange={(e) =>
                              updateSuspect(
                                index,
                                "complete_address",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor={`suspect_${index}_contact`}>
                            Contact Number
                          </Label>
                          <Input
                            id={`suspect_${index}_contact`}
                            value={suspect.contact_number}
                            onChange={(e) =>
                              updateSuspect(
                                index,
                                "contact_number",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>

          <SheetFooter className="mr-6 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddingFile(false);
                formRef.current?.reset();
              }}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (formRef.current) {
                  formRef.current.dispatchEvent(
                    new Event("submit", { bubbles: true })
                  );
                }
              }}
              className="bg-blue-900 hover:bg-blue-800"
            >
              Upload File
            </Button>
          </SheetFooter>
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
