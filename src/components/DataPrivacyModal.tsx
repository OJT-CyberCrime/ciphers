import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";

interface DataPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DataPrivacyModal: React.FC<DataPrivacyModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-poppins text-3xl">Data Privacy Notice</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[70vh]">
          <img src="/assets/DataPrivacy.jpg" alt="Data Privacy" className="w-full h-auto" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataPrivacyModal;
