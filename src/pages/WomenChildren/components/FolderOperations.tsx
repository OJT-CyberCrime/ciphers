import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/utils/supa";
import Cookies from "js-cookie";
import { useState, useEffect } from "react";
import { ClockIcon, Plus, RefreshCwIcon } from "lucide-react";

interface Category {
  category_id: number;
  title: string;
  created_by: string;
  created_at: string;
}

interface Folder {
  folder_id: number;
  title: string;
  status: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_blotter: boolean;
  is_womencase: boolean;
  is_extraction: boolean;
  categories: Category[];
}

interface FolderOperationsProps {
  isAddingFolder: boolean;
  setIsAddingFolder: (value: boolean) => void;
  isEditingFolder: boolean;
  setIsEditingFolder: (value: boolean) => void;
  selectedFolder: Folder | null;
  setSelectedFolder: (folder: Folder | null) => void;
  dialogContent: string | null;
  setDialogContent: (content: string | null) => void;
  folders: Folder[];
  setFolders: (folders: Folder[]) => void;
  availableCategories: Category[];
}

const statusOptions = [
  "pending",
  "resolved",
  "dismissed",
  "under investigation"
];

// Function to determine badge color based on status
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'pending':
      return { class: 'bg-yellow-200 text-yellow-800', label: 'P' }; // Lighter for pending status
    case 'resolved':
      return { class: 'bg-green-200 text-green-800', label: 'R' }; // Lighter for resolved status
    case 'dismissed':
      return { class: 'bg-red-200 text-red-800', label: 'D' }; // Lighter for dismissed status
    case 'under investigation':
      return { class: 'bg-blue-200 text-blue-800', label: 'UI' }; // Lighter for under investigation status
    default:
      return { class: 'bg-gray-200 text-black', label: 'N/A' }; // Default case
  }
};

export default function FolderOperations({
  isAddingFolder,
  setIsAddingFolder,
  isEditingFolder,
  setIsEditingFolder,
  selectedFolder,
  setSelectedFolder,
  dialogContent,
  setDialogContent,
  folders,
  setFolders,
  availableCategories,
}: FolderOperationsProps) {
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newFolderStatus, setNewFolderStatus] = useState("pending");
  const [editFolderTitle, setEditFolderTitle] = useState("");
  const [editFolderStatus, setEditFolderStatus] = useState("");
  const [editSelectedCategories, setEditSelectedCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [categorySelectKey, setCategorySelectKey] = useState(0);

  // Initialize edit form when selectedFolder changes
  useEffect(() => {
    if (selectedFolder && isEditingFolder) {
      setEditFolderTitle(selectedFolder.title);
      setEditFolderStatus(selectedFolder.status);
      setEditSelectedCategories(
        selectedFolder.categories.map(cat => cat.category_id.toString())
      );
    } else {
      // Reset form when closing
      setEditFolderTitle("");
      setEditFolderStatus("");
      setEditSelectedCategories([]);
    }
  }, [selectedFolder, isEditingFolder]);

  // Add new folder
  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Create the folder first
      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .insert([
          {
            title: newFolderTitle,
            status: newFolderStatus,
            created_by: userData2.user_id,
            updated_by: null,
            updated_at: null,
            is_archived: false,
            is_blotter: false,
            is_womencase: true,
            is_extraction: false
          }
        ])
        .select(`
          *,
          creator:created_by(name),
          updater:updated_by(name),
          categories:folder_categories(
            categories(
              category_id,
              title,
              created_by,
              created_at
            )
          )
        `)
        .single();

      if (folderError) throw folderError;
      if (!folderData) throw new Error('Failed to create folder');

      // Add categories to folder_categories if any categories were selected
      if (selectedCategories.length > 0) {
        const folderCategoriesData = selectedCategories.map(categoryId => ({
          folder_id: folderData.folder_id,
          category_id: parseInt(categoryId)
        }));

        const { error: categoriesError } = await supabase
          .from('folder_categories')
          .insert(folderCategoriesData);

        if (categoriesError) throw categoriesError;
      }

      // Format the categories data for the UI
      const formattedFolder = {
        ...folderData,
        created_by: folderData.creator?.name || folderData.created_by,
        updated_by: folderData.updater?.name || folderData.updated_by,
        categories: folderData.categories
          .map((item: any) => item.categories)
          .filter(Boolean)
      };

      // Update the UI with the new folder
      setFolders([formattedFolder, ...folders]);
      toast.success("Folder created successfully");
      setIsAddingFolder(false);
      setNewFolderTitle("");
      setNewFolderStatus("pending");
      setSelectedCategories([]);
    } catch (error: any) {
      console.error('Error adding folder:', error);
      toast.error(error.message || "Failed to create folder");
    }
  };

  // Handle edit folder
  const handleEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolder) return;

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

      // Update the folder
      const { error: folderError } = await supabase
        .from('folders')
        .update({
          title: editFolderTitle,
          status: editFolderStatus,
          updated_by: userData2.user_id,
          updated_at: new Date().toISOString()
        })
        .eq('folder_id', selectedFolder.folder_id);

      if (folderError) throw folderError;

      // Delete existing category associations
      const { error: deleteError } = await supabase
        .from('folder_categories')
        .delete()
        .eq('folder_id', selectedFolder.folder_id);

      if (deleteError) throw deleteError;

      // Add new category associations
      if (editSelectedCategories.length > 0) {
        const folderCategoriesData = editSelectedCategories.map(categoryId => ({
          folder_id: selectedFolder.folder_id,
          category_id: parseInt(categoryId)
        }));

        const { error: categoriesError } = await supabase
          .from('folder_categories')
          .insert(folderCategoriesData);

        if (categoriesError) throw categoriesError;
      }

      // Fetch the updated folder data
      const { data: updatedFolder, error: fetchError } = await supabase
        .from('folders')
        .select(`
          *,
          creator:created_by(name),
          updater:updated_by(name),
          categories:folder_categories(
            categories(
              category_id,
              title,
              created_by,
              created_at
            )
          )
        `)
        .eq('folder_id', selectedFolder.folder_id)
        .single();

      if (fetchError) throw fetchError;

      // Format the updated folder data
      const formattedFolder = {
        ...updatedFolder,
        created_by: updatedFolder.creator?.name || updatedFolder.created_by,
        updated_by: updatedFolder.updater?.name || updatedFolder.updated_by,
        categories: updatedFolder.categories
          .map((item: any) => item.categories)
          .filter(Boolean)
      };

      // Update the folders state
      setFolders(folders.map(f => 
        f.folder_id === selectedFolder.folder_id ? formattedFolder : f
      ));

      toast.success("Folder updated successfully");
      setIsEditingFolder(false);
      setSelectedFolder(null);
    } catch (error: any) {
      console.error('Error updating folder:', error);
      toast.error(error.message || "Failed to update folder");
    }
  };

  // Handle archive folder
  const handleArchiveFolder = async () => {
    if (!selectedFolder) {
      console.error('No folder selected for archiving');
      return;
    }

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

      // Update the folder to archive it
      const { error: archiveError } = await supabase
        .from('folders')
        .update({
          is_archived: true,
          updated_by: userData2.user_id,
          updated_at: new Date().toISOString()
        })
        .eq('folder_id', selectedFolder.folder_id);

      if (archiveError) throw archiveError;

      // Remove the archived folder from the UI
      setFolders(folders.filter(f => f.folder_id !== selectedFolder.folder_id));
      toast.success("Folder archived successfully");
      setDialogContent(null);
      setSelectedFolder(null);
    } catch (error: any) {
      console.error('Error archiving folder:', error);
      toast.error(error.message || "Failed to archive folder");
    }
  };

  // Handle new category creation
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Create the new category
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .insert([
          {
            title: newCategoryTitle,
            created_by: userData2.user_id
          }
        ])
        .select()
        .single();

      if (categoryError) throw categoryError;

      // Add the new category to the selected categories
      if (categoryData) {
        setSelectedCategories([...selectedCategories, categoryData.category_id.toString()]);
        // Update available categories
        availableCategories.push(categoryData);
        // Reset the select component
        setCategorySelectKey(prev => prev + 1);
      }

      toast.success("Category created successfully");
      setIsAddingCategory(false);
      setNewCategoryTitle("");
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast.error(error.message || "Failed to create category");
    }
  };

  return (
    <>
      {/* Add Folder Dialog */}
      <Dialog open={isAddingFolder} onOpenChange={setIsAddingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter the details for your new folder.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFolder}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Folder Title</Label>
                <Input
                  id="title"
                  placeholder="Enter folder title"
                  value={newFolderTitle}
                  onChange={(e) => setNewFolderTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="flex gap-2">
                  <Select 
                    key={categorySelectKey}
                    onValueChange={(value) => {
                      if (value === "new") {
                        setIsAddingCategory(true);
                      } else if (!selectedCategories.includes(value)) {
                        setSelectedCategories([...selectedCategories, value]);
                        // Reset the select component
                        setCategorySelectKey(prev => prev + 1);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new" className="text-blue-600">
                        <div className="flex items-center gap-2">
                          <Plus size={16} />
                          Create new category
                        </div>
                      </SelectItem>
                      {availableCategories.map((category) => (
                        <SelectItem 
                          key={category.category_id} 
                          value={category.category_id.toString()}
                        >
                          {category.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCategories.map((categoryId) => {
                    const category = availableCategories.find(
                      c => c.category_id.toString() === categoryId
                    );
                    return category ? (
                      <Badge
                        key={categoryId}
                        variant="outline"
                        className="bg-blue-100 text-blue-800"
                      >
                        {category.title}
                        <button
                          type="button"
                          className="ml-2 hover:text-red-600"
                          onClick={() => setSelectedCategories(
                            selectedCategories.filter(id => id !== categoryId)
                          )}
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={newFolderStatus}
                  onValueChange={setNewFolderStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem 
                        key={status} 
                        value={status}
                        className="capitalize"
                      >
                        {status.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingFolder(false);
                  setNewFolderTitle("");
                  setNewFolderStatus("pending");
                  setSelectedCategories([]);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Create Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Enter the title for your new category.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-title">Category Title</Label>
                <Input
                  id="category-title"
                  placeholder="Enter category title"
                  value={newCategoryTitle}
                  onChange={(e) => setNewCategoryTitle(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingCategory(false);
                  setNewCategoryTitle("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Create Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={isEditingFolder} onOpenChange={setIsEditingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>
              Make changes to your folder here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditFolder}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Folder Title</Label>
                <Input
                  id="edit-title"
                  placeholder="Enter folder title"
                  value={editFolderTitle}
                  onChange={(e) => setEditFolderTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categories</Label>
                <Select 
                  key={categorySelectKey}
                  onValueChange={(value) => {
                    if (!editSelectedCategories.includes(value)) {
                      setEditSelectedCategories([...editSelectedCategories, value]);
                      // Reset the select component
                      setCategorySelectKey(prev => prev + 1);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category) => (
                      <SelectItem 
                        key={category.category_id} 
                        value={category.category_id.toString()}
                      >
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editSelectedCategories.map((categoryId) => {
                    const category = availableCategories.find(
                      c => c.category_id.toString() === categoryId
                    );
                    return category ? (
                      <Badge
                        key={categoryId}
                        variant="outline"
                        className="bg-blue-100 text-blue-800"
                      >
                        {category.title}
                        <button
                          type="button"
                          className="ml-2 hover:text-red-600"
                          onClick={() => setEditSelectedCategories(
                            editSelectedCategories.filter(id => id !== categoryId)
                          )}
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editFolderStatus}
                  onValueChange={setEditFolderStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem 
                        key={status} 
                        value={status}
                        className="capitalize"
                      >
                        {status.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditingFolder(false);
                  setSelectedFolder(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View/Archive Dialog */}
      {dialogContent && (
        <Dialog
          open={dialogContent !== null}
          onOpenChange={() => {
            setDialogContent(null);
            setSelectedFolder(null);
          }}
        >
          <DialogContent className="p-6 font-poppins">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-gray-900">
                {dialogContent}
              </DialogTitle>
            </DialogHeader>

            {dialogContent === "Folder Details" && selectedFolder ? (
              <div className="space-y-6">
                {/* Folder Info Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Folder Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <h5 className="text-sm font-medium text-gray-600">
                        Folder Title
                      </h5>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedFolder.title}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-600">
                        Status
                      </h5>
                      <Badge
                        variant="outline"
                        className={`${
                          getStatusBadgeClass(selectedFolder.status).class
                        } py-1 px-2`}
                      >
                        {selectedFolder.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Categories Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedFolder.categories.map((category) => (
                      <Badge
                        key={category.category_id}
                        variant="outline"
                        className="bg-gray-200 py-1 px-3"
                      >
                        {category.title}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Folder Activity Section */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Folder Activity
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-gray-600" />
                      <p className="text-sm text-gray-600">
                        Created:{" "}
                        <span className="text-gray-900">
                          {new Date(selectedFolder.created_at).toLocaleString()}
                        </span>{" "}
                        by{" "}
                        <span className="font-semibold text-gray-900">
                          {selectedFolder.created_by}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RefreshCwIcon className="h-4 w-4 text-gray-600" />
                      <p className="text-sm text-gray-600">
                        Last updated:{" "}
                        {selectedFolder.updated_at ? (
                          <span className="text-gray-900">
                            {new Date(
                              selectedFolder.updated_at
                            ).toLocaleString()}
                          </span>
                        ) : (
                          <span className="italic text-gray-600">Never</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer with Close Button
                <DialogFooter className="flex justify-end mt-6">
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => setDialogContent(null)}
                  >
                    Close
                  </Button>
                </DialogFooter> */}
              </div>
            ) : dialogContent ===
              "Are you sure you want to archive this folder?" ? (
              <div className="space-y-6">
                <DialogDescription className="text-sm text-gray-700">
                  This action will archive the folder and remove it from the
                  active folders list. You can access it later in the Archives
                  section.
                </DialogDescription>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogContent(null);
                      setSelectedFolder(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={async () => {
                      if (selectedFolder) {
                        await handleArchiveFolder();
                      } else {
                        toast.error("No folder selected for archiving");
                      }
                    }}
                  >
                    Yes, Archive
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 