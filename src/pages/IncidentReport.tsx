import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderClosed,
  Pencil,
  Eye,
  Archive,
  Plus,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import SearchBar from "@/Search";
import { useNavigate, useLocation } from "react-router-dom";

export default function IncidentReports() {
  const [dialogContent, setDialogContent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [folders, setFolders] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const navigate = useNavigate();
  const location = useLocation();

  const addFolder = () => {
    setFolders([...folders, folders.length + 1]);
  };

  const categories = [
    "Scam",
    "Phishing",
    "Hacking",
    "Fraud",
    "Data Breach",
    "Identity Theft",
  ];
  const visibleBadges = categories.slice(0, 3);
  const hiddenBadges = categories.slice(3);

  const previousPage = location.state?.from || "/dashboard";
  const previousPageName = location.state?.fromName || "Home";

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search reports..."
        />

        <Select onValueChange={setFilter}>
          <SelectTrigger className="w-48 p-5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category, index) => (
              <SelectItem key={index} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={addFolder}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
        >
          <Plus size={16} /> Add Folder
        </Button>
      </div>


      <Breadcrumb className="mb-4 text-gray-600 flex space-x-2">
        {/* <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="flex items-center">
          <ChevronRight size={16} />
        </BreadcrumbSeparator> */}
        <BreadcrumbItem>
          <BreadcrumbLink href={previousPage}>{previousPageName}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="flex items-center">
          <ChevronRight size={16} />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href="/incident-report">Incident Reports</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <h1 className="text-2xl font-medium font-poppins mb-6 text-blue-900">
        Incident Reports
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {folders.map((id) => (
          <ContextMenu key={id}>
            <ContextMenuTrigger>
              <Button
                className="flex flex-col items-start bg-white border border-gray-300 rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-gray-100 w-full min-h-[120px]"
                onClick={() => navigate(`/folder/${id}`, { state: { from: '/incident-reports', fromName: 'Incident Reports' } })}
              >
                <div className="flex items-center gap-x-3 w-full">
                  <FolderClosed
                    style={{ width: "40px", height: "40px" }}
                    className="text-gray-600"
                    fill="#4b5563"
                  />
                  <span className="font-poppins font-medium text-lg text-gray-900 text-left">
                    Folder {id}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2 font-poppins">
                  {visibleBadges.map((badge, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="py-0.5 px-2 text-[10px] font-medium rounded-full bg-gray-200 text-gray-700"
                    >
                      {badge}
                    </Badge>
                  ))}
                  {hiddenBadges.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge
                            variant="outline"
                            className="py-0.5 px-2 text-[10px] font-medium rounded-full bg-gray-300 text-gray-800 cursor-pointer"
                          >
                            +{hiddenBadges.length}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {hiddenBadges.join(", ")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </Button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onSelect={() => setDialogContent("Edit Folder Details")}
                inset
              >
                <Pencil size={16} className="mr-2" /> Edit
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() =>
                  setDialogContent(
                    "Are you sure you want to delete this folder?"
                  )
                }
                inset
              >
                <Archive size={16} className="mr-2" /> Archive
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => setDialogContent("Viewing folder details...")}
                inset
              >
                <Eye size={16} className="mr-2" /> View Details
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      {dialogContent && (
        <Dialog
          open={dialogContent !== null}
          onOpenChange={() => setDialogContent(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialogContent}</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
            <DialogFooter>
              <Button className="bg-blue-900 hover:bg-blue-800" type="submit">
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
