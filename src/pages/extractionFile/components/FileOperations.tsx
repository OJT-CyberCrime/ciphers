import { Button } from "@/components/ui/button";
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
import { supabase } from "@/utils/supa";
import Cookies from "js-cookie";
import {
  Download,
  X,
  Printer,
  File,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import RichTextEditor from "@/components/RichTextEditor";

interface Extraction {
  extraction_id: number;
  case_title: string;
  control_num: string;
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
  folder_id: number;
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

interface FileOperationsProps {
  file: Extraction;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  showFileDialog: 'edit' | 'archive' | 'details' | null;
  setShowFileDialog: (dialog: 'edit' | 'archive' | 'details' | null) => void;
  onFileUpdate: () => void;
  selectedFile?: Extraction | null;
  setSelectedFile: (file: Extraction | null) => void;
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

export default function FileOperations({
  file,
  showPreview,
  setShowPreview,
  showFileDialog,
  setShowFileDialog,
  onFileUpdate,
  selectedFile,
  setSelectedFile
}: FileOperationsProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Ensure we have valid file data
  if (!file || !file.file_path) {
    console.error('Invalid file data:', file);
    return null;
  }

  // Use currentFile only for file operations and details dialog
  const currentFile = showFileDialog ? (selectedFile || file) : file;
  const ext = currentFile.file_path.split('.').pop()?.toLowerCase() || '';
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
  const pdfType = ['pdf'];
  const officeTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

  // Get signed URL on component mount and when showing preview
  useEffect(() => {
    const getSignedUrl = async () => {
      // Add null check for file_path
      if (!file?.file_path || !file?.folder_id) {
        setError('Invalid file data');
        return;
      }
      
      try {
        setIsLoading(true);
        setError(undefined);

        // Check if file exists first
        const { data: checkData, error: checkError } = await supabase.storage
          .from('files')
          .list(`folder_${file.folder_id}`);

        if (checkError) throw checkError;

        const fileExists = checkData.some(f => f.name === file.file_path.split('/').pop());
        if (!fileExists) {
          throw new Error('File no longer exists in storage');
        }

        const { data, error } = await supabase.storage
          .from('files')
          .createSignedUrl(file.file_path, 60 * 60 * 24); // 24 hour expiry

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (error: any) {
        console.error('Error getting signed URL:', error);
        setError(error.message || 'Error loading file preview');
        setSignedUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (showPreview || imageTypes.includes(ext) || pdfType.includes(ext) || officeTypes.includes(ext)) {
      getSignedUrl();
    }

    // Cleanup function
    return () => {
      if (!showPreview) {
        setSignedUrl(null);
        setError(undefined);
      }
    };
  }, [file.file_path, file.folder_id, showPreview, ext]);

  // Track file view when preview is opened
  useEffect(() => {
    const trackView = async () => {
      if (showPreview) {
        await handleFileView();
      }
    };
    trackView();
  }, [showPreview]);

  // Function to handle file view tracking
  const handleFileView = async () => {
    try {
      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      
      // Get the user's ID and name from the users table using their email
      const { data: userData2, error: userError } = await supabase
        .from('users')
        .select('user_id, name')
        .eq('email', userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error('User not found');

      // Update the file's viewed_by and viewed_at
      const { error: updateError } = await supabase
        .from('extraction')
        .update({
          viewed_by: userData2.user_id,
          viewed_at: new Date().toISOString()
        })
        .eq('extraction_id', currentFile.extraction_id);

      if (updateError) throw updateError;

      // Update the local state with the new user name
      currentFile.viewed_by = userData2.user_id;
      currentFile.viewed_at = new Date().toISOString();
    } catch (error) {
      console.error('Error updating view tracking:', error);
    }
  };

  // Function to handle file download
  const handleFileDownload = async () => {
    try {
      // Check if file exists first
      const { data: checkData, error: checkError } = await supabase.storage
        .from('files')
        .list(`folder_${currentFile.folder_id}`);

      if (checkError) throw checkError;

      const fileExists = checkData.some(f => f.name === currentFile.file_path.split('/').pop());
      if (!fileExists) {
        toast.error('File no longer exists in storage');
        return;
      }

      // Get user data from cookies
      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      
      // Get the user's ID and name from the users table using their email
      const { data: userData2, error: userError } = await supabase
        .from('users')
        .select('user_id, name')
        .eq('email', userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error('User not found');

      // Update the file's downloaded_by and downloaded_at
      const { error: updateError } = await supabase
        .from('extraction')
        .update({
          downloaded_by: userData2.user_id,
          downloaded_at: new Date().toISOString()
        })
        .eq('extraction_id', currentFile.extraction_id);

      if (updateError) throw updateError;

      // Update the local state with the new user name
      currentFile.downloaded_by = userData2.user_id;
      currentFile.downloaded_at = new Date().toISOString();

      // Download the file
      const { data, error } = await supabase.storage
        .from('files')
        .download(currentFile.file_path);
      
      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFile.case_title + '.' + ext;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('File downloaded successfully');
      onFileUpdate();
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast.error(error.message || 'Error downloading file. Please try again.');
    }
  };

  // Function to handle file printing
  const handleFilePrint = async () => {
    try {
      // Check if file exists first
      const { data: checkData, error: checkError } = await supabase.storage
        .from('files')
        .list(`folder_${currentFile.folder_id}`);

      if (checkError) throw checkError;

      const fileExists = checkData.some(f => f.name === currentFile.file_path.split('/').pop());
      if (!fileExists) {
        toast.error('File no longer exists in storage');
        return;
      }

      // Get user data from cookies
      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      
      // Get the user's ID and name from the users table using their email
      const { data: userData2, error: userError } = await supabase
        .from('users')
        .select('user_id, name')
        .eq('email', userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error('User not found');

      // Update the file's printed_by and printed_at
      const { error: updateError } = await supabase
        .from('extraction')
        .update({
          printed_by: userData2.user_id,
          printed_at: new Date().toISOString()
        })
        .eq('extraction_id', currentFile.extraction_id);

      if (updateError) throw updateError;

      // Update the local state with the new user name
      currentFile.printed_by = userData2.user_id;
      currentFile.printed_at = new Date().toISOString();

      // Get the signed URL for the file
      const { data: urlData, error: urlError } = await supabase.storage
        .from('files')
        .createSignedUrl(currentFile.file_path, 60 * 60); // 1 hour expiry

      if (urlError) throw urlError;

      // Open Google Docs viewer in a new tab
      const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(urlData.signedUrl)}&embedded=false`;
      window.open(googleDocsUrl, '_blank');

      toast.success('Opening file for printing...');
      onFileUpdate();
    } catch (error: any) {
      console.error('Error preparing file for print:', error);
      toast.error(error.message || 'Error preparing file for print. Please try again.');
    }
  };

  // Function to handle file archiving
  const handleArchiveFile = async () => {
    try {
      const fileToArchive = selectedFile || file;
      const { error } = await supabase
        .from('extraction')
        .update({ is_archived: true })
        .eq('extraction_id', fileToArchive.extraction_id);

      if (error) throw error;
      toast.success('File archived successfully');
      onFileUpdate(); // Refresh the files list
    } catch (error: any) {
      console.error('Error archiving file:', error);
      toast.error(error.message || 'Failed to archive file');
    }
  };

  // Function to handle file editing
  const handleEditFile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const fileToEdit = selectedFile || file;
      const formData = new FormData(e.currentTarget);
      const case_title = formData.get('case_title') as string;
      const control_num = formData.get('control_num') as string;
      const complainant = formData.get('complainant') as string;
      const assisted_by = formData.get('assisted_by') as string;
      const accompanied_by = formData.get('accompanied_by') as string;
      const witnesses = formData.get('witnesses') as string;
      const respondent = formData.get('respondent') as string;
      const investigator = formData.get('investigator') as string;
      const contact_num = formData.get('contact_num') as string;
      const fb_account = formData.get('fb_account') as string;
      const station_unit = formData.get('station_unit') as string;
      const date_release = formData.get('date_release') as string;
      const signatories = formData.get('signatories') as string;
      const incident_summary = formData.get('incident_summary') as string;
      const uploadedFile = (formData.get('file') as unknown) as globalThis.File | null;

      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      
      // Get the user's ID from the users table using their email
      const { data: userData2, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error('User not found');

      let filePath = fileToEdit.file_path;
      let publicUrl = fileToEdit.public_url;
      
      // Only handle file upload if a new file was actually uploaded
      if (uploadedFile && uploadedFile instanceof globalThis.File && uploadedFile.size > 0) {
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const newFilePath = `folder_${fileToEdit.folder_id}/${fileName}`;

        // Delete the old file first
        const { error: deleteError } = await supabase.storage
          .from('files')
          .remove([fileToEdit.file_path]);

        if (deleteError) throw deleteError;

        // Upload the new file
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(newFilePath, uploadedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        
        // Update file path and get new public URL
        filePath = newFilePath;
        const { data: { publicUrl: newPublicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(newFilePath);
        publicUrl = newPublicUrl;
      }

      // Update the file record
      const { error: updateError } = await supabase
        .from('extraction')
        .update({
          case_title,
          control_num,
          complainant,
          assisted_by,
          accompanied_by,
          witnesses,
          respondent,
          investigator,
          contact_num,
          fb_account,
          station_unit,
          date_release,
          signatories,
          incident_summary,
          ...(uploadedFile && uploadedFile instanceof globalThis.File && uploadedFile.size > 0 ? {
            file_path: filePath,
            public_url: publicUrl
          } : {}),
          updated_by: userData2.user_id,
          updated_at: new Date().toISOString()
        })
        .eq('extraction_id', fileToEdit.extraction_id);

      if (updateError) throw updateError;

      toast.success('File updated successfully');
      setShowFileDialog(null);
      onFileUpdate(); // Refresh the files list
    } catch (error: any) {
      console.error('Error updating file:', error);
      toast.error(error.message || 'Failed to update file');
    }
  };

  // Render preview content
  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          <p className="mt-4 text-gray-600">Loading preview...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <FileText size={48} className="text-red-400 mb-4" />
          <p className="text-red-600 mb-4">
            Error loading preview: {error}
            <br />
            Please try refreshing the page.
          </p>
        </div>
      );
    }

    if (!signedUrl) return null;

    if (imageTypes.includes(ext)) {
      return (
        <div className="relative aspect-video">
          <img 
            src={signedUrl} 
            alt={currentFile.case_title}
            className="w-full h-full object-contain"
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }

    // For PDFs and Office documents, use Google Docs viewer
    if (pdfType.includes(ext) || officeTypes.includes(ext)) {
      return (
        <div className="w-full h-[calc(80vh-8rem)]">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true&rm=minimal`}
            className="w-full h-full border-none"
            title={currentFile.case_title}
            onError={() => setError('Failed to load document preview')}
          />
        </div>
      );
    }

    // For other file types
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText size={48} className="text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">
          This file type cannot be previewed.
          <br />
          Please use the buttons below to download or print the file.
        </p>
      </div>
    );
  };

  // Render card preview
  const renderCardPreview = () => {
    if (isLoading) {
      return (
        <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
          <span className="mt-2 text-sm text-gray-600">Loading preview...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border">
          {getFileIcon(currentFile.file_path)}
          <span className="mt-2 text-sm text-red-600">Error loading preview</span>
          <span className="text-xs text-gray-500">{ext.toUpperCase()}</span>
        </div>
      );
    }

    if (!signedUrl) {
      return (
        <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border">
          {getFileIcon(currentFile.file_path)}
          <span className="mt-2 text-sm text-gray-600">Preview not available</span>
          <span className="text-xs text-gray-500">{ext.toUpperCase()}</span>
        </div>
      );
    }

    if (imageTypes.includes(ext)) {
      return (
        <div className="w-full h-48 bg-gray-100 rounded-lg border overflow-hidden">
          <img 
            src={signedUrl || undefined} 
            alt={currentFile.case_title}
            className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
            onClick={() => {
              setSelectedFile(currentFile);
              setShowPreview(true);
            }}
          />
        </div>
      );
    }

    // For PDFs and Office documents
    if (pdfType.includes(ext) || officeTypes.includes(ext)) {
      return (
        <div className="w-full h-48 bg-white rounded-lg border overflow-hidden relative group">
          <div className="w-full h-full overflow-auto">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true&rm=minimal`}
              className="w-full h-[400px] border-none"
              title={currentFile.case_title}
            />
          </div>
          {/* Expand button overlay */}
          <div className="absolute top-4 right-4 z-10">
            <Button
              size="default"
              variant="secondary"
              className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
              onClick={() => {
                setSelectedFile(currentFile);
                setShowPreview(true);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/>
              </svg>
            </Button>
          </div>
        </div>
      );
    }

    // For other file types
    return (
      <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border hover:border-blue-300 transition-colors cursor-pointer"
           onClick={() => {
             setSelectedFile(currentFile);
             setShowPreview(true);
           }}>
        {getFileIcon(currentFile.file_path)}
        <span className="mt-2 text-sm text-gray-600">Click to preview</span>
        <span className="text-xs text-gray-500">{ext.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <>
      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onOpenChange={(open) => {
          setShowPreview(open);
          if (!open) {
            setSelectedFile(null);
          }
        }}
      >
        <DialogContent className="max-w-6xl w-4/5 h-[80vh] overflow-y-auto bg-white shadow-lg rounded-lg font-poppins scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="text-2xl font-semibold">{currentFile.case_title}</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {ext.toUpperCase()} Document • Added by {currentFile.created_by}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setSelectedFile(null);
                  setShowPreview(false);
                }}
              >
                <X size={20} />
              </Button>
            </div>
          </DialogHeader>

          {/* Scrollable Preview Content */}
          <div className="flex-1 overflow-auto rounded-lg border max-h-[calc(80vh-150px)] p-4 bg-gray-50">
            {renderPreviewContent()}
          </div>

          <DialogFooter className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {currentFile.viewed_at && (
                <span>Last viewed: {new Date(currentFile.viewed_at).toLocaleString()}</span>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Operations Dialog */}
      <Dialog
        open={showFileDialog !== null}
        onOpenChange={() => setShowFileDialog(null)}  
      >
        <DialogContent className="p-6 w-[90%] max-w-2xl h-[90%] max-h-[80vh] overflow-y-auto bg-white shadow-lg rounded-lg font-poppins scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {showFileDialog === 'edit' ? 'Edit File' :
               showFileDialog === 'archive' ? 'Archive File' :
               showFileDialog === 'details' ? 'File Details' : ''}
            </DialogTitle>
          </DialogHeader>

          {/* Add a line after the dialog header */}
          <hr className="my-1 border-gray-300" />

          <div className="space-y-4">
            {showFileDialog === 'edit' && (
              <form onSubmit={handleEditFile} id="editForm">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="case_title">Case Title</Label>
                        <Input
                          id="case_title"
                          name="case_title"
                          defaultValue={(selectedFile || file).case_title}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="control_num">Control Number</Label>
                        <Input
                          id="control_num"
                          name="control_num"
                          defaultValue={(selectedFile || file).control_num}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="complainant">Complainant</Label>
                        <Input
                          id="complainant"
                          name="complainant"
                          defaultValue={(selectedFile || file).complainant}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assisted_by">Assisted By</Label>
                        <Input
                          id="assisted_by"
                          name="assisted_by"
                          defaultValue={(selectedFile || file).assisted_by}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accompanied_by">Accompanied By</Label>
                        <Input
                          id="accompanied_by"
                          name="accompanied_by"
                          defaultValue={(selectedFile || file).accompanied_by}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="witnesses">Witnesses</Label>
                        <Input
                          id="witnesses"
                          name="witnesses"
                          defaultValue={(selectedFile || file).witnesses}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="respondent">Respondent</Label>
                        <Input
                          id="respondent"
                          name="respondent"
                          defaultValue={(selectedFile || file).respondent}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="investigator">Investigator</Label>
                        <Input
                          id="investigator"
                          name="investigator"
                          defaultValue={(selectedFile || file).investigator}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_num">Contact Number</Label>
                        <Input
                          id="contact_num"
                          name="contact_num"
                          defaultValue={(selectedFile || file).contact_num}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fb_account">Facebook Account</Label>
                        <Input
                          id="fb_account"
                          name="fb_account"
                          defaultValue={(selectedFile || file).fb_account}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="station_unit">Station/Unit</Label>
                        <Input
                          id="station_unit"
                          name="station_unit"
                          defaultValue={(selectedFile || file).station_unit}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_release">Date of Release</Label>
                        <Input
                          id="date_release"
                          name="date_release"
                          type="date"
                          defaultValue={(selectedFile || file).date_release}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signatories">Signatories</Label>
                        <Input
                          id="signatories"
                          name="signatories"
                          defaultValue={(selectedFile || file).signatories}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incident_summary">Incident Summary</Label>
                      <Textarea
                        id="incident_summary"
                        name="incident_summary"
                        defaultValue={(selectedFile || file).incident_summary}
                        required
                        className="h-32 resize-none border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="file">Update File (Optional)</Label>
                      <Input
                        id="file"
                        name="file"
                        type="file"
                      />
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setShowFileDialog(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}

            {showFileDialog === 'archive' && (
              <div className="space-y-4">
                <DialogDescription className="text-gray-600">
                  Are you sure you want to archive this file? 
                  This will remove it from the active files list.
                </DialogDescription>
                <DialogFooter className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowFileDialog(null)} className="mr-2">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={async () => {
                      await handleArchiveFile();
                      setShowFileDialog(null);
                    }}
                  >
                    Yes, Archive
                  </Button>
                </DialogFooter>
              </div>
            )}

            {showFileDialog === 'details' && (
              <div className="space-y-4">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Case Title</Label>
                        <p className="text-gray-900">{currentFile.case_title}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Control Number</Label>
                        <p className="text-gray-900">{currentFile.control_num}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Complainant</Label>
                        <p className="text-gray-900">{currentFile.complainant}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Assisted By</Label>
                        <p className="text-gray-900">{currentFile.assisted_by}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Accompanied By</Label>
                        <p className="text-gray-900">{currentFile.accompanied_by}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Witnesses</Label>
                        <p className="text-gray-900">{currentFile.witnesses}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Respondent</Label>
                        <p className="text-gray-900">{currentFile.respondent}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Investigator</Label>
                        <p className="text-gray-900">{currentFile.investigator}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Contact Number</Label>
                        <p className="text-gray-900">{currentFile.contact_num}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Facebook Account</Label>
                        <p className="text-gray-900">{currentFile.fb_account}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Station/Unit</Label>
                        <p className="text-gray-900">{currentFile.station_unit}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Date of Release</Label>
                        <p className="text-gray-900">{currentFile.date_release}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-blue-900">Signatories</Label>
                        <p className="text-gray-900">{currentFile.signatories}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-medium text-blue-900">Incident Summary</Label>
                      <div className="p-3 bg-gray-50 rounded-md border border-gray-200 min-h-[8rem] whitespace-pre-wrap">
                        {currentFile.incident_summary}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-medium text-blue-900">File Activity</Label>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            Created: <span className="text-gray-900">
                              {new Date(currentFile.created_at).toLocaleString()} by{" "}
                              <span className="text-blue-900">{currentFile.created_by}</span>
                            </span>
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            Last updated: {currentFile.updated_at ? (
                              <span className="text-gray-900">
                                {new Date(currentFile.updated_at).toLocaleString()} by{" "}
                                <span className="text-blue-900">{currentFile.updated_by}</span>
                              </span>
                            ) : 'Never'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            Last viewed: {currentFile.viewed_at ? (
                              <span className="text-gray-900">
                                {new Date(currentFile.viewed_at).toLocaleString()} by{" "}
                                <span className="text-blue-900">{currentFile.viewed_by}</span>
                              </span>
                            ) : 'Never'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            Last downloaded: {currentFile.downloaded_at ? (
                              <span className="text-gray-900">
                                {new Date(currentFile.downloaded_at).toLocaleString()} by{" "}
                                <span className="text-blue-900">{currentFile.downloaded_by}</span>
                              </span>
                            ) : 'Never'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            Last printed: {currentFile.printed_at ? (
                              <span className="text-gray-900">
                                {new Date(currentFile.printed_at).toLocaleString()} by{" "}
                                <span className="text-blue-900">{currentFile.printed_by}</span>
                              </span>
                            ) : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="flex justify-end">
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => {
                      setSelectedFile(null);
                      setShowFileDialog(null);
                    }}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Preview */}
      <div className="mt-2 relative">
        {renderCardPreview()}
      </div>

      {/* Download and Print buttons */}
      <div className="flex gap-2 justify-center">
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          onClick={handleFileDownload}
        >
          <Download size={16} />
          Download
        </Button>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          onClick={handleFilePrint}
        >
          <Printer size={16} />
          Print
        </Button>
      </div>
    </>
  );
} 