import { Badge } from "@/components/ui/badge";
import { FolderClosed, ChevronRight, FileText, Undo } from "lucide-react";
import { useState, useEffect } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  fetchArchivedContent, 
  fetchCategories, 
  handleRestoreFile, 
  handleRestoreFolder,
  getStatusBadgeClass,
  type Folder,
  type ArchivedFile,
  type Category
} from "./components/ArchiveOperations";
import { useLocation, Link } from "react-router-dom";


export default function Archives() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [archivedFiles, setArchivedFiles] = useState<ArchivedFile[]>([]);
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<{ [key: number]: boolean }>({});
  const [restoreDialog, setRestoreDialog] = useState<{
    type: 'folder' | 'file';
    item: Folder | ArchivedFile | null;
    fromArchivedFolder?: boolean;
  } | null>(null);

  // Fetch archived content and categories
  useEffect(() => {
    const loadContent = async () => {
      try {
        const { folders: archivedFolders, files } = await fetchArchivedContent();
        setFolders(archivedFolders);
        setArchivedFiles(files);

        const categories = await fetchCategories();
        setAvailableCategories(categories);
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, []);

  // Filter folders and files based on search query and category
  const filteredFolders = folders.filter(folder => {
    const matchesSearch = folder.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filter === "all" || folder.categories.some(cat => cat.category_id.toString() === filter);
    return matchesSearch && matchesCategory;
  });

  const filteredFiles = archivedFiles.filter(file => {
    return file.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const previousPage = location.state?.from || "/dashboard";
  const previousPageName = location.state?.fromName || "Home";

  // Toggle folder expansion
  const toggleFolder = (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Handle restore operations
  const handleRestore = async () => {
    if (!restoreDialog?.item) return;

    let success = false;
    if (restoreDialog.type === 'folder') {
      success = await handleRestoreFolder(restoreDialog.item as Folder);
      if (success) {
        setFolders(folders.filter(f => f.folder_id !== (restoreDialog.item as Folder).folder_id));
      }
    } else {
      success = await handleRestoreFile(
        restoreDialog.item as ArchivedFile
      );
      if (success) {
        if (restoreDialog.fromArchivedFolder) {
          setFolders(folders.map(folder => {
            if (folder.folder_id === (restoreDialog.item as ArchivedFile).folder_id) {
              return {
                ...folder,
                files: folder.files.filter(f => f.file_id !== (restoreDialog.item as ArchivedFile).file_id)
              };
            }
            return folder;
          }));
        } else {
          setArchivedFiles(archivedFiles.filter(f => f.file_id !== (restoreDialog.item as ArchivedFile).file_id));
        }
      }
    }

    setRestoreDialog(null);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search archives..."
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
      </div>

      {/* Breadcrumb Navigation */}
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
          <span className="text-gray-900">Archives</span>
        </BreadcrumbItem>
      </Breadcrumb>

      <h1 className="text-2xl font-medium font-poppins mb-6 text-blue-900">
        Archives
      </h1>

      {/* Archived Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {/* Archived Incident Report Folders Section */}
          {filteredFolders.filter(folder => !folder.is_blotter && !folder.is_womencase && !folder.is_extraction).length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-medium mb-4">Archived Incident Reports</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFolders
                  .filter(folder => !folder.is_blotter && !folder.is_womencase && !folder.is_extraction)
                  .map((folder) => (
                    <div key={folder.folder_id} className="space-y-4">
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                            <div 
                              className="flex flex-col items-start p-5 cursor-pointer"
                              onClick={(e) => toggleFolder(folder.folder_id, e)}
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
                              <div className="text-sm text-gray-500 mt-2">
                                Archived by <span className="text-blue-600">{folder.archived_by}</span> on {new Date(folder.archived_at || '').toLocaleDateString()}
                              </div>
                            </div>

                            {/* Show files when folder is expanded */}
                            {expandedFolders[folder.folder_id] && folder.files && folder.files.length > 0 && (
                              <div className="border-t border-gray-200 p-4">
                                <div className="space-y-2">
                                  {folder.files.map((file: ArchivedFile) => (
                                    <div key={file.file_id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                      <div className="flex items-center gap-3">
                                        <FileText className="text-gray-600" size={20} />
                                        <div>
                                          <h4 className="font-medium text-gray-900">{file.title}</h4>
                                          <p className="text-xs text-gray-500">
                                            Added by {file.created_by} on {new Date(file.created_at).toLocaleDateString()}
                                          </p>
                                          {file.archived_by && (
                                            <p className="text-xs text-gray-500">
                                              Archived by {file.archived_by} on {new Date(file.archived_at || '').toLocaleDateString()}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => setRestoreDialog({
                            type: 'folder',
                            item: folder
                          })}>
                            <Undo size={16} className="mr-2" /> Restore
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Archived Women and Children Cases Section */}
          {filteredFolders.filter(folder => folder.is_womencase).length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-medium mb-4">Archived Women and Children Cases</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFolders
                  .filter(folder => folder.is_womencase)
                  .map((folder) => (
                    <div key={folder.folder_id} className="space-y-4">
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                            <div 
                              className="flex flex-col items-start p-5 cursor-pointer"
                              onClick={(e) => toggleFolder(folder.folder_id, e)}
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
                              <div className="text-sm text-gray-500 mt-2">
                                Archived by <span className="text-blue-600">{folder.archived_by}</span> on {new Date(folder.archived_at || '').toLocaleDateString()}
                              </div>
                            </div>

                            {/* Show files when folder is expanded */}
                            {expandedFolders[folder.folder_id] && folder.files && folder.files.length > 0 && (
                              <div className="border-t border-gray-200 p-4">
                                <div className="space-y-2">
                                  {folder.files.map((file: ArchivedFile) => (
                                    <div key={file.file_id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                      <div className="flex items-center gap-3">
                                        <FileText className="text-gray-600" size={20} />
                                        <div>
                                          <h4 className="font-medium text-gray-900">{file.title}</h4>
                                          <p className="text-xs text-gray-500">
                                            Added by {file.created_by} on {new Date(file.created_at).toLocaleDateString()}
                                          </p>
                                          {file.archived_by && (
                                            <p className="text-xs text-gray-500">
                                              Archived by {file.archived_by} on {new Date(file.archived_at || '').toLocaleDateString()}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => setRestoreDialog({
                            type: 'folder',
                            item: folder
                          })}>
                            <Undo size={16} className="mr-2" /> Restore
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Archived Certificate of Extraction Section */}
          {filteredFolders.filter(folder => folder.is_extraction).length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-medium mb-4">Archived Certificates of Extraction</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFolders
                  .filter(folder => folder.is_extraction)
                  .map((folder) => (
                    <div key={folder.folder_id} className="space-y-4">
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                            <div 
                              className="flex flex-col items-start p-5 cursor-pointer"
                              onClick={(e) => toggleFolder(folder.folder_id, e)}
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
                            </div>
                            {expandedFolders[folder.folder_id] && folder.files && folder.files.length > 0 && (
                              <div className="border-t border-gray-200 p-4">
                                <div className="space-y-2">
                                  {folder.files.map((file) => (
                                    <div
                                      key={file.file_id}
                                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileText size={16} className="text-gray-500" />
                                        <span className="text-sm text-gray-700">{file.title}</span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRestoreDialog({
                                            type: 'file',
                                            item: file,
                                            fromArchivedFolder: true
                                          });
                                        }}
                                      >
                                        <Undo size={16} />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onClick={() => setRestoreDialog({
                              type: 'folder',
                              item: folder
                            })}
                          >
                            <Undo size={16} className="mr-2" /> Restore
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Archived eBlotter Folders Section */}
          {filteredFolders.filter(folder => folder.is_blotter && !folder.is_womencase).length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-medium mb-4">Archived eBlotters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFolders
                  .filter(folder => folder.is_blotter && !folder.is_womencase)
                  .map((folder) => (
                    <div key={folder.folder_id} className="space-y-4">
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                            <div 
                              className="flex flex-col items-start p-5 cursor-pointer"
                              onClick={(e) => toggleFolder(folder.folder_id, e)}
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
                              <div className="text-sm text-gray-500 mt-2">
                                Archived by <span className="text-blue-600">{folder.archived_by}</span> on {new Date(folder.archived_at || '').toLocaleDateString()}
                              </div>
                            </div>

                            {/* Show files when folder is expanded */}
                            {expandedFolders[folder.folder_id] && folder.files && folder.files.length > 0 && (
                              <div className="border-t border-gray-200 p-4">
                                <div className="space-y-2">
                                  {folder.files.map((file: ArchivedFile) => (
                                    <div key={file.file_id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                      <div className="flex items-center gap-3">
                                        <FileText className="text-gray-600" size={20} />
                                        <div>
                                          <h4 className="font-medium text-gray-900">{file.title}</h4>
                                          <p className="text-xs text-gray-500">
                                            Added by {file.created_by} on {new Date(file.created_at).toLocaleDateString()}
                                          </p>
                                          {file.archived_by && (
                                            <p className="text-xs text-gray-500">
                                              Archived by {file.archived_by} on {new Date(file.archived_at || '').toLocaleDateString()}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => setRestoreDialog({
                            type: 'folder',
                            item: folder
                          })}>
                            <Undo size={16} className="mr-2" /> Restore
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Archived Files Section */}
          <div className="mb-8">
            <h2 className="text-xl font-medium mb-4">Archived Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <ContextMenu key={`${file.file_type}-${file.file_id}`}>
                  <ContextMenuTrigger>
                    <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                      <div className="flex flex-col items-start p-5">
                        <div className="flex items-center gap-x-3 w-full">
                          <FileText
                            style={{ width: "40px", height: "40px" }}
                            className="text-gray-600"
                          />
                          <div className="flex-1">
                            <span className="font-poppins font-medium text-lg text-gray-900 text-left block">
                              {file.title}
                            </span>
                            <Badge variant="outline" className="mt-1">
                              {file.file_type.charAt(0).toUpperCase() + file.file_type.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        {/* File-specific information */}
                        <div className="mt-3 text-sm text-gray-600 w-full">
                          {(file.file_type === 'eblotter' || file.file_type === 'womenchildren') && (
                            <>
                              <p><strong>Case Number:</strong> {file.case_number}</p>
                              <p><strong>Complainant:</strong> {file.complainant_name}</p>
                              <p><strong>Respondent:</strong> {file.respondent_name}</p>
                              <p><strong>Incident Type:</strong> {file.incident_type}</p>
                              <p><strong>Incident Date:</strong> {file.incident_date ? new Date(file.incident_date).toLocaleDateString() : 'N/A'}</p>
                            </>
                          )}
                          {file.file_type === 'extraction' && (
                            <p><strong>Extraction ID:</strong> {file.file_id}</p>
                          )}
                          {file.file_type === 'regular' && file.folder_title && (
                            <p><strong>From Folder:</strong> {file.folder_title}</p>
                          )}
                          <p className="mt-2">
                            <strong>Created:</strong>{' '}
                            {new Date(file.created_at).toLocaleDateString()}
                          </p>
                          <p>
                            <strong>Created By:</strong> {file.created_by}
                          </p>
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => setRestoreDialog({
                        type: 'file',
                        item: file,
                        fromArchivedFolder: false
                      })}
                    >
                      <Undo className="mr-2 h-4 w-4" />
                      Restore
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </div>

          {filteredFolders.length === 0 && filteredFiles.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No archived content found
            </div>
          )}
        </>
      )}

      {/* Restore Dialog */}
      <Dialog open={restoreDialog !== null} onOpenChange={() => setRestoreDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore {restoreDialog?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this {restoreDialog?.type}? 
              This will move it back to the active {restoreDialog?.type === 'folder' ? 'folders' : 'files'} list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRestoreDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-900 hover:bg-blue-800"
              onClick={handleRestore}
            >
              Yes, Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 