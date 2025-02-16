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
import RichTextEditor from "@/components/RichTextEditor";
import {
  Download,
  X,
  Eye,
  Printer,
  File,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useState, useEffect } from "react";

interface FileRecord {
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
  investigator: string;
  desk_officer: string;
  viewed_by: string | null;
  downloaded_by: string | null;
  printed_by: string | null;
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
  file: FileRecord;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  showFileDialog: 'edit' | 'archive' | 'details' | null;
  setShowFileDialog: (dialog: 'edit' | 'archive' | 'details' | null) => void;
  onFileUpdate: () => void;
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
  onFileUpdate
}: FileOperationsProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const ext = file.file_path.split('.').pop()?.toLowerCase() || '';
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
  const pdfType = ['pdf'];
  const officeTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

  // Get signed URL on component mount and when showing preview
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

    getSignedUrl();
  }, [file.file_path, file.folder_id]);

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
        .from('files')
        .update({
          viewed_by: userData2.user_id,
          viewed_at: new Date().toISOString()
        })
        .eq('file_id', file.file_id);

      if (updateError) throw updateError;

      // Update the local state with the new user name
      file.viewed_by = userData2.name;
      file.viewed_at = new Date().toISOString();
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
        .list(`folder_${file.folder_id}`);

      if (checkError) throw checkError;

      const fileExists = checkData.some(f => f.name === file.file_path.split('/').pop());
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
        .from('files')
        .update({
          downloaded_by: userData2.user_id,
          downloaded_at: new Date().toISOString()
        })
        .eq('file_id', file.file_id);

      if (updateError) throw updateError;

      // Update the local state with the new user name
      file.downloaded_by = userData2.name;
      file.downloaded_at = new Date().toISOString();

      // Download the file
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

      toast.success('File downloaded successfully');
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
        .list(`folder_${file.folder_id}`);

      if (checkError) throw checkError;

      const fileExists = checkData.some(f => f.name === file.file_path.split('/').pop());
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
        .from('files')
        .update({
          printed_by: userData2.user_id,
          printed_at: new Date().toISOString()
        })
        .eq('file_id', file.file_id);

      if (updateError) throw updateError;

      // Update the local state with the new user name
      file.printed_by = userData2.name;
      file.printed_at = new Date().toISOString();

      // Get the signed URL for the file
      const { data: urlData, error: urlError } = await supabase.storage
        .from('files')
        .createSignedUrl(file.file_path, 60 * 60); // 1 hour expiry

      if (urlError) throw urlError;

      // Open Google Docs viewer in a new tab
      const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(urlData.signedUrl)}&embedded=false`;
      window.open(googleDocsUrl, '_blank');

      toast.success('Opening file for printing...');
    } catch (error: any) {
      console.error('Error preparing file for print:', error);
      toast.error(error.message || 'Error preparing file for print. Please try again.');
    }
  };

  // Function to handle file archiving
  const handleArchiveFile = async () => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_archived: true })
        .eq('file_id', file.file_id);

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
      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;
      const investigator = formData.get('investigator') as string;
      const deskOfficer = formData.get('desk_officer') as string;
      const summary = formData.get('summary') as string;
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

      let filePath = file.file_path;
      let publicUrl = file.public_url;
      
      // Only handle file upload if a new file was actually uploaded
      if (uploadedFile && uploadedFile instanceof globalThis.File && uploadedFile.size > 0) {
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const newFilePath = `folder_${file.folder_id}/${fileName}`;

        // Delete the old file first
        const { error: deleteError } = await supabase.storage
          .from('files')
          .remove([file.file_path]);

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
        .from('files')
        .update({
          title,
          investigator,
          desk_officer: deskOfficer,
          incident_summary: summary,
          ...(uploadedFile && uploadedFile instanceof globalThis.File && uploadedFile.size > 0 ? {
            file_path: filePath,
            public_url: publicUrl
          } : {}),
          updated_by: userData2.user_id,
          updated_at: new Date().toISOString()
        })
        .eq('file_id', file.file_id);

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
    if (!signedUrl) return null;

    if (imageTypes.includes(ext)) {
      return (
        <div className="relative aspect-video">
          <img 
            src={signedUrl} 
            alt={file.title}
            className="w-full h-full object-contain"
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
            title={file.title}
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
    if (!signedUrl) return (
      <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border">
        {getFileIcon(file.file_path)}
        <span className="mt-2 text-sm text-gray-600">Loading preview...</span>
      </div>
    );

    if (imageTypes.includes(ext)) {
      return (
        <div className="w-full h-48 bg-gray-100 rounded-lg border overflow-hidden">
          <img 
            src={signedUrl} 
            alt={file.title}
            className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
            onClick={() => setShowPreview(true)}
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
              title={file.title}
            />
          </div>
          {/* Expand button overlay */}
          <div className="absolute top-4 right-4 z-10">
            <Button
              size="default"
              variant="secondary"
              className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
              onClick={() => setShowPreview(true)}
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
           onClick={() => setShowPreview(true)}>
        {getFileIcon(file.file_path)}
        <span className="mt-2 text-sm text-gray-600">Click to preview</span>
        <span className="text-xs text-gray-500">{ext.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <>
      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl h-[90vh]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="text-xl">{file.title}</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {ext.toUpperCase()} Document • Added by {file.created_by}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreview(false)}
              >
                <X size={20} />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden rounded-lg border">
            {renderPreviewContent()}
          </div>

          <DialogFooter>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {file.viewed_at && (
                <span>Last viewed: {new Date(file.viewed_at).toLocaleString()}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleFileDownload}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Download
              </Button>
              <Button
                onClick={handleFilePrint}
                className="flex items-center gap-2"
              >
                <Printer size={16} />
                Print
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Operations Dialog */}
      <Dialog open={showFileDialog !== null} onOpenChange={() => setShowFileDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showFileDialog === 'edit' ? 'Edit File' :
               showFileDialog === 'archive' ? 'Archive File' :
               showFileDialog === 'details' ? 'File Details' : ''}
            </DialogTitle>
          </DialogHeader>

          {showFileDialog === 'edit' && (
            <form onSubmit={handleEditFile}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">File Title</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={file.title}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investigator">Investigator</Label>
                  <Input
                    id="investigator"
                    name="investigator"
                    defaultValue={file.investigator}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desk_officer">Desk Officer</Label>
                  <Input
                    id="desk_officer"
                    name="desk_officer"
                    defaultValue={file.desk_officer}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="summary">Incident Summary</Label>
                  <Textarea
                    id="summary"
                    name="summary"
                    defaultValue={file.incident_summary}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Update File (Optional)</Label>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                  />
                  <p className="text-sm text-gray-500">
                    Leave empty to keep the current file
                  </p>
                </div>
              </div>
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
              <DialogDescription>
                Are you sure you want to archive this file? 
                This will remove it from the active files list.
              </DialogDescription>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowFileDialog(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white"
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
              <div>
                <h4 className="font-medium text-gray-500 mb-1">File Title</h4>
                <p className="text-gray-900 text-lg font-medium">{file.title}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-500 mb-1">Investigator</h4>
                <p className="text-gray-900">{file.investigator}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-500 mb-1">Desk Officer</h4>
                <p className="text-gray-900">{file.desk_officer}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-500 mb-1">Incident Summary</h4>
                <p className="text-gray-900 whitespace-pre-line">{file.incident_summary}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-500 mb-1">File Activity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Created: <span>
                        {new Date(file.created_at).toLocaleString()} by{" "}
                        <span className="text-blue-600">{file.created_by}</span>
                      </span>
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Last updated: {file.updated_at ? (
                        <span>
                          {new Date(file.updated_at).toLocaleString()} by{" "}
                          <span className="text-blue-600">{file.updated_by}</span>
                        </span>
                      ) : 'Never'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Last viewed: {file.viewed_at ? (
                        <span>
                          {new Date(file.viewed_at).toLocaleString()} by{" "}
                          <span className="text-blue-600">{file.viewed_by}</span>
                        </span>
                      ) : 'Never'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Last downloaded: {file.downloaded_at ? (
                        <span>
                          {new Date(file.downloaded_at).toLocaleString()} by{" "}
                          <span className="text-blue-600">{file.downloaded_by}</span>
                        </span>
                      ) : 'Never'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Last printed: {file.printed_at ? (
                        <span>
                          {new Date(file.printed_at).toLocaleString()} by{" "}
                          <span className="text-blue-600">{file.printed_by}</span>
                        </span>
                      ) : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="bg-blue-900 hover:bg-blue-800"
                  onClick={() => setShowFileDialog(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Card Preview */}
      <div className="mt-2 relative">
        {renderCardPreview()}
      </div>

      {/* Download and Print buttons */}
      <div className="mt-2">
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
      </div>
    </>
  );
} 