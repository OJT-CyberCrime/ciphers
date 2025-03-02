import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
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

interface Extraction {
  extraction_id: number;
  case_title: string;
  control_num: number;
  complainant: string;
  assisted_by: string;
  accompanied_by: string;
  witnesses: string;
  respondent: string;
  investigator: string;
  contact_num: string;
  fb_account: string;
  station_unit: string;
  date_release: string;
  signatories: string;
  incident_summary: string;
  file_path: string;
  public_url: string;
  is_archived: boolean;
  created_by: string;
  updated_by: string | null;
  viewed_by: string | null;
  downloaded_by: string | null;
  printed_by: string | null;
  created_at: string;
  updated_at: string | null;
  viewed_at: string | null;
  downloaded_at: string | null;
  printed_at: string | null;
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

export default function extractionFile() {
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [files, setFiles] = useState<Extraction[]>([]);
  const [folderDetails, setFolderDetails] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFile, setNewFile] = useState<Partial<Extraction>>({
    case_title: "",
    control_num: 0,
    complainant: "",
    assisted_by: "",
    accompanied_by: "",
    witnesses: "",
    respondent: "",
    investigator: "",
    contact_num: "",
    fb_account: "",
    station_unit: "",
    date_release: new Date().toISOString().split('T')[0],
    signatories: "",
    incident_summary: "",
  });
  const [fileUpload, setFileUpload] = useState<FileList | null>(null);
  const [selectedFile, setSelectedFile] = useState<Extraction | null>(null);
  const [showFileDialog, setShowFileDialog] = useState<'edit' | 'archive' | 'details' | null>(null);
  const [previewStates, setPreviewStates] = useState<{ [key: number]: boolean }>({});
  const [showOptions, setShowOptions] = useState<{ [key: number]: boolean }>({});
  const navigate = useNavigate();
  const location = useLocation();
  const previousPage = "/extraction"; // Path to extraction page
  const previousPageName = "Certification of Extraction"; // Name for breadcrumb

  // Handle file upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !fileUpload?.[0]) return;

    try {
      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      
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
      const filePath = `extractions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      // Create extraction record
      const { data: extractionData, error: extractionError } = await supabase
        .from('extraction')
        .insert([
          {
            ...newFile,
            file_path: filePath,
            public_url: publicUrl,
            is_archived: false,
            created_by: userData2.user_id,
            folder_id: id
          }
        ])
        .select(`
          *,
          creator:created_by(name),
          updater:updated_by(name),
          viewer:viewed_by(name),
          downloader:downloaded_by(name),
          printer:printed_by(name)
        `)
        .single();

      if (extractionError) throw extractionError;

      setFiles([extractionData, ...files]);
      toast.success("Certificate file added successfully");
      setIsAddingFile(false);
      setNewFile({
        case_title: "",
        control_num: 0,
        complainant: "",
        assisted_by: "",
        accompanied_by: "",
        witnesses: "",
        respondent: "",
        investigator: "",
        contact_num: "",
        fb_account: "",
        station_unit: "",
        date_release: new Date().toISOString().split('T')[0],
        signatories: "",
        incident_summary: "",
      });
      setFileUpload(null);
    } catch (error: any) {
      console.error('Error adding certificate file:', error);
      toast.error(error.message || "Failed to add certificate file");
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

        // Fetch extraction files in the folder
        const { data: filesData, error: filesError } = await supabase
          .from('extraction')
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

  // Filter files based on search query
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.case_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.incident_summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search certificates..."
        />

        <Button
          onClick={() => setIsAddingFile(true)}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
        >
          <Plus size={16} /> Add Certificate
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
            <Skeleton className="h-8 w-1/2 rounded-lg" />
          ) : (
            <h1 className="text-2xl font-medium font-poppins text-blue-900">
              {folderDetails?.title || `Folder ${id}`}
            </h1>
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
              <div key={file.extraction_id} className="relative">
                <div
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  style={{ height: '420px', width: '100%', overflow: 'hidden' }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.file_path)}
                      <h3 className="font-medium text-gray-900">{file.case_title}</h3>
                    </div>
                    <button
                      className="p-2 rounded-full hover:bg-gray-200"
                      onClick={() => setShowOptions(prev => ({ ...prev, [file.extraction_id]: !prev[file.extraction_id] }))}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none mb-2 text-gray-600">
                    <p><strong>Control #:</strong> {file.control_num}</p>
                    <p><strong>Complainant:</strong> {file.complainant}</p>
                    <p><strong>Respondent:</strong> {file.respondent}</p>
                    <p><strong>Release Date:</strong> {new Date(file.date_release).toLocaleDateString()}</p>
                  </div>
                  <FileOperations
                    file={file}
                    showPreview={previewStates[file.extraction_id] || false}
                    setShowPreview={(show) => {
                      setPreviewStates(prev => ({
                        ...prev,
                        [file.extraction_id]: show
                      }));
                    }}
                    showFileDialog={showFileDialog}
                    setShowFileDialog={setShowFileDialog}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    onFileUpdate={() => {
                      if (showFileDialog === 'archive') {
                        setFiles(files.filter(f => f.extraction_id !== selectedFile?.extraction_id));
                      } else {
                        window.location.reload();
                      }
                    }}
                  />
                  <div className="text-sm text-gray-500 mt-2">
                    Added by {file.created_by} on {new Date(file.created_at).toLocaleDateString()}
                  </div>
                </div>

                {showOptions[file.extraction_id] && (
                  <div className="absolute top-10 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <button
                      className="block w-full text-left p-2 hover:bg-gray-100"
                      onClick={() => {
                        setSelectedFile(file);
                        setShowFileDialog('edit');
                        setShowOptions(prev => ({ ...prev, [file.extraction_id]: false }));
                      }}
                    >
                      <Pencil className="inline w-4 h-4 mr-2" /> Edit
                    </button>
                    <button
                      className="block w-full text-left p-2 hover:bg-gray-100"
                      onClick={() => {
                        setSelectedFile(file);
                        setShowFileDialog('archive');
                        setShowOptions(prev => ({ ...prev, [file.extraction_id]: false }));
                      }}
                    >
                      <Archive className="inline w-4 h-4 mr-2" /> Archive
                    </button>
                    <button
                      className="block w-full text-left p-2 hover:bg-gray-100"
                      onClick={() => {
                        setSelectedFile(file);
                        setShowFileDialog('details');
                        setShowOptions(prev => ({ ...prev, [file.extraction_id]: false }));
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
            No certificates found in this folder
          </div>
        )}
      </div>

      {/* Add File Dialog */}
      <Dialog open={isAddingFile} onOpenChange={setIsAddingFile}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Certificate of Extraction</DialogTitle>
            <DialogDescription>
              Enter the details for the new certificate.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="case_title">Case Title</Label>
                <Input
                  id="case_title"
                  value={newFile.case_title}
                  onChange={(e) => setNewFile({ ...newFile, case_title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="control_num">Control Number</Label>
                <Input
                  id="control_num"
                  type="number"
                  value={newFile.control_num}
                  onChange={(e) => setNewFile({ ...newFile, control_num: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complainant">Complainant</Label>
                <Input
                  id="complainant"
                  value={newFile.complainant}
                  onChange={(e) => setNewFile({ ...newFile, complainant: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assisted_by">Assisted By</Label>
                <Input
                  id="assisted_by"
                  value={newFile.assisted_by}
                  onChange={(e) => setNewFile({ ...newFile, assisted_by: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accompanied_by">Accompanied By</Label>
                <Input
                  id="accompanied_by"
                  value={newFile.accompanied_by}
                  onChange={(e) => setNewFile({ ...newFile, accompanied_by: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="witnesses">Witnesses</Label>
                <Input
                  id="witnesses"
                  value={newFile.witnesses}
                  onChange={(e) => setNewFile({ ...newFile, witnesses: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="respondent">Respondent</Label>
                <Input
                  id="respondent"
                  value={newFile.respondent}
                  onChange={(e) => setNewFile({ ...newFile, respondent: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investigator">Investigator</Label>
                <Input
                  id="investigator"
                  value={newFile.investigator}
                  onChange={(e) => setNewFile({ ...newFile, investigator: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_num">Contact Number</Label>
                <Input
                  id="contact_num"
                  value={newFile.contact_num}
                  onChange={(e) => setNewFile({ ...newFile, contact_num: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fb_account">Facebook Account</Label>
                <Input
                  id="fb_account"
                  value={newFile.fb_account}
                  onChange={(e) => setNewFile({ ...newFile, fb_account: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="station_unit">Station/Unit</Label>
                <Input
                  id="station_unit"
                  value={newFile.station_unit}
                  onChange={(e) => setNewFile({ ...newFile, station_unit: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_release">Date of Release</Label>
                <Input
                  id="date_release"
                  type="date"
                  value={newFile.date_release}
                  onChange={(e) => setNewFile({ ...newFile, date_release: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatories">Signatories</Label>
                <Input
                  id="signatories"
                  value={newFile.signatories}
                  onChange={(e) => setNewFile({ ...newFile, signatories: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="incident_summary">Incident Summary</Label>
                <RichTextEditor
                  content={newFile.incident_summary || ""}
                  onChange={(content) => setNewFile({ ...newFile, incident_summary: content })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="file">Upload File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setFileUpload(e.target.files)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingFile(false);
                  setNewFile({
                    case_title: "",
                    control_num: 0,
                    complainant: "",
                    assisted_by: "",
                    accompanied_by: "",
                    witnesses: "",
                    respondent: "",
                    investigator: "",
                    contact_num: "",
                    fb_account: "",
                    station_unit: "",
                    date_release: new Date().toISOString().split('T')[0],
                    signatories: "",
                    incident_summary: "",
                  });
                  setFileUpload(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Add Certificate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 