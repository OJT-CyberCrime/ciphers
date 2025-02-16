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
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import SearchBar from "@/Search";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/utils/supa";
import FolderOperations from "./components/FolderOperations";
import { Skeleton } from "@/components/ui/skeleton";

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
  categories: Category[];
}

// Function to determine badge color based on status
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-200 text-yellow-800'; // Lighter for pending status
    case 'resolved':
      return 'bg-green-200 text-green-800'; // Lighter for resolved status
    case 'dismissed':
      return 'bg-red-200 text-red-800'; // Lighter for dismissed status
    case 'under investigation':
      return 'bg-blue-200 text-blue-800'; // Lighter for under investigation status
    default:
      return 'bg-gray-200 text-black'; // Default case
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
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [contextMenuVisible, setContextMenuVisible] = useState<{ [key: number]: boolean }>({});

  // Fetch folders with their categories from Supabase
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        // First fetch folders with user information
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select(`
            *,
            creator:created_by(name),
            updater:updated_by(name)
          `)
          .eq('is_archived', false)
          .eq('is_blotter', false)
          .order('created_at', { ascending: false });

        if (foldersError) throw foldersError;

        // For each folder, fetch its categories
        const foldersWithCategories = await Promise.all(
          (foldersData || []).map(async (folder) => {
            const { data: categoriesData, error: categoriesError } = await supabase
              .from('folder_categories')
              .select(`
                categories (
                  category_id,
                  title,
                  created_by,
                  created_at
                )
              `)
              .eq('folder_id', folder.folder_id);

            if (categoriesError) throw categoriesError;

            return {
              ...folder,
              created_by: folder.creator?.name || folder.created_by,
              updated_by: folder.updater?.name || folder.updated_by,
              categories: categoriesData?.map(item => item.categories) || []
            };
          })
        );

        setFolders(foldersWithCategories);
      } catch (error) {
        console.error('Error fetching folders:', error);
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
        .from('categories')
        .select('*')
        .order('title', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      setAvailableCategories(data || []);
    };

    fetchCategories();
  }, []);

  // Filter folders based on search query and category
  const filteredFolders = folders.filter(folder => {
    const matchesSearch = folder.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filter === "all" || folder.categories.some(cat => cat.category_id.toString() === filter);
    return matchesSearch && matchesCategory;
  });

  const previousPage = location.state?.from || "/dashboard";
  const previousPageName = location.state?.fromName || "Home";

  const handleViewDetails = (folder: Folder) => {
    setSelectedFolder(folder);
    setDialogContent("Folder Details");
  };

  const handleEditClick = (folder: Folder) => {
    setSelectedFolder(folder);
    setIsEditingFolder(true);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search reports..."
        />

        <Select onValueChange={setFilter} defaultValue="all">
          <SelectTrigger className="w-48 p-5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
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

        <Button
          onClick={() => setIsAddingFolder(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
        >
          <Plus size={16} /> Add Folder
        </Button>
      </div>

      <Breadcrumb className="mb-4 text-gray-600 flex space-x-2">
        <BreadcrumbItem>
          <BreadcrumbLink href={previousPage}>{previousPageName}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="flex items-center">
          <ChevronRight size={16} />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Incident Reports</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <h1 className="text-2xl font-medium font-poppins mb-6 text-blue-900">
        Incident Reports
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : filteredFolders.length > 0 ? (
          filteredFolders.map((folder) => (
            <div key={folder.folder_id} className="relative">
              <Button
                className="flex flex-col items-start bg-white border border-gray-300 rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-gray-100 w-full min-h-[120px]"
                onClick={() => navigate(`/folder/${folder.folder_id}`, { 
                  state: { 
                    from: '/incident-reports', 
                    fromName: 'Incident Reports' 
                  } 
                })}
              >
                <div className="flex items-center gap-x-3 w-full">
                  <FolderClosed
                    style={{ width: "40px", height: "40px" }}
                    className="text-gray-600"
                    fill="#4b5563"
                  />
                  <span className="font-poppins font-medium text-lg text-gray-900 text-left">
                    {folder.title}
                  </span>
                  <Badge variant="outline" className={getStatusBadgeClass(folder.status)}>
                    {folder.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {folder.categories.length > 0 ? (
                    folder.categories.slice(0, 3).map((category) => (
                      <Badge key={category.category_id} variant="outline" className="bg-gray-200 text-black">
                        {category.title}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="bg-gray-100">
                      No categories
                    </Badge>
                  )}
                  {folder.categories.length > 3 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="bg-gray-300 cursor-pointer">
                            +{folder.categories.length - 3}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {folder.categories.slice(3).map(cat => cat.title).join(", ")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </Button>

              {/* Kebab button with standing icon */}
              <button
                className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-200"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent click from triggering the folder button
                  setContextMenuVisible(prev => ({ ...prev, [folder.folder_id]: !prev[folder.folder_id] }));
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Context menu for the kebab button */}
              {contextMenuVisible[folder.folder_id] && (
                <div className="absolute top-10 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <button
                    className="block w-full text-left p-2 hover:bg-gray-100"
                    onClick={() => {
                      handleEditClick(folder);
                      setContextMenuVisible(prev => ({ ...prev, [folder.folder_id]: false }));
                    }}
                  >
                    <Pencil className="inline w-4 h-4 mr-2" /> Edit
                  </button>
                  <button
                    className="block w-full text-left p-2 hover:bg-gray-100"
                    onClick={() => {
                      setSelectedFolder(folder);
                      setDialogContent("Are you sure you want to archive this folder?");
                      setContextMenuVisible(prev => ({ ...prev, [folder.folder_id]: false }));
                    }}
                  >
                    <Archive className="inline w-4 h-4 mr-2" /> Archive
                  </button>
                  <button
                    className="block w-full text-left p-2 hover:bg-gray-100"
                    onClick={() => {
                      handleViewDetails(folder);
                      setContextMenuVisible(prev => ({ ...prev, [folder.folder_id]: false }));
                    }}
                  >
                    <Eye className="inline w-4 h-4 mr-2" /> View Details
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div>No folders found</div>
        )}
      </div>

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