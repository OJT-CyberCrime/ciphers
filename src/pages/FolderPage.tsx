import { useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator} from "@/components/ui/breadcrumb";
import SearchBar from "@/Search";
import { ChevronRight, Plus, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/utils/supa";
import { Badge } from "@/components/ui/badge";

interface File {
  file_id: number;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  folder_id: number;
}

interface Folder {
  folder_id: number;
  title: string;
  status: string;
  created_by: string;
  created_at: string;
}

const FolderPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [files, setFiles] = useState<File[]>([]);
  const [folderDetails, setFolderDetails] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get the current location to determine the previous page
  const location = useLocation();
  const previousPage = location.state?.from || "/incident-report";
  const previousPageName = location.state?.fromName || "Incident Reports";

  // Fetch folder details and files
  useEffect(() => {
    const fetchFolderAndFiles = async () => {
      if (!id) return;

      try {
        // Fetch folder details
        const { data: folderData, error: folderError } = await supabase
          .from('folders')
          .select(`
            *,
            creator:created_by(name)
          `)
          .eq('folder_id', id)
          .single();

        if (folderError) throw folderError;

        setFolderDetails({
          ...folderData,
          created_by: folderData.creator?.name || folderData.created_by
        });

        // Fetch files in the folder
        const { data: filesData, error: filesError } = await supabase
          .from('files')
          .select(`
            *,
            creator:created_by(name),
            updater:updated_by(name)
          `)
          .eq('folder_id', id)
          .order('created_at', { ascending: false });

        if (filesError) throw filesError;

        const formattedFiles = filesData.map(file => ({
          ...file,
          created_by: file.creator?.name || file.created_by,
          updated_by: file.updater?.name || file.updated_by
        }));

        setFiles(formattedFiles);
      } catch (error) {
        console.error('Error fetching folder data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFolderAndFiles();
  }, [id]);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
        />

        <Select onValueChange={setFilter} defaultValue="all">
          <SelectTrigger className="w-48 p-5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Files</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="other">Others</SelectItem>
          </SelectContent>
        </Select>

        <Button
          className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
        >
          <Plus size={16} /> Add File
        </Button>
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
          <BreadcrumbLink href={previousPage}>{previousPageName}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="flex items-center">
          <ChevronRight size={16} />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">{folderDetails?.title || `Folder ${id}`}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Folder Content */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-medium font-poppins text-blue-900">
            {folderDetails?.title || `Folder ${id}`}
          </h1>
          <Badge variant="outline" className="bg-gray-200">
            {folderDetails?.status}
          </Badge>
        </div>

        {/* Files Grid */}
        {isLoading ? (
          <div>Loading files...</div>
        ) : files.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file) => (
              <div
                key={file.file_id}
                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="text-blue-900" size={24} />
                  <h3 className="font-medium text-gray-900">{file.title}</h3>
                </div>
                <div className="text-sm text-gray-500">
                  Added by {file.created_by} on {new Date(file.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            No files found in this folder
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderPage; 