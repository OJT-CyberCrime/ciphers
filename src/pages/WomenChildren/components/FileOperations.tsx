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
  Eye,
  Expand,
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
  selectedFile?: FileRecord | null;
  setSelectedFile: (file: FileRecord | null) => void;
}

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
  const [editedTitle, setEditedTitle] = useState(file.title);
  const [editedSummary, setEditedSummary] = useState(file.incident_summary);
  const [editedInvestigator, setEditedInvestigator] = useState(file.investigator);
  const [editedDeskOfficer, setEditedDeskOfficer] = useState(file.desk_officer);
  const [fileUpload, setFileUpload] = useState<FileList | null>(null);

  useEffect(() => {
    if (showPreview) {
      getSignedUrl();
    }
  }, [showPreview]);

  const getSignedUrl = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('womenchildren_files')
        .createSignedUrl(file.file_path, 3600);

      if (error) throw error;
      if (data) {
        setSignedUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error getting signed URL:', error);
      toast.error("Failed to load file preview");
    }
  };

  const trackView = async () => {
    try {
      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      const { error } = await supabase
        .from('womenchildren_file')
        .update({
          viewed_by: userData.id,
          viewed_at: new Date().toISOString()
        })
        .eq('file_id', file.file_id);

      if (error) throw error;
      onFileUpdate();
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleFileView = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.storage
        .from('womenchildren_files')
        .createSignedUrl(file.file_path, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Failed to generate signed URL');

      // Track the view
      await trackView();

      // Open the file in a new tab
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error("Failed to open file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDownload = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.storage
        .from('womenchildren_files')
        .createSignedUrl(file.file_path, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Failed to generate signed URL');

      // Track the download
      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      const { error: updateError } = await supabase
        .from('womenchildren_file')
        .update({
          downloaded_by: userData.id,
          downloaded_at: new Date().toISOString()
        })
        .eq('file_id', file.file_id);

      if (updateError) throw updateError;

      // Trigger the download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onFileUpdate();
      toast.success("File download started");
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error("Failed to download file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilePrint = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.storage
        .from('womenchildren_files')
        .createSignedUrl(file.file_path, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Failed to generate signed URL');

      // Track the print
      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      const { error: updateError } = await supabase
        .from('womenchildren_file')
        .update({
          printed_by: userData.id,
          printed_at: new Date().toISOString()
        })
        .eq('file_id', file.file_id);

      if (updateError) throw updateError;

      // Open file in new tab for printing
      const printWindow = window.open(data.signedUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      onFileUpdate();
      toast.success("File opened for printing");
    } catch (error) {
      console.error('Error printing file:', error);
      toast.error("Failed to print file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveFile = async () => {
    try {
      const { error } = await supabase
        .from('womenchildren_file')
        .update({ is_archived: true })
        .eq('file_id', file.file_id);

      if (error) throw error;

      toast.success("File archived successfully");
      onFileUpdate();
      setShowFileDialog(null);
    } catch (error) {
      console.error('Error archiving file:', error);
      toast.error("Failed to archive file");
    }
  };

  const handleEditFile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      let updates: any = {
        title: editedTitle,
        incident_summary: editedSummary,
        investigator: editedInvestigator,
        desk_officer: editedDeskOfficer
      };

      if (fileUpload?.[0]) {
        // Upload new file
        const file = fileUpload[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `folder_${selectedFile?.folder_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('womenchildren_files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL for the new file
        const { data: { publicUrl } } = supabase.storage
          .from('womenchildren_files')
          .getPublicUrl(filePath);

        // Add file path and URL to updates
        updates = {
          ...updates,
          file_path: filePath,
          public_url: publicUrl
        };

        // Delete old file
        if (selectedFile?.file_path) {
          await supabase.storage
            .from('womenchildren_files')
            .remove([selectedFile.file_path]);
        }
      }

      // Update database record
      const { error } = await supabase
        .from('womenchildren_file')
        .update(updates)
        .eq('file_id', selectedFile?.file_id);

      if (error) throw error;

      toast.success("File updated successfully");
      onFileUpdate();
      setShowFileDialog(null);
    } catch (error) {
      console.error('Error updating file:', error);
      toast.error("Failed to update file");
    }
  };

  const renderPreviewContent = () => {
    const ext = file.file_path.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext);
    const isDocument = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);

    if (!signedUrl) {
      return <div className="text-center py-4">Loading preview...</div>;
    }

    if (isImage) {
      return (
        <img
          src={signedUrl}
          alt={file.title}
          className="max-w-full h-auto"
          style={{ maxHeight: '500px' }}
        />
      );
    }

    if (isDocument) {
      return (
        <iframe
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
          width="100%"
          height="500px"
          title={file.title}
        />
      );
    }

    return (
      <div className="text-center py-4">
        Preview not available for this file type
      </div>
    );
  };

  const renderCardPreview = () => {
    const ext = file.file_path.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext);
    const isDocument = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);

    if (isImage) {
      return (
        <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={file.public_url}
            alt={file.title}
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => setShowPreview(true)}
            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
          >
            <Expand size={16} />
          </button>
        </div>
      );
    }

    if (isDocument) {
      return (
        <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(file.public_url)}&embedded=true`}
            width="100%"
            height="100%"
            title={file.title}
          />
          <button
            onClick={() => setShowPreview(true)}
            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
          >
            <Expand size={16} />
          </button>
        </div>
      );
    }

    return (
      <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        {getFileIcon(file.file_path)}
      </div>
    );
  };

  return (
    <>
      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{file.title}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {renderPreviewContent()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Archive/Details Dialog */}
      <Dialog open={showFileDialog !== null} onOpenChange={() => setShowFileDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showFileDialog === 'edit' ? 'Edit File' :
               showFileDialog === 'archive' ? 'Archive File' :
               showFileDialog === 'details' ? 'File Details' : ''}
            </DialogTitle>
          </DialogHeader>
          <div>
            {showFileDialog === 'edit' && (
              <form onSubmit={handleEditFile}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">File Title</Label>
                    <Input
                      id="title"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="investigator">Investigator</Label>
                    <Input
                      id="investigator"
                      value={editedInvestigator}
                      onChange={(e) => setEditedInvestigator(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="desk_officer">Desk Officer</Label>
                    <Input
                      id="desk_officer"
                      value={editedDeskOfficer}
                      onChange={(e) => setEditedDeskOfficer(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="summary">Incident Summary</Label>
                    <Textarea
                      id="summary"
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="file">Update File (Optional)</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setFileUpload(e.target.files)}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowFileDialog(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}

            {showFileDialog === 'archive' && (
              <div>
                <DialogDescription>
                  Are you sure you want to archive this file? This will move it to the archives.
                </DialogDescription>
                <DialogFooter className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFileDialog(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleArchiveFile}
                  >
                    Archive File
                  </Button>
                </DialogFooter>
              </div>
            )}

            {showFileDialog === 'details' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">File Information</h4>
                  <div className="mt-2 space-y-2 text-sm text-gray-600">
                    <p>Title: {file.title}</p>
                    <p>Investigator: {file.investigator}</p>
                    <p>Desk Officer: {file.desk_officer}</p>
                    <p>Created by: {file.created_by}</p>
                    <p>Created at: {new Date(file.created_at).toLocaleString()}</p>
                    {file.updated_by && (
                      <p>Last updated by: {file.updated_by} at {new Date(file.updated_at || '').toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">File Activity</h4>
                  <div className="mt-2 space-y-2 text-sm text-gray-600">
                    {file.viewed_by && (
                      <p>Last viewed by: {file.viewer?.name} at {new Date(file.viewed_at || '').toLocaleString()}</p>
                    )}
                    {file.downloaded_by && (
                      <p>Last downloaded by: {file.downloader?.name} at {new Date(file.downloaded_at || '').toLocaleString()}</p>
                    )}
                    {file.printed_by && (
                      <p>Last printed by: {file.printer?.name} at {new Date(file.printed_at || '').toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Incident Summary</h4>
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                    {file.incident_summary}
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => setShowFileDialog(null)}
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
    </>
  );
} 