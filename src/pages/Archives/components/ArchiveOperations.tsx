import { supabase } from "@/utils/supa";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
  categories: Category[];
  archived_by?: string;
  archived_at?: string;
  files: ArchivedFile[];
}

interface ArchivedFile {
  file_id: number;
  folder_id: number;
  title: string;
  created_by: string;
  created_at: string;
  is_archived: boolean;
  folder_title?: string;
  incident_summary: string;
  archived_by?: string;
  archived_at?: string;
}

export const fetchArchivedContent = async () => {
  try {
    // Fetch archived folders with their categories
    const { data: foldersData, error: foldersError } = await supabase
      .from('folders')
      .select(`
        *,
        creator:created_by(name),
        updater:updated_by(name),
        archiver:updated_by(name),
        files:files(
          *,
          creator:created_by(name),
          updater:updated_by(name)
        )
      `)
      .eq('is_archived', true)
      .order('created_at', { ascending: false });

    if (foldersError) throw foldersError;

    // For each folder, fetch its categories
    const foldersWithCategories = await Promise.all(
      (foldersData || []).map(async (folder) => {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('folder_categories')
          .select(`
            categories (
              category_id,
              title,
              created_by,
              created_at
            )
          `)
          .eq('folder_id', folder.folder_id);

        if (categoriesError) throw categoriesError;

        return {
          ...folder,
          created_by: folder.creator?.name || folder.created_by,
          updated_by: folder.updater?.name || folder.updated_by,
          archived_by: folder.archiver?.name || folder.updated_by,
          archived_at: folder.updated_at,
          categories: categoriesData?.map(item => item.categories) || [],
          files: folder.files.map((file: any) => ({
            ...file,
            created_by: file.creator?.name || file.created_by,
            updated_by: file.updater?.name || file.updated_by,
            folder_title: folder.title
          }))
        };
      })
    );

    // Fetch archived files from non-archived folders
    const { data: filesData, error: filesError } = await supabase
      .from('files')
      .select(`
        *,
        creator:created_by(name),
        updater:updated_by(name),
        folders!inner(
          is_archived,
          title
        )
      `)
      .eq('is_archived', true)
      .eq('folders.is_archived', false)
      .order('created_at', { ascending: false });

    if (filesError) throw filesError;

    // Fetch archived eblotter files
    const { data: eblotterFilesData, error: eblotterFilesError } = await supabase
      .from('eblotter_file')
      .select(`
        *,
        creator:created_by(name),
        updater:updated_by(name),
        folders!inner(
          is_archived,
          title
        )
      `)
      .eq('is_archived', true)
      .eq('folders.is_archived', false)
      .order('created_at', { ascending: false });

    if (eblotterFilesError) throw eblotterFilesError;

    const formattedFiles = filesData.map(file => ({
      ...file,
      created_by: file.creator?.name || file.created_by,
      updated_by: file.updater?.name || file.updated_by,
      folder_title: file.folders?.title,
      archived_by: file.updater?.name || file.updated_by,
      archived_at: file.updated_at
    }));

    const formattedEblotterFiles = eblotterFilesData.map(file => ({
      ...file,
      created_by: file.creator?.name || file.created_by,
      updated_by: file.updater?.name || file.updated_by,
      folder_title: file.folders?.title,
      archived_by: file.updater?.name || file.updated_by,
      archived_at: file.updated_at,
      title: file.name, // Map name to title for consistency
      file_path: file.path_file // Map path_file to file_path for consistency
    }));

    return { 
      folders: foldersWithCategories, 
      files: [...formattedFiles, ...formattedEblotterFiles]
    };
  } catch (error) {
    console.error('Error fetching archived content:', error);
    throw error;
  }
};

export const handleRestoreFolder = async (folder: Folder) => {
  try {
    const { error } = await supabase
      .from('folders')
      .update({ is_archived: false })
      .eq('folder_id', folder.folder_id);

    if (error) throw error;
    toast.success("Folder restored successfully");
    return true;
  } catch (error: any) {
    console.error('Error restoring folder:', error);
    toast.error(error.message || "Failed to restore folder");
    return false;
  }
};

export const handleRestoreFile = async (file: ArchivedFile) => {
  try {
    // Check if it's an eblotter file by checking for blotter_id
    if ('blotter_id' in file) {
      const { error } = await supabase
        .from('eblotter_file')
        .update({ is_archived: false })
        .eq('blotter_id', file.blotter_id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('files')
        .update({ is_archived: false })
        .eq('file_id', file.file_id);

      if (error) throw error;
    }

    toast.success("File restored successfully");
    return true;
  } catch (error: any) {
    console.error('Error restoring file:', error);
    toast.error(error.message || "Failed to restore file");
    return false;
  }
};

export const fetchCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('title', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// Function to determine badge color based on status
export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-200 text-yellow-800';
    case 'resolved':
      return 'bg-green-200 text-green-800';
    case 'dismissed':
      return 'bg-red-200 text-red-800';
    case 'under investigation':
      return 'bg-blue-200 text-blue-800';
    default:
      return 'bg-gray-200 text-black';
  }
};

export type { Folder, ArchivedFile, Category }; 