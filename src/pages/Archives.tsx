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
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import SearchBar from "@/Search";
import { supabase } from "@/utils/supa";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  archived_by?: string;
  archived_at?: string;
  files: ArchivedFile[];
}

interface ArchivedFile {
  file_id: number;
  folder_id: number;
  title: string;
  created_by: string;
  created_at: string;
  is_archived: boolean;
  folder_title?: string;
  incident_summary: string;
  archived_by?: string;
  archived_at?: string;
}

// Function to determine badge color based on status
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-200 text-yellow-800';
    case 'resolved':
      return 'bg-green-200 text-green-800';
    case 'dismissed':
      return 'bg-red-200 text-red-800';
    case 'under investigation':
      return 'bg-blue-200 text-blue-800';
    default:
      return 'bg-gray-200 text-black';
  }
};

export default function Archives() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [archivedFiles, setArchivedFiles] = useState<ArchivedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<{ [key: number]: boolean }>({});
  const [restoreDialog, setRestoreDialog] = useState<{
    type: 'folder' | 'file';
    item: Folder | ArchivedFile | null;
    fromArchivedFolder?: boolean;
  } | null>(null);

  // Fetch archived folders and files
  useEffect(() => {
    const fetchArchivedContent = async () => {
      try {
        // Fetch archived folders with their categories
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select(`
            *,
            creator:created_by(name),
            updater:updated_by(name),
            archiver:updated_by(name),
            files:files(
              *,
              creator:created_by(name),
              updater:updated_by(name)
            )
          `)
          .eq('is_archived', true)
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
              archived_by: folder.archiver?.name || folder.updated_by,
              archived_at: folder.updated_at,
              categories: categoriesData?.map(item => item.categories) || [],
              files: folder.files.map((file: any) => ({
                ...file,
                created_by: file.creator?.name || file.created_by,
                updated_by: file.updater?.name || file.updated_by,
                folder_title: folder.title
              }))
            };
          })
        );

        setFolders(foldersWithCategories);

        // Fetch archived files from non-archived folders
        const { data: filesData, error: filesError } = await supabase
          .from('files')
          .select(`
            *,
            creator:created_by(name),
            updater:updated_by(name),
            folders!inner(
              is_archived,
              title
            )
          `)
          .eq('is_archived', true)
          .eq('folders.is_archived', false)
          .order('created_at', { ascending: false });

        if (filesError) throw filesError;

        const formattedFiles = filesData.map(file => ({
          ...file,
          created_by: file.creator?.name || file.created_by,
          updated_by: file.updater?.name || file.updated_by,
          folder_title: file.folders?.title,
          archived_by: file.updater?.name || file.updated_by,
          archived_at: file.updated_at
        }));

        setArchivedFiles(formattedFiles);

      } catch (error) {
        console.error('Error fetching archived content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchivedContent();
  }, []);

  // Fetch categories
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

  // Filter folders and files based on search query and category
  const filteredFolders = folders.filter(folder => {
    const matchesSearch = folder.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filter === "all" || folder.categories.some(cat => cat.category_id.toString() === filter);
    return matchesSearch && matchesCategory;
  });

  const filteredFiles = archivedFiles.filter(file => {
    return file.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Add toggle function
  const toggleFolder = (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Modify restore handlers to use dialogs
  const handleRestoreFolder = async (folder: Folder) => {
    try {
      const { error } = await supabase
        .from('folders')
        .update({ is_archived: false })
        .eq('folder_id', folder.folder_id);

      if (error) throw error;

      setFolders(folders.filter(f => f.folder_id !== folder.folder_id));
      toast.success("Folder restored successfully");
      setRestoreDialog(null);
    } catch (error: any) {
      console.error('Error restoring folder:', error);
      toast.error(error.message || "Failed to restore folder");
    }
  };

  const handleRestoreFile = async (file: ArchivedFile, fromArchivedFolder: boolean = false) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_archived: false })
        .eq('file_id', file.file_id);

      if (error) throw error;

      if (fromArchivedFolder) {
        setFolders(folders.map(folder => {
          if (folder.folder_id === file.folder_id) {
            return {
              ...folder,
              files: folder.files.filter(f => f.file_id !== file.file_id)
            };
          }
          return folder;
        }));
      } else {
        setArchivedFiles(archivedFiles.filter(f => f.file_id !== file.file_id));
      }

      toast.success("File restored successfully");
      setRestoreDialog(null);
    } catch (error: any) {
      console.error('Error restoring file:', error);
      toast.error(error.message || "Failed to restore file");
    }
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
          <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="flex items-center">
          <ChevronRight size={16} />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Archives</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <h1 className="text-2xl font-medium font-poppins mb-6 text-blue-900">
        Archives
      </h1>

      {/* Archived Folders Section */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {filteredFolders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-medium mb-4">Archived Folders</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFolders.map((folder) => (
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
          {filteredFiles.length > 0 && (
            <div>
              <h2 className="text-xl font-medium mb-4">Archived Files from Active Folders</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFiles.map((file) => (
                  <ContextMenu key={file.file_id}>
                    <ContextMenuTrigger>
                      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="text-gray-600" />
                          <div>
                            <h3 className="font-medium text-gray-900">{file.title}</h3>
                            <p className="text-sm text-blue-600">
                              From folder: {file.folder_title}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          Archived by <span className="text-blue-600">{file.archived_by}</span> on {new Date(file.archived_at || '').toLocaleDateString()}
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => setRestoreDialog({
                        type: 'file',
                        item: file
                      })}>
                        <Undo size={16} className="mr-2" /> Restore
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            </div>
          )}

          {filteredFolders.length === 0 && filteredFiles.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No archived content found
            </div>
          )}
        </>
      )}

      {/* Add Restore Dialog */}
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
              onClick={() => {
                if (!restoreDialog?.item) return;
                
                if (restoreDialog.type === 'folder') {
                  handleRestoreFolder(restoreDialog.item as Folder);
                } else {
                  handleRestoreFile(
                    restoreDialog.item as ArchivedFile,
                    restoreDialog.fromArchivedFolder
                  );
                }
              }}
            >
              Yes, Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}