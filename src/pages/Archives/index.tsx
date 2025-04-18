import { Badge } from "@/components/ui/badge";
import {
  FolderClosed,
  ChevronRight,
  Undo,
  Grid,
  List,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
} from "./components/ArchiveOperations";
import { useLocation, Link } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Archives() {
  const [searchQuery, setSearchQuery] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [archivedFiles, setArchivedFiles] = useState<ArchivedFile[]>([]);
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [restoreDialog, setRestoreDialog] = useState<{
    type: "folder" | "file";
    item: Folder | ArchivedFile | null;
    fromArchivedFolder?: boolean;
  } | null>(null);

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem("activeTab") || "incident_reports";
  });

  const [isListView, setIsListView] = useState(() => {
    return localStorage.getItem("isListView") === "true";
  });

  // Define the handleViewChange function
  const handleViewChange = (isList: boolean) => {
    setIsListView(isList);
  };

  // Fetch archived content and categories
  useEffect(() => {
    const loadContent = async () => {
      try {
        const { folders: archivedFolders, files } =
          await fetchArchivedContent();
        setFolders(archivedFolders);
        setArchivedFiles(files);

        await fetchCategories();
      } catch (error) {
        console.error("Error loading content:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, []);

  // Filter folders and files based on search query
  const filteredFolders = folders.filter((folder) => {
    const matchesSearch = folder.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredFiles = archivedFiles.filter((file) => {
    return file.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const previousPage = location.state?.from || "/dashboard";
  const previousPageName = location.state?.fromName || "Home";

  // Handle restore operations
  const handleRestore = async () => {
    if (!restoreDialog?.item) return;

    let success = false;
    if (restoreDialog.type === "folder") {
      success = await handleRestoreFolder(restoreDialog.item as Folder);
      if (success) {
        setFolders(
          folders.filter(
            (f) => f.folder_id !== (restoreDialog.item as Folder).folder_id
          )
        );
      }
    } else {
      success = await handleRestoreFile(restoreDialog.item as ArchivedFile);
      if (success) {
        if (restoreDialog.fromArchivedFolder) {
          setFolders(
            folders.map((folder) => {
              if (
                folder.folder_id ===
                (restoreDialog.item as ArchivedFile).folder_id
              ) {
                return {
                  ...folder,
                  files: folder.files.filter(
                    (f) =>
                      f.file_id !== (restoreDialog.item as ArchivedFile).file_id
                  ),
                };
              }
              return folder;
            })
          );
        } else {
          setArchivedFiles(
            archivedFiles.filter(
              (f) => f.file_id !== (restoreDialog.item as ArchivedFile).file_id
            )
          );
        }
      }
    }

    setRestoreDialog(null);
  };

  const sortCriteria = "incident_report";

  // Sort archived files based on the selected criteria
  const sortedFiles = [...filteredFiles].sort((a) => {
    if (sortCriteria === "incident_report") {
      return a.file_type === "regular" ? -1 : 1; // Prioritize incident reports
    } else if (sortCriteria === "extraction_certificate") {
      return a.file_type === "extraction" ? -1 : 1; // Prioritize extraction certificates
    } else if (sortCriteria === "blotter") {
      return a.file_type === "eblotter" ? -1 : 1; // Prioritize blotters
    }
    return 0; // No sorting
  });

  // Effect to store the active tab and view type in localStorage
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
    localStorage.setItem("isListView", JSON.stringify(isListView)); // Store view type
  }, [activeTab, isListView]);

  return (
    <div className="p-6 font-poppins max-w-screen-xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
        />
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium font-poppins text-blue-900">
          Archives
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

      {/* Tabs for different categories */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-5">
          <TabsTrigger value="incident_reports">Incident Reports</TabsTrigger>
          <TabsTrigger value="extraction">
            Certificates of Extraction
          </TabsTrigger>
          <TabsTrigger value="eblotters">Blotter Reports</TabsTrigger>
          <TabsTrigger value="wcpd">Women and Children Cases</TabsTrigger>
        </TabsList>

        <TabsContent value="incident_reports">
          {isLoading ? (
            isListView ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-50">
                  <thead>
                    <tr>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Title
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Status
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Archived By
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Archived On
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 4 }).map((_, index) => (
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
                        <td className="px-4 py-2 border-b">
                          <Skeleton className="h-4 w-1/4" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            )
          ) : isListView ? (
            // List view rendering logic
            <div className="overflow-x-auto font-poppins">
              <table className="min-w-full bg-gray-50">
                <thead>
                  <tr>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Title
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Status
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Archived By
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Archived On
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Show archived folders */}
                  {filteredFolders
                    .filter(
                      (folder) =>
                        !folder.is_blotter &&
                        !folder.is_womencase &&
                        !folder.is_extraction
                    )
                    .map((folder) => (
                      <tr key={`folder-${folder.folder_id}`} className="hover:bg-gray-100">
                        <td
                          className="px-4 py-2 border-b truncate"
                          style={{ maxWidth: "150px" }}
                        >
                          <div className="flex items-center gap-2">
                            <FolderClosed size={16} className="text-gray-600" />
                            {folder.title}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(folder.status)}
                          >
                            {folder.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 border-b">
                          {folder.archived_by}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {new Date(
                            folder.archived_at || ""
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Button
                            onClick={() =>
                              setRestoreDialog({ type: "folder", item: folder })
                            }
                            className="bg-blue-900 hover:bg-blue-700"
                          >
                            <Undo size={16} className="mr-2" /> Restore
                          </Button>
                        </td>
                      </tr>
                    ))}
                  
                  {/* Show archived files */}
                  {sortedFiles
                    .filter(file => file.file_type === "regular")
                    .map((file) => (
                      <tr key={`file-${file.file_id}`} className="hover:bg-gray-100">
                        <td
                          className="px-4 py-2 border-b truncate"
                          style={{ maxWidth: "150px" }}
                        >
                          {file.title}
                          {file.folder_title && (
                            <div className="text-xs text-gray-500">
                              in {file.folder_title}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Badge variant="outline" className="bg-gray-100">
                            Archived
                          </Badge>
                        </td>
                        <td className="px-4 py-2 border-b">
                          {file.archived_by}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {new Date(file.archived_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Button
                            onClick={() =>
                              setRestoreDialog({ type: "file", item: file })
                            }
                            className="bg-blue-900 hover:bg-blue-700"
                          >
                            <Undo size={16} className="mr-2" /> Restore
                          </Button>
                        </td>
                      </tr>
                    ))}
                  
                  {filteredFolders.length === 0 && sortedFiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-gray-500">
                        <DotLottieReact
                          src="/assets/NoFiles.lottie"
                          loop
                          autoplay
                          className="w-6/12 mx-auto"
                        />
                        No archived items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Grid view rendering logic
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Show archived folders */}
              {filteredFolders
                .filter(
                  (folder) =>
                    !folder.is_blotter &&
                    !folder.is_womencase &&
                    !folder.is_extraction
                )
                .map((folder) => (
                  <div 
                    key={`folder-${folder.folder_id}`} 
                    className="space-y-4"
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-transform duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                      <div className="flex flex-col items-start p-5">
                        <div className="flex items-center gap-x-3 w-full">
                          <FolderClosed
                            style={{ width: "40px", height: "40px" }}
                            className="text-gray-600"
                            fill="#4b5563"
                          />
                          <span
                            className="font-poppins font-medium text-lg text-gray-900 text-left truncate"
                            style={{
                              maxWidth: "150px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {folder.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(folder.status)}
                          >
                            {folder.status}
                          </Badge>
                        </div>
                        <Button
                          onClick={() =>
                            setRestoreDialog({ type: "folder", item: folder })
                          }
                          className="mt-3 w-full bg-blue-900 hover:bg-blue-700"
                        >
                          <Undo size={16} className="mr-2" /> Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Show archived files */}
              {sortedFiles
                .filter(file => file.file_type === "regular")
                .map((file) => (
                  <div 
                    key={`file-${file.file_id}`} 
                    className="space-y-4"
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-transform duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                      <div className="flex flex-col items-start p-5">
                        <div className="flex items-center gap-x-3 w-full">
                          <div className="text-gray-600">
                            📄
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span
                              className="font-poppins font-medium text-lg text-gray-900 text-left truncate"
                              style={{
                                maxWidth: "150px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {file.title}
                            </span>
                            {file.folder_title && (
                              <span className="text-xs text-gray-500">
                                in {file.folder_title}
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-gray-100">
                            Archived
                          </Badge>
                        </div>
                        <Button
                          onClick={() =>
                            setRestoreDialog({ type: "file", item: file })
                          }
                          className="mt-3 w-full bg-blue-900 hover:bg-blue-700"
                        >
                          <Undo size={16} className="mr-2" /> Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

              {filteredFolders.length === 0 && sortedFiles.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center h-64">
                  <DotLottieReact
                    src="/assets/NoFiles.lottie"
                    loop
                    autoplay
                    className="w-6/12"
                  />
                  <p className="text-gray-500">No archived items found</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="wcpd">
          {isLoading ? (
            isListView ? (
              <div className="overflow-x-auto font-poppins">
                <table className="min-w-full bg-gray-50">
                  <thead>
                    <tr>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Title
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Status
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Archived By
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Archived On
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 4 }).map((_, index) => (
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
                        <td className="px-4 py-2 border-b">
                          <Skeleton className="h-4 w-1/4" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            )
          ) : isListView ? (
            <div className="overflow-x-auto font-poppins">
              <table className="min-w-full bg-gray-50">
                <thead>
                  <tr>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Title
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Status
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Archived By
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Archived On
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Show archived folders */}
                  {filteredFolders
                    .filter((folder) => folder.is_womencase)
                    .map((folder) => (
                      <tr key={`folder-${folder.folder_id}`} className="hover:bg-gray-100">
                        <td
                          className="px-4 py-2 border-b truncate"
                          style={{ maxWidth: "150px" }}
                        >
                          <div className="flex items-center gap-2">
                            <FolderClosed size={16} className="text-gray-600" />
                            {folder.title}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(folder.status)}
                          >
                            {folder.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 border-b">
                          {folder.archived_by}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {new Date(folder.archived_at || "").toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Button
                            onClick={() =>
                              setRestoreDialog({ type: "folder", item: folder })
                            }
                            className="bg-blue-900 hover:bg-blue-700"
                          >
                            <Undo size={16} className="mr-2" /> Restore
                          </Button>
                        </td>
                      </tr>
                    ))}

                  {/* Show archived files */}
                  {sortedFiles
                    .filter(file => file.file_type === "womenchildren")
                    .map((file) => (
                      <tr key={`file-${file.file_id}`} className="hover:bg-gray-100">
                        <td
                          className="px-4 py-2 border-b truncate"
                          style={{ maxWidth: "150px" }}
                        >
                          {file.title}
                          {file.folder_title && (
                            <div className="text-xs text-gray-500">
                              in {file.folder_title}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Badge variant="outline" className="bg-gray-100">
                            Archived
                          </Badge>
                        </td>
                        <td className="px-4 py-2 border-b">
                          {file.archived_by}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {new Date(file.archived_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Button
                            onClick={() =>
                              setRestoreDialog({ type: "file", item: file })
                            }
                            className="bg-blue-900 hover:bg-blue-700"
                          >
                            <Undo size={16} className="mr-2" /> Restore
                          </Button>
                        </td>
                      </tr>
                    ))}

                  {filteredFolders.length === 0 && sortedFiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-gray-500">
                        <DotLottieReact
                          src="/assets/NoFiles.lottie"
                          loop
                          autoplay
                          className="w-6/12 mx-auto"
                        />
                        No archived items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Show archived folders */}
              {filteredFolders
                .filter((folder) => folder.is_womencase)
                .map((folder) => (
                  <div 
                    key={`folder-${folder.folder_id}`} 
                    className="space-y-4"
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-transform duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                      <div className="flex flex-col items-start p-5">
                        <div className="flex items-center gap-x-3 w-full">
                          <FolderClosed
                            style={{ width: "40px", height: "40px" }}
                            className="text-gray-600"
                            fill="#4b5563"
                          />
                          <span
                            className="font-poppins font-medium text-lg text-gray-900 text-left truncate"
                            style={{
                              maxWidth: "150px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {folder.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(folder.status)}
                          >
                            {folder.status}
                          </Badge>
                        </div>
                        <Button
                          onClick={() =>
                            setRestoreDialog({ type: "folder", item: folder })
                          }
                          className="mt-3 w-full bg-blue-900 hover:bg-blue-700"
                        >
                          <Undo size={16} className="mr-2" /> Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Show archived files */}
              {sortedFiles
                .filter(file => file.file_type === "womenchildren")
                .map((file) => (
                  <div 
                    key={`file-${file.file_id}`} 
                    className="space-y-4"
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-transform duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                      <div className="flex flex-col items-start p-5">
                        <div className="flex items-center gap-x-3 w-full">
                          <div className="text-gray-600">
                            📄
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span
                              className="font-poppins font-medium text-lg text-gray-900 text-left truncate"
                              style={{
                                maxWidth: "150px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {file.title}
                            </span>
                            {file.folder_title && (
                              <span className="text-xs text-gray-500">
                                in {file.folder_title}
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-gray-100">
                            Archived
                          </Badge>
                        </div>
                        <Button
                          onClick={() =>
                            setRestoreDialog({ type: "file", item: file })
                          }
                          className="mt-3 w-full bg-blue-900 hover:bg-blue-700"
                        >
                          <Undo size={16} className="mr-2" /> Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

              {filteredFolders.length === 0 && sortedFiles.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center h-64">
                  <DotLottieReact
                    src="/assets/NoFiles.lottie"
                    loop
                    autoplay
                    className="w-6/12"
                  />
                  <p className="text-gray-500">No archived items found</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="extraction">
          {isLoading ? (
            isListView ? (
              <div className="overflow-x-auto font-poppins">
                <table className="min-w-full bg-gray-50">
                  <thead>
                    <tr>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Title
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Status
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Archived By
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Archived On
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 4 }).map((_, index) => (
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
                        <td className="px-4 py-2 border-b">
                          <Skeleton className="h-4 w-1/4" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            )
          ) : isListView ? (
            <div className="overflow-x-auto font-poppins">
              <table className="min-w-full bg-gray-50">
                <thead>
                  <tr>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Title
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Status
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Archived By
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Archived On
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Show archived folders */}
                  {filteredFolders
                    .filter((folder) => folder.is_extraction)
                    .map((folder) => (
                      <tr key={`folder-${folder.folder_id}`} className="hover:bg-gray-100">
                        <td
                          className="px-4 py-2 border-b truncate"
                          style={{ maxWidth: "150px" }}
                        >
                          <div className="flex items-center gap-2">
                            <FolderClosed size={16} className="text-gray-600" />
                            {folder.title}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(folder.status)}
                          >
                            {folder.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 border-b">
                          {folder.archived_by}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {new Date(folder.archived_at || "").toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Button
                            onClick={() =>
                              setRestoreDialog({ type: "folder", item: folder })
                            }
                            className="bg-blue-900 hover:bg-blue-700"
                          >
                            <Undo size={16} className="mr-2" /> Restore
                          </Button>
                        </td>
                      </tr>
                    ))}

                  {/* Show archived files */}
                  {sortedFiles
                    .filter(file => file.file_type === "extraction")
                    .map((file) => (
                      <tr key={`file-${file.file_id}`} className="hover:bg-gray-100">
                        <td
                          className="px-4 py-2 border-b truncate"
                          style={{ maxWidth: "150px" }}
                        >
                          {file.title}
                          {file.folder_title && (
                            <div className="text-xs text-gray-500">
                              in {file.folder_title}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Badge variant="outline" className="bg-gray-100">
                            Archived
                          </Badge>
                        </td>
                        <td className="px-4 py-2 border-b">
                          {file.archived_by}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {new Date(file.archived_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Button
                            onClick={() =>
                              setRestoreDialog({ type: "file", item: file })
                            }
                            className="bg-blue-900 hover:bg-blue-700"
                          >
                            <Undo size={16} className="mr-2" /> Restore
                          </Button>
                        </td>
                      </tr>
                    ))}

                  {filteredFolders.length === 0 && sortedFiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-gray-500">
                        <DotLottieReact
                          src="/assets/NoFiles.lottie"
                          loop
                          autoplay
                          className="w-6/12 mx-auto"
                        />
                        No archived items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Show archived folders */}
              {filteredFolders
                .filter((folder) => folder.is_extraction)
                .map((folder) => (
                  <div 
                    key={`folder-${folder.folder_id}`} 
                    className="space-y-4"
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-transform duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                      <div className="flex flex-col items-start p-5">
                        <div className="flex items-center gap-x-3 w-full">
                          <FolderClosed
                            style={{ width: "40px", height: "40px" }}
                            className="text-gray-600"
                            fill="#4b5563"
                          />
                          <span
                            className="font-poppins font-medium text-lg text-gray-900 text-left truncate"
                            style={{
                              maxWidth: "150px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {folder.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(folder.status)}
                          >
                            {folder.status}
                          </Badge>
                        </div>
                        <Button
                          onClick={() =>
                            setRestoreDialog({ type: "folder", item: folder })
                          }
                          className="mt-3 w-full bg-blue-900 hover:bg-blue-700"
                        >
                          <Undo size={16} className="mr-2" /> Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Show archived files */}
              {sortedFiles
                .filter(file => file.file_type === "extraction")
                .map((file) => (
                  <div 
                    key={`file-${file.file_id}`} 
                    className="space-y-4"
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-transform duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                      <div className="flex flex-col items-start p-5">
                        <div className="flex items-center gap-x-3 w-full">
                          <div className="text-gray-600">
                            📄
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span
                              className="font-poppins font-medium text-lg text-gray-900 text-left truncate"
                              style={{
                                maxWidth: "150px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {file.title}
                            </span>
                            {file.folder_title && (
                              <span className="text-xs text-gray-500">
                                in {file.folder_title}
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-gray-100">
                            Archived
                          </Badge>
                        </div>
                        <Button
                          onClick={() =>
                            setRestoreDialog({ type: "file", item: file })
                          }
                          className="mt-3 w-full bg-blue-900 hover:bg-blue-700"
                        >
                          <Undo size={16} className="mr-2" /> Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

              {filteredFolders.length === 0 && sortedFiles.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center h-64">
                  <DotLottieReact
                    src="/assets/NoFiles.lottie"
                    loop
                    autoplay
                    className="w-6/12"
                  />
                  <p className="text-gray-500">No archived items found</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="eblotters">
          {isLoading ? (
            isListView ? (
              <div className="overflow-x-auto font-poppins">
                <table className="min-w-full bg-gray-50">
                  <thead>
                    <tr>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Title
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Status
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Archived By
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Archived On
                      </th>
                      <th className="font-semibold text-md px-4 py-2 border-b text-left">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 4 }).map((_, index) => (
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
                        <td className="px-4 py-2 border-b">
                          <Skeleton className="h-4 w-1/4" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            )
          ) : isListView ? (
            <div className="overflow-x-auto font-poppins">
              <table className="min-w-full bg-gray-50">
                <thead>
                  <tr>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Title
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Status
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Archived By
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Archived On
                    </th>
                    <th className="font-semibold text-md px-4 py-2 border-b text-left">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Show archived folders */}
                  {filteredFolders
                    .filter((folder) => folder.is_blotter)
                    .map((folder) => (
                      <tr key={`folder-${folder.folder_id}`} className="hover:bg-gray-100">
                        <td
                          className="px-4 py-2 border-b truncate"
                          style={{ maxWidth: "150px" }}
                        >
                          <div className="flex items-center gap-2">
                            <FolderClosed size={16} className="text-gray-600" />
                            {folder.title}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(folder.status)}
                          >
                            {folder.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 border-b">
                          {folder.archived_by}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {new Date(folder.archived_at || "").toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Button
                            onClick={() =>
                              setRestoreDialog({ type: "folder", item: folder })
                            }
                            className="bg-blue-900 hover:bg-blue-700"
                          >
                            <Undo size={16} className="mr-2" /> Restore
                          </Button>
                        </td>
                      </tr>
                    ))}

                  {/* Show archived files */}
                  {sortedFiles
                    .filter(file => file.file_type === "eblotter")
                    .map((file) => (
                      <tr key={`file-${file.file_id}`} className="hover:bg-gray-100">
                        <td
                          className="px-4 py-2 border-b truncate"
                          style={{ maxWidth: "150px" }}
                        >
                          {file.title}
                          {file.folder_title && (
                            <div className="text-xs text-gray-500">
                              in {file.folder_title}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Badge variant="outline" className="bg-gray-100">
                            Archived
                          </Badge>
                        </td>
                        <td className="px-4 py-2 border-b">
                          {file.archived_by}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {new Date(file.archived_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <Button
                            onClick={() =>
                              setRestoreDialog({ type: "file", item: file })
                            }
                            className="bg-blue-900 hover:bg-blue-700"
                          >
                            <Undo size={16} className="mr-2" /> Restore
                          </Button>
                        </td>
                      </tr>
                    ))}

                  {filteredFolders.length === 0 && sortedFiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-gray-500">
                        <DotLottieReact
                          src="/assets/NoFiles.lottie"
                          loop
                          autoplay
                          className="w-6/12 mx-auto"
                        />
                        No archived items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Show archived folders */}
              {filteredFolders
                .filter((folder) => folder.is_blotter)
                .map((folder) => (
                  <div 
                    key={`folder-${folder.folder_id}`} 
                    className="space-y-4"
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-transform duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                      <div className="flex flex-col items-start p-5">
                        <div className="flex items-center gap-x-3 w-full">
                          <FolderClosed
                            style={{ width: "40px", height: "40px" }}
                            className="text-gray-600"
                            fill="#4b5563"
                          />
                          <span
                            className="font-poppins font-medium text-lg text-gray-900 text-left truncate"
                            style={{
                              maxWidth: "150px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {folder.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(folder.status)}
                          >
                            {folder.status}
                          </Badge>
                        </div>
                        <Button
                          onClick={() =>
                            setRestoreDialog({ type: "folder", item: folder })
                          }
                          className="mt-3 w-full bg-blue-900 hover:bg-blue-700"
                        >
                          <Undo size={16} className="mr-2" /> Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Show archived files */}
              {sortedFiles
                .filter(file => file.file_type === "eblotter")
                .map((file) => (
                  <div 
                    key={`file-${file.file_id}`} 
                    className="space-y-4"
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex flex-col bg-white border border-gray-300 rounded-xl shadow-sm transition-transform duration-200 hover:shadow-md hover:bg-gray-100 w-full">
                      <div className="flex flex-col items-start p-5">
                        <div className="flex items-center gap-x-3 w-full">
                          <div className="text-gray-600">
                            📄
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span
                              className="font-poppins font-medium text-lg text-gray-900 text-left truncate"
                              style={{
                                maxWidth: "150px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {file.title}
                            </span>
                            {file.folder_title && (
                              <span className="text-xs text-gray-500">
                                in {file.folder_title}
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-gray-100">
                            Archived
                          </Badge>
                        </div>
                        <Button
                          onClick={() =>
                            setRestoreDialog({ type: "file", item: file })
                          }
                          className="mt-3 w-full bg-blue-900 hover:bg-blue-700"
                        >
                          <Undo size={16} className="mr-2" /> Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

              {filteredFolders.length === 0 && sortedFiles.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center h-64">
                  <DotLottieReact
                    src="/assets/NoFiles.lottie"
                    loop
                    autoplay
                    className="w-6/12"
                  />
                  <p className="text-gray-500">No archived items found</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Restore Dialog */}
      <Dialog
        open={restoreDialog !== null}
        onOpenChange={() => setRestoreDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Restore {restoreDialog?.type === "folder" ? "Folder" : "File"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this {restoreDialog?.type}? This
              will move it back to the active{" "}
              {restoreDialog?.type === "folder" ? "folders" : "files"} list.
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
