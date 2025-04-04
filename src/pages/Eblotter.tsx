import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderClosed,
  Pencil,
  Eye,
  Archive,
  Plus,
  ChevronRight,
  MoreVertical,
  SortAsc,
  Grid,
  List,
  ClockIcon,
  RefreshCwIcon,
  Info,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import SearchBar from "@/Search";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/utils/supa";
import { Skeleton } from "@/components/ui/skeleton";
import Cookies from "js-cookie";
import { toast } from "sonner";
import PermissionDialog from "@/components/PermissionDialog";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface Category {
  category_id: number;
  title: string;
  created_by: string;
  created_at: string;
}

interface Folder {
  folder_id: number;
  title: string;
  status: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_blotter: boolean;
  is_womencase: boolean;
  categories: Category[];
}

// Function to determine badge color based on status
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "pending":
      return { class: "bg-yellow-200 text-yellow-800", label: "P" }; // Lighter for pending status
    case "resolved":
      return { class: "bg-green-200 text-green-800", label: "R" }; // Lighter for resolved status
    case "dismissed":
      return { class: "bg-red-200 text-red-800", label: "D" }; // Lighter for dismissed status
    case "under investigation":
      return { class: "bg-blue-200 text-blue-800", label: "UI" }; // Lighter for under investigation status
    default:
      return { class: "bg-gray-200 text-black", label: "N/A" }; // Default case
  }
};

export default function Eblotter() {
  const [dialogContent, setDialogContent] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>(
    []
  );
  const [contextMenuVisible, setContextMenuVisible] = useState<{
    [key: number]: boolean;
  }>({});
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newFolderStatus, setNewFolderStatus] = useState("pending");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [categorySelectKey, setCategorySelectKey] = useState(0);
  const [editFolderTitle, setEditFolderTitle] = useState("");
  const [editFolderStatus, setEditFolderStatus] = useState("");
  const [editSelectedCategories, setEditSelectedCategories] = useState<
    string[]
  >([]);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionAction, setPermissionAction] = useState("");
  const [isStatusMeaningDialogOpen, setIsStatusMeaningDialogOpen] =
    useState(false);

  const userRole = JSON.parse(Cookies.get("user_data") || "{}").role;

  const canEditOrArchive = () => {
    return (
      userRole === "admin" || userRole === "superadmin" || userRole === "wcpd"
    );
  };

  const [sortCriteria, setSortCriteria] = useState("created_at");

  const statusOptions = [
    "pending",
    "resolved",
    "dismissed",
    "under investigation",
  ];

  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenuVisible({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch folders with their categories from Supabase
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        // First fetch folders with user information
        const { data: foldersData, error: foldersError } = await supabase
          .from("folders")
          .select(
            `
            *,
            creator:created_by(name),
            updater:updated_by(name)
          `
          )
          .eq("is_archived", false)
          .eq("is_blotter", true)
          .eq("is_womencase", false) // Only fetch non-women case folders
          .order("created_at", { ascending: false });

        if (foldersError) throw foldersError;

        // For each folder, fetch its categories
        const foldersWithCategories = await Promise.all(
          (foldersData || []).map(async (folder) => {
            const { data: categoriesData, error: categoriesError } =
              await supabase
                .from("folder_categories")
                .select(
                  `
                categories (
                  category_id,
                  title,
                  created_by,
                  created_at
                )
              `
                )
                .eq("folder_id", folder.folder_id);

            if (categoriesError) throw categoriesError;

            return {
              ...folder,
              created_by: folder.creator?.name || folder.created_by,
              updated_by: folder.updater?.name || folder.updated_by,
              categories: categoriesData?.map((item) => item.categories) || [],
            };
          })
        );

        setFolders(foldersWithCategories);
      } catch (error) {
        console.error("Error fetching folders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFolders();
  }, []);

  // Fetch categories from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("title", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }

      setAvailableCategories(data || []);
    };

    fetchCategories();
  }, []);

  // Filter folders based on search query and category
  const filteredFolders = folders.filter((folder) => {
    const matchesSearch = folder.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      filter === "all" ||
      folder.categories.some((cat) => cat.category_id.toString() === filter);
    return matchesSearch && matchesCategory;
  });

  const previousPage = location.state?.from || "/dashboard";
  const previousPageName = location.state?.fromName || "Home";

  const handleViewDetails = (folder: Folder) => {
    setSelectedFolder(folder);
    setDialogContent("Folder Details");
  };

  const handleEditClick = (folder: Folder) => {
    if (!canEditOrArchive()) {
      setPermissionAction("edit this folder");
      setShowPermissionDialog(true);
      return;
    }
    setSelectedFolder(folder);
    setIsEditingFolder(true);
  };

  const handleArchiveClick = (folder: Folder) => {
    if (!canEditOrArchive()) {
      setPermissionAction("archive this folder");
      setShowPermissionDialog(true);
      return;
    }
    setSelectedFolder(folder);
    setDialogContent("Are you sure you want to archive this folder?");
  };

  // Add new folder
  const handleAddFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

      // Create the folder first
      const { data: folderData, error: folderError } = await supabase
        .from("folders")
        .insert([
          {
            title: newFolderTitle,
            status: newFolderStatus,
            created_by: userData2.user_id,
            updated_by: null,
            updated_at: null,
            is_archived: false,
            is_blotter: true,
            is_womencase: false,
            is_extraction: false,
          },
        ])
        .select(
          `
          *,
          creator:created_by(name),
          updater:updated_by(name),
          categories:folder_categories(
            categories(
              category_id,
              title,
              created_by,
              created_at
            )
          )
        `
        )
        .single();

      if (folderError) throw folderError;
      if (!folderData) throw new Error("Failed to create folder");

      // Add categories to folder_categories if any categories were selected
      if (selectedCategories.length > 0) {
        const folderCategoriesData = selectedCategories.map((categoryId) => ({
          folder_id: folderData.folder_id,
          category_id: parseInt(categoryId),
        }));

        const { error: categoriesError } = await supabase
          .from("folder_categories")
          .insert(folderCategoriesData);

        if (categoriesError) throw categoriesError;
      }

      // Fetch the complete folder data with categories for the UI update
      const { data: newFolderWithCategories, error: fetchError } =
        await supabase
          .from("folders")
          .select(
            `
          *,
          creator:created_by(name),
          updater:updated_by(name),
          categories:folder_categories(
            categories(
              category_id,
              title,
              created_by,
              created_at
            )
          )
        `
          )
          .eq("folder_id", folderData.folder_id)
          .single();

      if (fetchError) throw fetchError;

      // Format the categories data for the UI
      const formattedFolder = {
        ...newFolderWithCategories,
        created_by:
          newFolderWithCategories.creator?.name ||
          newFolderWithCategories.created_by,
        updated_by:
          newFolderWithCategories.updater?.name ||
          newFolderWithCategories.updated_by,
        categories: newFolderWithCategories.categories
          .map((item: any) => item.categories)
          .filter(Boolean),
      };

      // Update the UI with the new folder
      setFolders([formattedFolder, ...folders]);
      toast.success("Folder created successfully");
      setIsAddingFolder(false);
      setNewFolderTitle("");
      setNewFolderStatus("pending");
      setSelectedCategories([]);
    } catch (error: any) {
      console.error("Error adding folder:", error);
      toast.error(error.message || "Failed to create folder");
    }
  };

  // Handle new category creation
  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

      // Create the new category
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .insert([
          {
            title: newCategoryTitle,
            created_by: userData2.user_id,
          },
        ])
        .select()
        .single();

      if (categoryError) throw categoryError;

      // Add the new category to the selected categories
      if (categoryData) {
        setSelectedCategories([
          ...selectedCategories,
          categoryData.category_id.toString(),
        ]);
        // Update available categories
        setAvailableCategories([...availableCategories, categoryData]);
        // Reset the select component
        setCategorySelectKey((prev) => prev + 1);
      }

      toast.success("Category created successfully");
      setIsAddingCategory(false);
      setNewCategoryTitle("");
    } catch (error: any) {
      console.error("Error adding category:", error);
      toast.error(error.message || "Failed to create category");
    }
  };

  // Handle folder editing
  const handleEditFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFolder) return;

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

      // Update the folder
      const { error: folderError } = await supabase
        .from("folders")
        .update({
          title: editFolderTitle,
          status: editFolderStatus,
          updated_by: userData2.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq("folder_id", selectedFolder.folder_id);

      if (folderError) throw folderError;

      // Delete existing category associations
      const { error: deleteError } = await supabase
        .from("folder_categories")
        .delete()
        .eq("folder_id", selectedFolder.folder_id);

      if (deleteError) throw deleteError;

      // Add new category associations
      if (editSelectedCategories.length > 0) {
        const folderCategoriesData = editSelectedCategories.map(
          (categoryId) => ({
            folder_id: selectedFolder.folder_id,
            category_id: parseInt(categoryId),
          })
        );

        const { error: categoriesError } = await supabase
          .from("folder_categories")
          .insert(folderCategoriesData);

        if (categoriesError) throw categoriesError;
      }

      // Fetch the updated folder data
      const { data: updatedFolder, error: fetchError } = await supabase
        .from("folders")
        .select(
          `
          *,
          creator:created_by(name),
          updater:updated_by(name),
          categories:folder_categories(
            categories(
              category_id,
              title,
              created_by,
              created_at
            )
          )
        `
        )
        .eq("folder_id", selectedFolder.folder_id)
        .single();

      if (fetchError) throw fetchError;

      // Format the updated folder data
      const formattedFolder = {
        ...updatedFolder,
        created_by: updatedFolder.creator?.name || updatedFolder.created_by,
        updated_by: updatedFolder.updater?.name || updatedFolder.updated_by,
        categories: updatedFolder.categories
          .map((item: any) => item.categories)
          .filter(Boolean),
      };

      // Update the folders state
      setFolders(
        folders.map((folder) =>
          folder.folder_id === selectedFolder.folder_id
            ? formattedFolder
            : folder
        )
      );

      toast.success("Folder updated successfully");
      setIsEditingFolder(false);
      setSelectedFolder(null);
    } catch (error: any) {
      console.error("Error updating folder:", error);
      toast.error(error.message || "Failed to update folder");
    }
  };

  // Handle folder archiving
  const handleArchiveFolder = async () => {
    if (!selectedFolder) return;

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

      // Update the folder to archived status
      const { error: archiveError } = await supabase
        .from("folders")
        .update({
          is_archived: true,
          updated_by: userData2.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq("folder_id", selectedFolder.folder_id);

      if (archiveError) throw archiveError;

      // Remove the folder from the UI
      setFolders(
        folders.filter(
          (folder) => folder.folder_id !== selectedFolder.folder_id
        )
      );
      toast.success("Folder archived successfully");
      setDialogContent(null);
      setSelectedFolder(null);
    } catch (error: any) {
      console.error("Error archiving folder:", error);
      toast.error(error.message || "Failed to archive folder");
    }
  };

  // Initialize edit form when a folder is selected for editing
  useEffect(() => {
    if (selectedFolder && isEditingFolder) {
      setEditFolderTitle(selectedFolder.title);
      setEditFolderStatus(selectedFolder.status);
      setEditSelectedCategories(
        selectedFolder.categories.map((cat) => cat.category_id.toString())
      );
    }
  }, [selectedFolder, isEditingFolder]);
  const [isListView, setIsListView] = useState(() => {
    const savedPreference = localStorage.getItem("viewPreference");
    return savedPreference ? JSON.parse(savedPreference) : false;
  });

  const sortedFolders = [...filteredFolders].sort((a, b) => {
    switch (sortCriteria) {
      case "title":
        return a.title.localeCompare(b.title);
      case "status":
        return a.status.localeCompare(b.status);
      case "created_at":
      default:
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  });

  const handleFolderClick = (folder: Folder) => {
    navigate(`/eblotter/${folder.folder_id}`, {
      state: { from: location.pathname, fromName: "Blotter Report" },
    });
  };

  const handleViewChange = (view: boolean) => {
    setIsListView(view);
    localStorage.setItem("viewPreference", JSON.stringify(view));
  };

  // Add this function to handle the dialog content for status meanings
  const renderStatusMeaningDialog = () => (
    <Dialog
      open={isStatusMeaningDialogOpen}
      onOpenChange={() => setIsStatusMeaningDialogOpen(false)}
    >
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Status Badge Meanings
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-yellow-200 text-yellow-800"
              >
                P
              </Badge>
              <span className="text-gray-700">
                Pending - The folder is currently being processed.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-200 text-green-800">
                R
              </Badge>
              <span className="text-gray-700">
                Resolved - The folder has been processed successfully.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-200 text-red-800">
                D
              </Badge>
              <span className="text-gray-700">
                Dismissed - The folder has been dismissed and will not be
                processed.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-200 text-blue-800">
                UI
              </Badge>
              <span className="text-gray-700">
                Under Investigation - The folder is currently under
                investigation.
              </span>
            </li>
          </ul>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search reports..."
        />

        <Select onValueChange={setFilter} defaultValue="all">
          <SelectTrigger className="w-full md:w-48 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {availableCategories.map((category) => (
              <SelectItem
                key={category.category_id}
                value={category.category_id.toString()}
              >
                {category.title}
              </SelectItem>
            ))}
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
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => setIsAddingFolder(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800 transition-colors"
        >
          <Plus size={16} /> Add Folder
        </Button>
      </div>

      <Breadcrumb className="mb-4 text-gray-600 flex space-x-2">
        <BreadcrumbItem>
          <Link
            to={previousPage}
            state={{ from: location.pathname }}
            className="text-gray-600 hover:text-gray-900"
          >
            {previousPageName}
          </Link>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="flex items-center">
          <ChevronRight size={16} />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <span className="text-gray-900">Blotter Reports</span>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-medium font-poppins text-blue-900">
            Blotter Reports
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 p-1"
            onClick={() => setIsStatusMeaningDialogOpen(true)}
          >
            <Info className="w-4 h-4 text-gray-600" />
          </Button>
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

      {isListView ? (
        <div className="overflow-x-auto font-poppins">
          <table className="min-w-full bg-gray-50">
            <thead>
              <tr>
                <th className="font-semibold text-md px-4 py-2 border-b text-left">
                  Name
                </th>
                <th className="font-semibold text-md px-4 py-2 border-b text-left">
                  Status
                </th>
                <th className="font-semibold text-md px-4 py-2 border-b text-left">
                  Categories
                </th>
                <th className="font-semibold text-md  px-4 py-2 border-b text-left">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 border-b">
                      <Skeleton className="h-4 w-1/2" />
                    </td>
                    <td className="px-4 py-2 border-b">
                      <Skeleton className="h-4 w-1/4" />
                    </td>
                    <td className="px-4 py-2 border-b">
                      <Skeleton className="h-4 w-1/4" />
                    </td>
                    <td className="px-4 py-2 border-b">
                      <Skeleton className="h-4 w-1/4" />
                    </td>
                  </tr>
                ))
              ) : sortedFolders.length > 0 ? (
                sortedFolders.map((folder) => (
                  <tr
                    key={folder.folder_id}
                    className="hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <td
                      className="px-4 py-2 border-b"
                      onClick={() => handleFolderClick(folder)}
                    >
                      <FolderClosed
                        style={{
                          width: "20px",
                          height: "20px",
                          display: "inline-block",
                        }} // Make the icon inline
                        className="text-gray-600 mr-2"
                        fill="#4b5563"
                      />
                      <span>{folder.title}</span>{" "}
                      {/* Add a span to ensure proper text rendering */}
                    </td>

                    <td className="px-4 py-2 border-b">
                      <Badge
                        variant="outline"
                        className={`rounded-full text-xs font-poppins px-3 py-1 ${
                          getStatusBadgeClass(folder.status).class
                        }`}
                      >
                        {getStatusBadgeClass(folder.status).label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 border-b">
                      {folder.categories && folder.categories.length > 0 ? (
                        folder.categories.slice(0, 3).map((category) => (
                          <Badge
                            key={category.category_id}
                            variant="outline"
                            className="bg-gray-200 text-black mr-2 font-medium"
                          >
                            {category.title}
                          </Badge>
                        ))
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-gray-200 text-black"
                        >
                          No categories
                        </Badge>
                      )}
                      {folder.categories.length > 3 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant="outline"
                                className="bg-gray-200 cursor-pointer"
                              >
                                +{folder.categories.length - 3}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {folder.categories
                                .slice(3)
                                .map((cat) => cat.title)
                                .join(", ")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </td>
                    <td className="px-4 py-2 border-b ">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenuVisible((prev) => ({
                            ...prev,
                            [folder.folder_id]: !prev[folder.folder_id],
                          }));
                        }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      {contextMenuVisible[folder.folder_id] && (
                        <div
                          ref={contextMenuRef}
                          className="absolute bg-white border border-gray-200 rounded-lg shadow-lg z-10 context-menu"
                        >
                          <Button
                            variant="ghost"
                            className="block w-full text-left p-2 hover:bg-gray-100 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditClick(folder);
                              setContextMenuVisible((prev) => ({
                                ...prev,
                                [folder.folder_id]: false,
                              }));
                            }}
                          >
                            <Pencil className="inline w-4 h-4 mr-2" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            className="block w-full text-left p-2 hover:bg-gray-100 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleArchiveClick(folder);
                              setContextMenuVisible((prev) => ({
                                ...prev,
                                [folder.folder_id]: false,
                              }));
                            }}
                          >
                            <Archive className="inline w-4 h-4 mr-2" /> Archive
                          </Button>
                          <Button
                            variant="ghost"
                            className="block w-full text-left p-2 hover:bg-gray-100 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleViewDetails(folder);
                              setContextMenuVisible((prev) => ({
                                ...prev,
                                [folder.folder_id]: false,
                              }));
                            }}
                          >
                            <Eye className="inline w-4 h-4 mr-2" /> View Details
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8 font-poppins">
                  <DotLottieReact
                    src="/assets/NoFiles.lottie"
                    loop
                    autoplay
                    className="w-6/12"
                  />
                  No files found in this folder
                </div>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-lg" />
            ))
          ) : sortedFolders.length > 0 ? (
            sortedFolders.map((folder) => (
              <div
                key={folder.folder_id}
                className="relative bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-500 cursor-pointer transition-all duration-200 aspect-w-1 aspect-h-1"
                onClick={(e) => {
                  if (!e.defaultPrevented) {
                    handleFolderClick(folder);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-x-3 w-full text-lg">
                  <FolderClosed
                    style={{ width: "40px", height: "40px" }}
                    className="text-gray-600"
                    fill="#4b5563"
                  />
                  <span className="flex-1 font-poppins font-medium text-gray-900 text-left overflow-hidden whitespace-nowrap text-ellipsis pr-4">
                    {folder.title}
                  </span>
                  <Badge
                    variant="outline"
                    className={`rounded-full mr-5 text-xs font-poppins ${
                      getStatusBadgeClass(folder.status).class
                    }`}
                  >
                    {getStatusBadgeClass(folder.status).label}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 overflow-hidden">
                  {folder.categories && folder.categories.length > 0 ? (
                    folder.categories.slice(0, 3).map((category) => (
                      <Badge
                        key={category.category_id}
                        variant="outline"
                        className="bg-gray-200 text-black"
                      >
                        {category.title}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="bg-gray-200 text-black">
                      No categories
                    </Badge>
                  )}
                  {folder.categories.length > 3 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge
                            variant="outline"
                            className="bg-gray-200 cursor-pointer"
                          >
                            +{folder.categories.length - 3}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {folder.categories
                            .slice(3)
                            .map((cat) => cat.title)
                            .join(", ")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {/* Kebab menu button */}
                <div className="absolute top-4 right-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenuVisible((prev) => ({
                        ...prev,
                        [folder.folder_id]: !prev[folder.folder_id],
                      }));
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                {/* Context menu */}
                {contextMenuVisible[folder.folder_id] && (
                  <div
                    ref={contextMenuRef}
                    className="absolute top-10 right-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 context-menu"
                  >
                    <Button
                      variant="ghost"
                      className="block w-full text-left p-2 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditClick(folder);
                        setContextMenuVisible((prev) => ({
                          ...prev,
                          [folder.folder_id]: false,
                        }));
                      }}
                    >
                      <Pencil className="inline w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="block w-full text-left p-2 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleArchiveClick(folder);
                        setContextMenuVisible((prev) => ({
                          ...prev,
                          [folder.folder_id]: false,
                        }));
                      }}
                    >
                      <Archive className="inline w-4 h-4 mr-2" /> Archive
                    </Button>
                    <Button
                      variant="ghost"
                      className="block w-full text-left p-2 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleViewDetails(folder);
                        setContextMenuVisible((prev) => ({
                          ...prev,
                          [folder.folder_id]: false,
                        }));
                      }}
                    >
                      <Eye className="inline w-4 h-4 mr-2" /> View Details
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            // Fix: Ensuring Lottie is centered by spanning all columns
            <div className="col-span-full flex flex-col items-center justify-center h-[50vh] text-gray-500 font-poppins">
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
      )}

      {/* Add Folder Dialog */}
      <Dialog open={isAddingFolder} onOpenChange={setIsAddingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter the details for your new folder.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFolder}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Folder Title</Label>
                <Input
                  id="title"
                  placeholder="Enter folder title"
                  value={newFolderTitle}
                  onChange={(e) => setNewFolderTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="flex gap-2">
                  <Select
                    key={categorySelectKey}
                    onValueChange={(value) => {
                      if (value === "new") {
                        setIsAddingCategory(true);
                      } else if (!selectedCategories.includes(value)) {
                        setSelectedCategories([...selectedCategories, value]);
                        // Reset the select component
                        setCategorySelectKey((prev) => prev + 1);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new" className="text-blue-600">
                        <div className="flex items-center gap-2">
                          <Plus size={16} />
                          Create new category
                        </div>
                      </SelectItem>
                      {availableCategories.map((category) => (
                        <SelectItem
                          key={category.category_id}
                          value={category.category_id.toString()}
                        >
                          {category.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCategories.map((categoryId) => {
                    const category = availableCategories.find(
                      (c) => c.category_id.toString() === categoryId
                    );
                    return category ? (
                      <Badge
                        key={categoryId}
                        variant="outline"
                        className="bg-blue-100 text-blue-800"
                      >
                        {category.title}
                        <button
                          type="button"
                          className="ml-2 hover:text-red-600"
                          onClick={() =>
                            setSelectedCategories(
                              selectedCategories.filter(
                                (id) => id !== categoryId
                              )
                            )
                          }
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newFolderStatus}
                  onValueChange={setNewFolderStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        className="capitalize"
                      >
                        {status
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingFolder(false);
                  setNewFolderTitle("");
                  setNewFolderStatus("pending");
                  setSelectedCategories([]);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Create Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Enter the title for your new category.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-title">Category Title</Label>
                <Input
                  id="category-title"
                  placeholder="Enter category title"
                  value={newCategoryTitle}
                  onChange={(e) => setNewCategoryTitle(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingCategory(false);
                  setNewCategoryTitle("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Create Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={isEditingFolder} onOpenChange={setIsEditingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>
              Make changes to your folder here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditFolder}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Folder Title</Label>
                <Input
                  id="edit-title"
                  placeholder="Enter folder title"
                  value={editFolderTitle}
                  onChange={(e) => setEditFolderTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categories</Label>
                <Select
                  key={categorySelectKey}
                  onValueChange={(value) => {
                    if (!editSelectedCategories.includes(value)) {
                      setEditSelectedCategories([
                        ...editSelectedCategories,
                        value,
                      ]);
                      // Reset the select component
                      setCategorySelectKey((prev) => prev + 1);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category) => (
                      <SelectItem
                        key={category.category_id}
                        value={category.category_id.toString()}
                      >
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editSelectedCategories.map((categoryId) => {
                    const category = availableCategories.find(
                      (c) => c.category_id.toString() === categoryId
                    );
                    return category ? (
                      <Badge
                        key={categoryId}
                        variant="outline"
                        className="bg-blue-100 text-blue-800"
                      >
                        {category.title}
                        <button
                          type="button"
                          className="ml-2 hover:text-red-600"
                          onClick={() =>
                            setEditSelectedCategories(
                              editSelectedCategories.filter(
                                (id) => id !== categoryId
                              )
                            )
                          }
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editFolderStatus}
                  onValueChange={setEditFolderStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        className="capitalize"
                      >
                        {status
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditingFolder(false);
                  setSelectedFolder(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      {/* <Dialog open={dialogContent?.includes("archive")} onOpenChange={() => setDialogContent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this folder? This will move it to the archives section.
            </DialogDescription>
          </DialogHeader>
            <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogContent(null);
                setSelectedFolder(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleArchiveFolder}
            >
              Archive
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog> */}

      {/* View Details Dialog */}
      {/* <Dialog open={dialogContent === "Folder Details"} onOpenChange={() => setDialogContent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folder Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-500">Title</Label>
              <p className="text-lg font-medium">{selectedFolder?.title}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Status</Label>
              <div className="mt-1">
                <Badge 
                  variant="outline" 
                  className={selectedFolder ? getStatusBadgeClass(selectedFolder.status).class : ''}
                >
                  {selectedFolder?.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Categories</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedFolder?.categories.map((category) => (
                  <Badge key={category.category_id} variant="outline" className="bg-gray-200">
                    {category.title}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Folder Activity</Label>
              <div className="space-y-2 mt-1">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-600">
                    Created: <span>
                      {new Date(selectedFolder?.created_at || '').toLocaleString()} by{" "}
                      <span className="text-blue-900">{selectedFolder?.created_by}</span>
                    </span>
                  </p>
                </div>
                {selectedFolder?.updated_by && (
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-600">
                      Last updated: {selectedFolder.updated_at ? (
                        <span>
                          {new Date(selectedFolder.updated_at).toLocaleString()} by{" "}
                          <span className="text-blue-900">{selectedFolder.updated_by}</span>
                        </span>
                      ) : 'Never'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="bg-blue-900 hover:bg-blue-800"
              onClick={() => {
                setDialogContent(null);
                setSelectedFolder(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      {dialogContent && (
        <Dialog
          open={dialogContent !== null}
          onOpenChange={() => {
            setDialogContent(null);
            setSelectedFolder(null);
          }}
        >
          <DialogContent className="p-6 font-poppins">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-gray-900">
                {dialogContent}
              </DialogTitle>
            </DialogHeader>

            {dialogContent === "Folder Details" && selectedFolder ? (
              <div className="space-y-6">
                {/* Folder Info Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Folder Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <h5 className="text-sm font-medium text-gray-600">
                        Folder Title
                      </h5>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedFolder.title}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-600">
                        Status
                      </h5>
                      <Badge
                        variant="outline"
                        className={`${
                          getStatusBadgeClass(selectedFolder.status).class
                        } py-1 px-2`}
                      >
                        {selectedFolder.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Categories Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedFolder.categories.map((category) => (
                      <Badge
                        key={category.category_id}
                        variant="outline"
                        className="bg-gray-200 py-1 px-3"
                      >
                        {category.title}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Folder Activity Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Folder Activity
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-gray-600" />
                      <p className="text-sm text-gray-600">
                        Created:{" "}
                        <span className="text-gray-900">
                          {new Date(selectedFolder.created_at).toLocaleString()}
                        </span>{" "}
                        by{" "}
                        <span className="font-semibold text-gray-900">
                          {selectedFolder.created_by}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RefreshCwIcon className="h-4 w-4 text-gray-600" />
                      <p className="text-sm text-gray-600">
                        Last updated:{" "}
                        {selectedFolder.updated_at ? (
                          <span className="text-gray-900">
                            {new Date(
                              selectedFolder.updated_at
                            ).toLocaleString()}
                          </span>
                        ) : (
                          <span className="italic text-gray-600">Never</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer with Close Button
                <DialogFooter className="flex justify-end mt-6">
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => setDialogContent(null)}
                  >
                    Close
                  </Button>
                </DialogFooter> */}
              </div>
            ) : dialogContent ===
              "Are you sure you want to archive this folder?" ? (
              <div className="space-y-6">
                <DialogDescription className="text-sm text-gray-700">
                  This action will archive the folder and remove it from the
                  active folders list. You can access it later in the Archives
                  section.
                </DialogDescription>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogContent(null);
                      setSelectedFolder(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={async () => {
                      if (selectedFolder) {
                        await handleArchiveFolder();
                      } else {
                        toast.error("No folder selected for archiving");
                      }
                    }}
                  >
                    Yes, Archive
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      )}

      {/* Permission Dialog */}
      <PermissionDialog
        isOpen={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
        action={permissionAction}
      />

      {/* Render the status meaning dialog based on the new state */}
      {renderStatusMeaningDialog()}
    </div>
  );
}
