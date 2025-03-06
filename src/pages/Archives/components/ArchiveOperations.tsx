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
  is_extraction: boolean;
  categories: Category[];
  archived_by?: string;
  archived_at?: string;
  files: ArchivedFile[];
}

interface ArchivedFile {
  file_id: number;
  title: string;
  folder_id: number | null;
  folder_title: string;
  archived_by: string;
  archived_at: string;
  file_type: 'regular' | 'eblotter' | 'extraction' | 'womenchildren';
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
            folder_title: folder.title,
            file_type: 'regular'
          }))
        };
      })
    );

    // Fetch archived files from all tables
    const [
      { data: regularFiles, error: regularFilesError },
      { data: eblotterFiles, error: eblotterError },
      { data: extractionFiles, error: extractionError },
      { data: womenchildrenFiles, error: womenchildrenError }
    ] = await Promise.all([
      // Regular files from non-archived folders
      supabase
        .from('files')
        .select(`
          *,
          updater:updated_by(name),
          folders:folders!folder_id(title)
        `)
        .eq('is_archived', true)
        .not('folder_id', 'in', (foldersData || []).map(f => f.folder_id).length > 0 
          ? `(${(foldersData || []).map(f => f.folder_id).join(',')})` 
          : '(0)'),
      
      // E-blotter files
      supabase
        .from('eblotter_file')
        .select(`
          *,
          updater:updated_by(name),
          folders:folders!folder_id(title)
        `)
        .eq('is_archived', true),
      
      // Extraction files
      supabase
        .from('extraction')
        .select(`
          *,
          updater:updated_by(name),
          folders:folders!folder_id(title)
        `)
        .eq('is_archived', true),
      
      // Women and Children files
      supabase
        .from('womenchildren_file')
        .select(`
          *,
          updater:updated_by(name),
          folders:folders!folder_id(title)
        `)
        .eq('is_archived', true)
    ]);

    if (regularFilesError) throw regularFilesError;
    if (eblotterError) throw eblotterError;
    if (extractionError) throw extractionError;
    if (womenchildrenError) throw womenchildrenError;

    // Transform and combine all files
    const allFiles = [
      ...(regularFiles || []).map((file: any) => ({
        file_id: file.file_id,
        title: file.title,
        folder_id: file.folder_id,
        folder_title: file.folders?.title || 'No Folder',
        archived_by: file.updater?.name || file.updated_by,
        archived_at: file.updated_at,
        file_type: 'regular' as const
      })),
      ...(eblotterFiles || []).map((file: any) => ({
        file_id: file.eblotter_id,
        title: `Blotter #${file.case_number}`,
        folder_id: file.folder_id,
        folder_title: file.folders?.title || 'No Folder',
        archived_by: file.updater?.name || file.updated_by,
        archived_at: file.updated_at,
        file_type: 'eblotter' as const
      })),
      ...(extractionFiles || []).map((file: any) => ({
        file_id: file.extraction_id,
        title: file.title || `Extraction #${file.extraction_id}`,
        folder_id: file.folder_id,
        folder_title: file.folders?.title || 'No Folder',
        archived_by: file.updater?.name || file.updated_by,
        archived_at: file.updated_at,
        file_type: 'extraction' as const
      })),
      ...(womenchildrenFiles || []).map((file: any) => ({
        file_id: file.womenchildren_id,
        title: `Case #${file.case_number}`,
        folder_id: file.folder_id,
        folder_title: file.folders?.title || 'No Folder',
        archived_by: file.updater?.name || file.updated_by,
        archived_at: file.updated_at,
        file_type: 'womenchildren' as const
      }))
    ];

    return {
      folders: foldersWithCategories,
      files: allFiles
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
    let error;

    switch (file.file_type) {
      case 'eblotter':
        ({ error } = await supabase
          .from('eblotter_file')
          .update({ is_archived: false })
          .eq('eblotter_id', file.file_id));
        break;

      case 'extraction':
        ({ error } = await supabase
          .from('extraction')
          .update({ is_archived: false })
          .eq('extraction_id', file.file_id));
        break;

      case 'womenchildren':
        ({ error } = await supabase
          .from('womenchildren_file')
          .update({ is_archived: false })
          .eq('womenchildren_id', file.file_id));
        break;

      case 'regular':
      default:
        ({ error } = await supabase
          .from('files')
          .update({ is_archived: false })
          .eq('file_id', file.file_id));
        break;
    }

    if (error) throw error;

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