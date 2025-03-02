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
  selectedFile: Extraction | null;
  setSelectedFile: (file: Extraction | null) => void;
  onFileUpdate: () => void;
}

export default function FileOperations({
  file,
  showPreview,
  setShowPreview,
  showFileDialog,
  setShowFileDialog,
  selectedFile,
  setSelectedFile,
  onFileUpdate
}: FileOperationsProps) {
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
        setShowFileDialog('details');
      }

      onFileUpdate(); // Call the update callback
    } catch (error: any) {
      console.error(`Error ${action}ing file:`, error);
      toast.error(error.message || `Failed to ${action} file`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => handleFileAction(file, 'download')}
        >
          <Download size={16} /> Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => handleFileAction(file, 'print')}
        >
          <Printer size={16} /> Print
        </Button>
      </div>
      <div className="text-sm text-gray-500">
        {file.viewed_by && (
          <p>Last viewed by {file.viewer?.name} on {new Date(file.viewed_at!).toLocaleString()}</p>
        )}
        {file.downloaded_by && (
          <p>Last downloaded by {file.downloader?.name} on {new Date(file.downloaded_at!).toLocaleString()}</p>
        )}
        {file.printed_by && (
          <p>Last printed by {file.printer?.name} on {new Date(file.printed_at!).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
} 