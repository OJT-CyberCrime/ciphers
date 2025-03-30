import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface PermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
}

export default function PermissionDialog({ isOpen, onClose, action = "perform this action" }: PermissionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert size={18} />
            Permission Denied
          </DialogTitle>
          <DialogDescription>
            <p>You don't have permission to {action}.</p>
            <ul className="list-disc pl-5 mt-2 text-sm">
              <li>Regular users can only add new folders and files</li>
              <li>Only admins and superadmins can edit folders and files</li>
              <li>Only admins and superadmins can archive folders and files</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        {/* <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Understood
          </Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
} 