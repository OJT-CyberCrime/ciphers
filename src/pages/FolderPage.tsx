import { useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator} from "@/components/ui/breadcrumb";
import SearchBar from "@/Search";
import { 
  ChevronRight, 
  Plus, 
  FileText, 
  Image as ImageIcon, 
  FileArchive, 
  File,
  Download,
  X
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Cookies from "js-cookie";
import RichTextEditor from "@/components/RichTextEditor";

interface File {
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
}

interface Folder {
  folder_id: number;
  title: string;
  status: string;
  created_by: string;
  created_at: string;
}

// Add a helper function to get the file type icon
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

// Add a helper function to render file preview
const FilePreview = ({ file }: { file: File }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const ext = file.file_path.split('.').pop()?.toLowerCase() || '';
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
  const pdfType = ['pdf'];
  const officeTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

  // Get signed URL when component mounts or when showing preview
  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        // Check if file exists first
        const { data: checkData, error: checkError } = await supabase.storage
          .from('files')
          .list(`folder_${file.folder_id}`);

        if (checkError) throw checkError;

        const fileExists = checkData.some(f => f.name === file.file_path.split('/').pop());
        if (!fileExists) {
          toast.error('File no longer exists in storage');
          return;
        }

        const { data, error } = await supabase.storage
          .from('files')
          .createSignedUrl(file.file_path, 60 * 60 * 24); // 24 hour expiry

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (error) {
        console.error('Error getting signed URL:', error);
        toast.error('Error loading file preview. Please try refreshing the page.');
      }
    };

    if (showPreview || !signedUrl) {
      getSignedUrl();
    }

    // Refresh URL before expiry
    const refreshInterval = setInterval(() => {
      if (signedUrl) {
        getSignedUrl();
      }
    }, 1000 * 60 * 60 * 23); // Refresh every 23 hours

    return () => clearInterval(refreshInterval);
  }, [file.file_path, showPreview, file.folder_id]);

  // Function to get Google Docs Viewer URL
  const getGoogleDocsViewerUrl = (url: string) => {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  };

  // Function to handle file download with error checking
  const handleFileDownload = async () => {
    try {
      // Check if file exists first
      const { data: checkData, error: checkError } = await supabase.storage
        .from('files')
        .list(`folder_${file.folder_id}`);

      if (checkError) throw checkError;

      const fileExists = checkData.some(f => f.name === file.file_path.split('/').pop());
      if (!fileExists) {
        toast.error('File no longer exists in storage');
        return;
      }

      const { data, error } = await supabase.storage
        .from('files')
        .download(file.file_path);
      
      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.title + '.' + ext;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error downloading file. Please try again.');
    }
  };

  if (imageTypes.includes(ext)) {
    return (
      <>
        <div 
          className="mt-2 border rounded-lg overflow-hidden cursor-pointer"
          onClick={() => setShowPreview(true)}
        >
          {signedUrl ? (
            <img 
              src={signedUrl} 
              alt={file.title}
              className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 animate-pulse flex items-center justify-center">
              <ImageIcon className="text-gray-400" size={24} />
            </div>
          )}
        </div>

        {/* Image Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>{file.title}</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPreview(false)}
                >
                  <X size={20} />
                </Button>
              </div>
            </DialogHeader>
            {signedUrl && (
              <div className="relative aspect-video">
                <img 
                  src={signedUrl} 
                  alt={file.title}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={handleFileDownload}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Download Image
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Add download button below preview */}
        <div className="mt-2">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 w-full justify-center"
            onClick={handleFileDownload}
          >
            <Download size={16} />
            Download
          </Button>
        </div>
      </>
    );
  }

  if (pdfType.includes(ext) || officeTypes.includes(ext)) {
    return (
      <>
        <div 
          className="mt-2 cursor-pointer"
          onClick={() => setShowPreview(true)}
        >
          {signedUrl ? (
            <iframe
              src={officeTypes.includes(ext) ? getGoogleDocsViewerUrl(signedUrl) : signedUrl}
              className="w-full h-48 rounded-lg border hover:border-blue-300 transition-colors"
              title={file.title}
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 animate-pulse flex items-center justify-center rounded-lg border">
              <FileText className="text-gray-400" size={24} />
            </div>
          )}
        </div>

        {/* Document Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>{file.title}</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPreview(false)}
                >
                  <X size={20} />
                </Button>
              </div>
            </DialogHeader>
            {signedUrl && (
              <div className="flex-1 h-full">
                <iframe
                  src={officeTypes.includes(ext) ? getGoogleDocsViewerUrl(signedUrl) : signedUrl}
                  className="w-full h-full rounded-lg border"
                  title={file.title}
                />
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={handleFileDownload}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Add download button below preview */}
        <div className="mt-2">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 w-full justify-center"
            onClick={handleFileDownload}
          >
            <Download size={16} />
            Download
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-2">
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          onClick={async () => {
            try {
              const { data: checkData, error: checkError } = await supabase.storage
                .from('files')
                .list(`folder_${file.folder_id}`);

              if (checkError) throw checkError;

              const fileExists = checkData.some(f => f.name === file.file_path.split('/').pop());
              if (!fileExists) {
                toast.error('File no longer exists in storage');
                return;
              }

              const { data, error } = await supabase.storage
                .from('files')
                .download(file.file_path);
              
              if (error) throw error;
              
              // Open file in new tab
              const url = URL.createObjectURL(data);
              window.open(url, '_blank');
              URL.revokeObjectURL(url);
            } catch (error) {
              console.error('Error viewing file:', error);
              toast.error('Error viewing file. Please try again.');
            }
          }}
        >
          <FileArchive size={16} />
          View File
        </Button>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          onClick={handleFileDownload}
        >
          <Download size={16} />
          Download
        </Button>
      </div>
    </div>
  );
};

// Add this helper function to strip HTML tags
const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

const FolderPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [files, setFiles] = useState<File[]>([]);
  const [folderDetails, setFolderDetails] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState("");
  const [newFileSummary, setNewFileSummary] = useState("");
  const [fileUpload, setFileUpload] = useState<FileList | null>(null);

  // Get the current location to determine the previous page
  const location = useLocation();
  const previousPage = location.state?.from || "/incident-report";
  const previousPageName = location.state?.fromName || "Incident Reports";

  // Handle file upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !fileUpload?.[0]) return;

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
        .from('files')
        .insert([
          {
            folder_id: id,
            title: newFileTitle,
            incident_summary: cleanSummary, // Use the cleaned text
            file_path: filePath,
            created_by: userData2.user_id,
            is_archived: false,
            public_url: publicUrl
          }
        ])
        .select()
        .single();

      if (fileError) throw fileError;

      // Fetch the complete file data with user information
      const { data: newFileWithUser, error: fetchError } = await supabase
        .from('files')
        .select(`
          *,
          creator:created_by(name),
          updater:updated_by(name)
        `)
        .eq('file_id', fileData.file_id)
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
      setNewFileTitle("");
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
          .from('files')
          .select(`
            *,
            creator:created_by(name),
            updater:updated_by(name)
          `)
          .eq('folder_id', id)
          .eq('is_archived', false)
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

  // Filter files based on search query and type
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.incident_summary.toLowerCase().includes(searchQuery.toLowerCase());
    const fileExtension = file.file_path.split('.').pop()?.toLowerCase() || '';
    
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
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.file_id}
                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  {getFileIcon(file.file_path)}
                  <h3 className="font-medium text-gray-900">{file.title}</h3>
                </div>
                <div 
                  className="prose prose-sm max-w-none mb-2 text-gray-600 line-clamp-3 whitespace-pre-line"
                >
                  {file.incident_summary}
                </div>
                <FilePreview file={file} />
                <div className="text-sm text-gray-500 mt-2">
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

      {/* Add File Dialog */}
      <Dialog open={isAddingFile} onOpenChange={setIsAddingFile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New File</DialogTitle>
            <DialogDescription>
              Upload a file and provide its details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFileUpload}>
            <div className="space-y-4">
              <div className="space-y-2">
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
                <Label htmlFor="summary">Incident Summary</Label>
                <RichTextEditor
                  content={newFileSummary}
                  onChange={setNewFileSummary}
                />
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
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingFile(false);
                  setNewFileTitle("");
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
};

export default FolderPage; 