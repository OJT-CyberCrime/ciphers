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
  List,
  Grid,
  SortAsc,
} from "lucide-react";
import { useState, useEffect } from "react";
// import {
//   ContextMenu,
//   ContextMenuContent,
//   ContextMenuItem,
//   ContextMenuTrigger,
// } from "@/components/ui/context-menu";
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
import SearchBar from "@/Search";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/utils/supa";
import FolderOperations from "./components/FolderOperations";
import { Skeleton } from "@/components/ui/skeleton";
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
  is_extraction: boolean;
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

export default function IncidentReport() {
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
  const [isListView, setIsListView] = useState(() => {
    const savedPreference = localStorage.getItem("viewPreference");
    return savedPreference ? JSON.parse(savedPreference) : false;
  });
  const previousPage = "/dashboard";
  const previousPageName = "Home";
  const [sortCriteria, setSortCriteria] = useState("created_at");

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
          .eq("is_blotter", false)
          .eq("is_womencase", true)
          .eq("is_extraction", false) // Only fetch non-women case folders
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
    navigate(`/wcp/${folder.folder_id}`, {
      state: { from: location.pathname, fromName: "Women and Children" },
    });
  };

  const handleViewDetails = (folder: Folder) => {
    setSelectedFolder(folder);
    setDialogContent("Folder Details");
  };

  const handleEditClick = (folder: Folder) => {
    setSelectedFolder(folder);
    setIsEditingFolder(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".context-menu")) {
        setContextMenuVisible({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleViewChange = (view: boolean) => {
    setIsListView(view);
    localStorage.setItem("viewPreference", JSON.stringify(view));
  };

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
          <span className="text-gray-900">Women & Children Case</span>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-6 ">
        <h1 className="text-2xl font-medium font-poppins text-blue-900">
          Women and Children Case
        </h1>
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
                    <td className="px-4 py-2 border-b">
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
                        <div className="absolute bg-white border border-gray-200 rounded-lg shadow-lg z-10 context-menu">
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
                              setSelectedFolder(folder);
                              setDialogContent(
                                "Are you sure you want to archive this folder?"
                              );
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
                  <div className="absolute top-10 right-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 context-menu">
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
                        setSelectedFolder(folder);
                        setDialogContent(
                          "Are you sure you want to archive this folder?"
                        );
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

      <FolderOperations
        isAddingFolder={isAddingFolder}
        setIsAddingFolder={setIsAddingFolder}
        isEditingFolder={isEditingFolder}
        setIsEditingFolder={setIsEditingFolder}
        selectedFolder={selectedFolder}
        setSelectedFolder={setSelectedFolder}
        dialogContent={dialogContent}
        setDialogContent={setDialogContent}
        folders={folders}
        setFolders={setFolders}
        availableCategories={availableCategories}
      />
    </div>
  );
}
