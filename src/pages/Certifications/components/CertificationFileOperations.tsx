import { useState } from 'react';
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/utils/supa";
import Cookies from "js-cookie";
import { FileText, Download, Eye, Printer } from "lucide-react";

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
  created_by: number;
  updated_by: number | null;
  viewed_by: number | null;
  downloaded_by: number | null;
  printed_by: number | null;
  created_at: string;
  updated_at: string | null;
  viewed_at: string | null;
  downloaded_at: string | null;
  printed_at: string | null;
  folder_id: number;
  creator?: { name: string };
  updater?: { name: string };
  viewer?: { name: string };
  downloader?: { name: string };
  printer?: { name: string };
}

interface CertificationFileOperationsProps {
  isAddingFile: boolean;
  setIsAddingFile: (value: boolean) => void;
  isViewingFile: boolean;
  setIsViewingFile: (value: boolean) => void;
  selectedFile: Extraction | null;
  setSelectedFile: (file: Extraction | null) => void;
  dialogContent: string | null;
  setDialogContent: (content: string | null) => void;
  files: Extraction[];
  setFiles: (files: Extraction[]) => void;
  folderId: number;
  refreshFiles: () => void;
}

export default function CertificationFileOperations({
  isAddingFile,
  setIsAddingFile,
  isViewingFile,
  setIsViewingFile,
  selectedFile,
  setSelectedFile,
  dialogContent,
  setDialogContent,
  files,
  setFiles,
  folderId,
  refreshFiles,
}: CertificationFileOperationsProps) {
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
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  // Add new extraction file
  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!fileToUpload) {
        toast.error("Please select a file to upload");
        return;
      }

      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      
      const { data: userData2, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error('User not found');

      // Upload file to storage
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `extractions/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, fileToUpload);

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
            folder_id: folderId
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
      setFileToUpload(null);
    } catch (error: any) {
      console.error('Error adding certificate file:', error);
      toast.error(error.message || "Failed to add certificate file");
    }
  };

  // Handle file actions (view, download, print)
  const handleFileAction = async (file: Extraction, action: 'view' | 'download' | 'print') => {
    try {
      const userData = JSON.parse(Cookies.get('user_data') || '{}');
      
      const { data: userData2, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', userData.email)
        .single();

      if (userError) throw userError;
      if (!userData2) throw new Error('User not found');

      const updateData: any = {
        [`${action}ed_by`]: userData2.user_id,
        [`${action}ed_at`]: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('extraction')
        .update(updateData)
        .eq('extraction_id', file.extraction_id);

      if (updateError) throw updateError;

      // Perform the actual action
      if (action === 'download') {
        window.open(file.public_url, '_blank');
      } else if (action === 'print') {
        const printWindow = window.open(file.public_url, '_blank');
        printWindow?.print();
      } else if (action === 'view') {
        setSelectedFile(file);
        setIsViewingFile(true);
      }

      refreshFiles(); // Refresh the files list to update the counters
    } catch (error: any) {
      console.error(`Error ${action}ing file:`, error);
      toast.error(error.message || `Failed to ${action} file`);
    }
  };

  return (
    <>
      {/* Add File Dialog */}
      <Dialog open={isAddingFile} onOpenChange={setIsAddingFile}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Certificate of Extraction</DialogTitle>
            <DialogDescription>
              Enter the details for the new certificate.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFile} className="space-y-4">
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
                <Textarea
                  id="incident_summary"
                  value={newFile.incident_summary}
                  onChange={(e) => setNewFile({ ...newFile, incident_summary: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="file">Upload File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
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
                  setFileToUpload(null);
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

      {/* View File Dialog */}
      <Dialog open={isViewingFile} onOpenChange={setIsViewingFile}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Certificate Details</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Case Title</Label>
                  <p className="text-gray-700">{selectedFile.case_title}</p>
                </div>
                <div>
                  <Label className="font-medium">Control Number</Label>
                  <p className="text-gray-700">{selectedFile.control_num}</p>
                </div>
                <div>
                  <Label className="font-medium">Complainant</Label>
                  <p className="text-gray-700">{selectedFile.complainant}</p>
                </div>
                <div>
                  <Label className="font-medium">Assisted By</Label>
                  <p className="text-gray-700">{selectedFile.assisted_by}</p>
                </div>
                <div>
                  <Label className="font-medium">Accompanied By</Label>
                  <p className="text-gray-700">{selectedFile.accompanied_by}</p>
                </div>
                <div>
                  <Label className="font-medium">Witnesses</Label>
                  <p className="text-gray-700">{selectedFile.witnesses}</p>
                </div>
                <div>
                  <Label className="font-medium">Respondent</Label>
                  <p className="text-gray-700">{selectedFile.respondent}</p>
                </div>
                <div>
                  <Label className="font-medium">Investigator</Label>
                  <p className="text-gray-700">{selectedFile.investigator}</p>
                </div>
                <div>
                  <Label className="font-medium">Contact Number</Label>
                  <p className="text-gray-700">{selectedFile.contact_num}</p>
                </div>
                <div>
                  <Label className="font-medium">Facebook Account</Label>
                  <p className="text-gray-700">{selectedFile.fb_account}</p>
                </div>
                <div>
                  <Label className="font-medium">Station/Unit</Label>
                  <p className="text-gray-700">{selectedFile.station_unit}</p>
                </div>
                <div>
                  <Label className="font-medium">Date of Release</Label>
                  <p className="text-gray-700">{new Date(selectedFile.date_release).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="font-medium">Signatories</Label>
                  <p className="text-gray-700">{selectedFile.signatories}</p>
                </div>
              </div>
              <div>
                <Label className="font-medium">Incident Summary</Label>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedFile.incident_summary}</p>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">File Activity</Label>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Created by {selectedFile.creator?.name} on {new Date(selectedFile.created_at).toLocaleString()}</p>
                  {selectedFile.updated_by && (
                    <p>Last updated by {selectedFile.updater?.name} on {new Date(selectedFile.updated_at!).toLocaleString()}</p>
                  )}
                  {selectedFile.viewed_by && (
                    <p>Last viewed by {selectedFile.viewer?.name} on {new Date(selectedFile.viewed_at!).toLocaleString()}</p>
                  )}
                  {selectedFile.downloaded_by && (
                    <p>Last downloaded by {selectedFile.downloader?.name} on {new Date(selectedFile.downloaded_at!).toLocaleString()}</p>
                  )}
                  {selectedFile.printed_by && (
                    <p>Last printed by {selectedFile.printer?.name} on {new Date(selectedFile.printed_at!).toLocaleString()}</p>
                  )}
                </div>
              </div>
              <DialogFooter className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleFileAction(selectedFile, 'download')}
                    className="flex items-center gap-2"
                  >
                    <Download size={16} /> Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleFileAction(selectedFile, 'print')}
                    className="flex items-center gap-2"
                  >
                    <Printer size={16} /> Print
                  </Button>
                </div>
                <Button
                  onClick={() => setIsViewingFile(false)}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 