import { useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator} from "@/components/ui/breadcrumb";
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
  MoreVertical
} from "lucide-react";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/utils/supa";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Cookies from "js-cookie";
import RichTextEditor from "@/components/RichTextEditor";
import FileOperations from "./components/FileOperations";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileRecord {
  blotter_id: number;
  title: string;
  entry_num: string;
  date_reported: string;
  time_reported: string;
  date_committed: string;  
  time_committed: string;
  path_file: string;
  investigator: string;
  desk_officer: string;
  signatory_name: string;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string | null;
  is_archived: boolean;
  folder_id: number;
  viewed_by: number | null;
  viewed_at: string | null;
  downloaded_by: number | null;
  downloaded_at: string | null;
  printed_by: number | null;
  printed_at: string | null;
  incident_summary: string;
  public_url: string;
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
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
  const documentTypes = ['pdf', 'doc', 'docx'];
  const spreadsheetTypes = ['xls', 'xlsx'];
  const presentationTypes = ['ppt', 'pptx'];

  if (imageTypes.includes(ext)) return <ImageIcon size={24} className="text-green-600" />;
  if (documentTypes.includes(ext)) return <FileText size={24} className="text-blue-900" />;
  if (spreadsheetTypes.includes(ext)) return <FileText size={24} className="text-emerald-600" />;
  if (presentationTypes.includes(ext)) return <FileText size={24} className="text-orange-600" />;
  return <File size={24} className="text-gray-600" />;
};

// Add this helper function to strip HTML tags
const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

// Update the helper function to return an object with class and label
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'pending':
      return { class: 'bg-yellow-200 text-yellow-800', label: 'Pending' }; // Lighter for pending status
    case 'resolved':
      return { class: 'bg-green-200 text-green-800', label: 'Resolved' }; // Lighter for resolved status
    case 'dismissed':
      return { class: 'bg-red-200 text-red-800', label: 'Dismissed' }; // Lighter for dismissed status
    case 'under investigation':
      return { class: 'bg-blue-200 text-blue-800', label: 'Under Investigation' }; // Lighter for under investigation status
    default:
      return { class: 'bg-gray-200 text-black', label: 'N/A' }; // Default case
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
  const [newFileSummary, setNewFileSummary] = useState("");
  const [fileUpload, setFileUpload] = useState<FileList | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [showFileDialog, setShowFileDialog] = useState<'edit' | 'archive' | 'details' | null>(null);
  const [previewStates, setPreviewStates] = useState<{ [key: number]: boolean }>({});
  const [showOptions, setShowOptions] = useState<{ [key: number]: boolean }>({});
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);

  // Get the current location to determine the previous page
  const location = useLocation();
  const previousPage = location.state?.from || "/incident-report";
  const previousPageName = location.state?.fromName || "Incident Reports";

  // Handle file upload
  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !fileUpload?.[0] || !formRef) return;

    try {
      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      
      // Get the user's ID from the users table using their email
      const { data: userData2, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error('User not found');

      // Get form data
      const formData = new FormData(formRef);
      const title = formData.get('title') as string;
      const entry_num = formData.get('entry_num') as string;
      const date_reported = formData.get('date_reported') as string;
      const time_reported = formData.get('time_reported') as string;
      const date_committed = formData.get('date_committed') as string;
      const time_committed = formData.get('time_committed') as string;
      const investigator = formData.get('investigator') as string;
      const desk_officer = formData.get('desk_officer') as string;
      const signatory_name = formData.get('signatory_name') as string;

      // Upload file to storage
      const file = fileUpload[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `folder_${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      // Strip HTML tags from the incident summary
      const cleanSummary = stripHtml(newFileSummary);

      // Create file record in database
      const { data: fileData, error: fileError } = await supabase
        .from('eblotter_file')
        .insert([
          {
            folder_id: id,
            title: title,
            entry_num: entry_num,
            date_reported: date_reported,
            time_reported: time_reported,
            date_committed: date_committed,
            time_committed: time_committed,
            path_file: filePath,
            investigator: investigator,
            desk_officer: desk_officer,
            signatory_name: signatory_name,
            incident_summary: cleanSummary,
            created_by: userData2.user_id,
            is_archived: false,
            public_url: publicUrl,
            viewed_by: null,
            downloaded_by: null,
            printed_by: null,
            viewed_at: null,
            downloaded_at: null,
            printed_at: null
          }
        ])
        .select()
        .single();

      if (fileError) throw fileError;

      // Fetch the complete file data with user information
      const { data: newFileWithUser, error: fetchError } = await supabase
        .from('eblotter_file')
        .select(`
          *,
          creator:created_by(name),
          updater:updated_by(name)
        `)
        .eq('blotter_id', fileData.blotter_id)
        .single();

      if (fetchError) throw fetchError;

      // Format the file data for the UI
      const formattedFile = {
        ...newFileWithUser,
        created_by: newFileWithUser.creator?.name || newFileWithUser.created_by,
        updated_by: newFileWithUser.updater?.name || newFileWithUser.updated_by
      };

      // Update the UI with the new file
      setFiles([formattedFile, ...files]);
      toast.success("File uploaded successfully");
      setIsAddingFile(false);
      setNewFileSummary("");
      setFileUpload(null);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || "Failed to upload file");
    }
  };

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
          .from('eblotter_file')
          .select(`
            *,
            creator:created_by(name),
            updater:updated_by(name),
            viewer:viewed_by(name),
            downloader:downloaded_by(name),
            printer:printed_by(name)
          `)
          .eq('folder_id', id)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });

        if (filesError) throw filesError;

        const formattedFiles = filesData.map(file => ({
          ...file,
          created_by: file.creator?.name || file.created_by,
          updated_by: file.updater?.name || file.updated_by,
          viewed_by: file.viewer?.name || file.viewed_by,
          downloaded_by: file.downloader?.name || file.downloaded_by,
          printed_by: file.printer?.name || file.printed_by
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

  // Filter files based on search query and type
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.incident_summary.toLowerCase().includes(searchQuery.toLowerCase());
    const fileExtension = file.path_file.split('.').pop()?.toLowerCase() || '';
    
    let matchesFilter = true;
    if (filter !== 'all') {
      const documentTypes = ['pdf', 'doc', 'docx', 'txt'];
      const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
      
      if (filter === 'document') {
        matchesFilter = documentTypes.includes(fileExtension);
      } else if (filter === 'image') {
        matchesFilter = imageTypes.includes(fileExtension);
      } else if (filter === 'other') {
        matchesFilter = !documentTypes.includes(fileExtension) && !imageTypes.includes(fileExtension);
      }
    }
    
    return matchesSearch && matchesFilter;
  });

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
          <span className="text-gray-900">{folderDetails?.title || `Folder ${id}`}</span>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Folder Content */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-1/2 rounded-lg" /> {/* Skeleton for folder title */}
              <Skeleton className="h-8 w-1/4 rounded-lg" /> {/* Skeleton for status badge */}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-medium font-poppins text-blue-900">
                {folderDetails?.title || `Folder ${id}`}
              </h1>
              <Badge 
                variant="outline" 
                className={getStatusBadgeClass(folderDetails?.status || 'unknown').class}
              >
                {getStatusBadgeClass(folderDetails?.status || 'unknown').label}
              </Badge>
            </>
          )}
        </div>

        {/* Loading Skeleton or Files Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div key={file.blotter_id} className="relative">
                <div
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  style={{ height: '420px', width: '100%', overflow: 'hidden' }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.path_file)}
                      <h3 className="font-medium text-gray-900">{file.title}</h3>
                    </div>
                    <button
                      className="p-2 rounded-full hover:bg-gray-200"
                      onClick={() => setShowOptions(prev => ({ ...prev, [file.blotter_id]: !prev[file.blotter_id] }))}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none mb-2 text-gray-600 line-clamp-3 whitespace-pre-line overflow-hidden text-ellipsis"
                  >
                    {file.incident_summary}
                  </div>
                  <FileOperations
                    file={file}
                    showPreview={previewStates[file.blotter_id] || false}
                    setShowPreview={(show) => {
                      setPreviewStates(prev => ({
                        ...prev,
                        [file.blotter_id]: show
                      }));
                    }}
                    showFileDialog={showFileDialog}
                    setShowFileDialog={setShowFileDialog}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    onFileUpdate={() => {
                      // Remove the file from the UI if it was archived
                      if (showFileDialog === 'archive') {
                        setFiles(files.filter(f => f.blotter_id !== selectedFile?.blotter_id));
                      } else {
                        // Refresh the files list
                        window.location.reload();
                      }
                    }}
                  />
                  <div className="text-sm text-gray-500 mt-2">
                    Added by {file.created_by} on {new Date(file.created_at).toLocaleDateString()}
                  </div>
                </div>

                {showOptions[file.blotter_id] && (
                  <div className="absolute top-10 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <button
                      className="block w-full text-left p-2 hover:bg-gray-100"
                      onClick={() => {
                        setSelectedFile(file);
                        setShowFileDialog('edit');
                        setShowOptions(prev => ({ ...prev, [file.blotter_id]: false }));
                      }}
                    >
                      <Pencil className="inline w-4 h-4 mr-2" /> Edit
                    </button>
                    <button
                      className="block w-full text-left p-2 hover:bg-gray-100"
                      onClick={() => {
                        setSelectedFile(file);
                        setShowFileDialog('archive');
                        setShowOptions(prev => ({ ...prev, [file.blotter_id]: false }));
                      }}
                    >
                      <Archive className="inline w-4 h-4 mr-2" /> Archive
                    </button>
                    <button
                      className="block w-full text-left p-2 hover:bg-gray-100"
                      onClick={() => {
                        setSelectedFile(file);
                        setShowFileDialog('details');
                        setShowOptions(prev => ({ ...prev, [file.blotter_id]: false }));
                      }}
                    >
                      <Eye className="inline w-4 h-4 mr-2" /> View Details
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            No files found in this folder
          </div>
        )}
      </div>

      {/* Add File Dialog */}
      <Dialog open={isAddingFile} onOpenChange={setIsAddingFile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New File</DialogTitle>
            <DialogDescription>
              Upload a file and provide its details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFileUpload} ref={(ref) => setFormRef(ref)}>
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 px-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Case Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Enter case title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry_num">Entry Number</Label>
                  <Input
                    id="entry_num"
                    name="entry_num"
                    placeholder="Enter entry number"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_reported">Date Reported</Label>
                    <Input
                      id="date_reported"
                      name="date_reported"
                      type="date"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_committed">Date Committed</Label>
                    <Input
                      id="date_committed"
                      name="date_committed"
                      type="date"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time_reported">Time Reported</Label>
                    <Input
                      id="time_reported"
                      name="time_reported"
                      type="time"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time_committed">Time Committed</Label>
                    <Input
                      id="time_committed"
                      name="time_committed"
                      type="time"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investigator">Investigator</Label>
                  <Input
                    id="investigator"
                    name="investigator"
                    placeholder="Enter investigator name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desk_officer">Desk Officer</Label>
                  <Input
                    id="desk_officer"
                    name="desk_officer"
                    placeholder="Enter desk officer name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signatory_name">Signatory Name</Label>
                  <Input
                    id="signatory_name"
                    name="signatory_name"
                    placeholder="Enter signatory name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="summary">Incident Summary</Label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
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
                    name="file"
                    type="file"
                    onChange={(e) => setFileUpload(e.target.files)}
                    required
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingFile(false);
                  setNewFileSummary("");
                  setFileUpload(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Upload File
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 