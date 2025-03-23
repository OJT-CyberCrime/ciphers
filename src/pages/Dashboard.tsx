import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Treemap,
} from "recharts";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { supabase } from "@/utils/supa";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Users, Archive, Files, FileTextIcon, FileCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

// Sample data for different file types
const regularFilesData = [
  { day: "Mon", total: 8 },
  { day: "Tue", total: 12 },
  { day: "Wed", total: 7 },
  { day: "Thu", total: 15 },
  { day: "Fri", total: 10 },
  { day: "Sat", total: 5 },
  { day: "Sun", total: 3 },
];

const eblotterFilesData = [
  { day: "Mon", total: 5 },
  { day: "Tue", total: 8 },
  { day: "Wed", total: 12 },
  { day: "Thu", total: 15 },
  { day: "Fri", total: 10 },
  { day: "Sat", total: 20 },
  { day: "Sun", total: 25 },
];

const womenChildrenFilesData = [
  { day: "Mon", total: 3 },
  { day: "Tue", total: 7 },
  { day: "Wed", total: 9 },
  { day: "Thu", total: 12 },
  { day: "Fri", total: 8 },
  { day: "Sat", total: 6 },
  { day: "Sun", total: 4 },
];

const extractionFilesData = [
  { day: "Mon", total: 6 },
  { day: "Tue", total: 9 },
  { day: "Wed", total: 11 },
  { day: "Thu", total: 8 },
  { day: "Fri", total: 14 },
  { day: "Sat", total: 7 },
  { day: "Sun", total: 5 },
];

// Calculate totals for each file type
const totalRegularFiles = regularFilesData.reduce(
  (acc, curr) => acc + curr.total,
  0
);
const totalEblotterFiles = eblotterFilesData.reduce(
  (acc, curr) => acc + curr.total,
  0
);
const totalWomenChildrenFiles = womenChildrenFilesData.reduce(
  (acc, curr) => acc + curr.total,
  0
);
const totalExtractionFiles = extractionFilesData.reduce(
  (acc, curr) => acc + curr.total,
  0
);

const officerData = [
  { officer: "Officer A", filesUploaded: 50 },
  { officer: "Officer B", filesUploaded: 40 },
  { officer: "Officer C", filesUploaded: 30 },
];

interface BaseFile {
  title: string;
  created_by: string;
  created_at: string;
  creator?: {
    name: string;
  } | null;
}

interface RegularFile extends BaseFile {
  file_id: number;
}

interface EblotterFile extends BaseFile {
  file_id: number;
}

interface WomenChildrenFile extends BaseFile {
  file_id: number;
}

interface ExtractionFile extends BaseFile {
  extraction_id: number;
}

interface RecentFile {
  id: number;
  title: string;
  uploaded_by: string;
  file_type: "Incident report" | "eblotter" | "womenchildren" | "extraction";
  created_at: string;
}

interface CategoryCount {
  name: string;
  value: number;
}

interface UserInfo {
  name: string;
}

interface FileWithUser {
  file_id?: number;
  blotter_id?: number;
  extraction_id?: number;
  title: string;
  created_by: string;
  created_at: string;
  creator?: {
    name: string;
  };
}

interface FileCreator {
  created_by: string;
  creator: {
    name: string;
  } | null;
}

interface RecentEblotter {
  file_id: number;
  title: string;
  blotter_number: string | null;
  created_by: string;
  created_at: string;
  creator: {
    name: string;
  } | null;
}

// Add the interface after RecentEblotter interface
interface RecentExtraction {
  extraction_id: number;
  title: string;
  control_num: string;
  created_by: string;
  created_at: string;
  creator: {
    name: string;
  } | null;
}

// Add media queries for responsive design
const styles = {
  container: `p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 font-poppins`,
  cardGrid: `col-span-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2`,
  card: `border border-gray-300 rounded-lg bg-white p-1 h-24 flex flex-col justify-center`,
  cardHeader: `flex flex-row items-center justify-between text-gray-900 font-medium pb-2`,
  cardContent: `text-4xl font-bold text-gray-900 text-center`,
  cardTitle: `text-sm font-medium text-gray-700`,
  cardFooter: `text-xs text-gray-600 p-3 text-center mt-auto`,
  responsiveContainer: `w-full h-full flex items-center justify-center`,
};

export default function Dashboard() {
  const [selectedData, setSelectedData] = useState("Incident Report");
  const [currentPage, setCurrentPage] = useState(0);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [regularFilesData, setRegularFilesData] = useState(
    [] as { day: string; total: number }[]
  );
  const [eblotterFilesData, setEblotterFilesData] = useState(
    [] as { day: string; total: number }[]
  );
  const [womenChildrenFilesData, setWomenChildrenFilesData] = useState(
    [] as { day: string; total: number }[]
  );
  const [extractionFilesData, setExtractionFilesData] = useState(
    [] as { day: string; total: number }[]
  );
  const [officerData, setOfficerData] = useState(
    [] as { officer: string; filesUploaded: number }[]
  );
  const [totalRegularFiles, setTotalRegularFiles] = useState(0);
  const [totalEblotterFiles, setTotalEblotterFiles] = useState(0);
  const [totalWomenChildrenFiles, setTotalWomenChildrenFiles] = useState(0);
  const [totalExtractionFiles, setTotalExtractionFiles] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<CategoryCount[]>([]);
  const itemsPerPage = 3;
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [selectedOfficerMonth, setSelectedOfficerMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [selectedTotalMonth, setSelectedTotalMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [recentEblotters, setRecentEblotters] = useState<RecentEblotter[]>([]);
  const [recentExtractions, setRecentExtractions] = useState<RecentExtraction[]>([]);
  const navigate = useNavigate();

  // Helper function to format the selected month
  const formatSelectedMonth = (dateString: string) => {
    const [year, month] = dateString.split("-").map(Number);
    return new Date(year, month - 1).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
  };

  // Function to get month options (last 12 months)
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const label = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      options.push({ value, label });
    }

    return options;
  };

  // Helper function to get day of week from date
  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
  };

  // Helper function to get the start and end of current week
  const getCurrentWeekDates = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust when Sunday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      start: startOfWeek.toISOString(),
      end: endOfWeek.toISOString(),
    };
  };

  // Fetch file data for the chart
  useEffect(() => {
    const fetchFileData = async () => {
      try {
        setIsLoading(true);
        const { start, end } = getCurrentWeekDates();

        // Fetch weekly data for the graph
        const [
          weeklyRegular,
          weeklyEblotter,
          weeklyWomenChildren,
          weeklyExtraction,
        ] = await Promise.all([
          supabase
            .from("files")
            .select("created_at")
            .gte("created_at", start)
            .lte("created_at", end)
            .not("is_archived", "eq", true),
          supabase
            .from("eblotter_file")
            .select("created_at")
            .gte("created_at", start)
            .lte("created_at", end)
            .not("is_archived", "eq", true),
          supabase
            .from("womenchildren_file")
            .select("created_at")
            .gte("created_at", start)
            .lte("created_at", end)
            .not("is_archived", "eq", true),
          supabase
            .from("extraction")
            .select("created_at")
            .gte("created_at", start)
            .lte("created_at", end)
            .not("is_archived", "eq", true),
        ]);

        // Fetch total counts (all-time)
        const [
          totalRegular,
          totalEblotter,
          totalWomenChildren,
          totalExtraction,
        ] = await Promise.all([
          supabase
            .from("files")
            .select("file_id", { count: "exact" })
            .not("is_archived", "eq", true),
          supabase
            .from("eblotter_file")
            .select("file_id", { count: "exact" })
            .not("is_archived", "eq", true),
          supabase
            .from("womenchildren_file")
            .select("file_id", { count: "exact" })
            .not("is_archived", "eq", true),
          supabase
            .from("extraction")
            .select("extraction_id", { count: "exact" })
            .not("is_archived", "eq", true),
        ]);

        // Process the weekly data for the graph
        const regularFilesData = groupFilesByDay(weeklyRegular.data || []);
        const eblotterFilesData = groupFilesByDay(weeklyEblotter.data || []);
        const womenChildrenFilesData = groupFilesByDay(
          weeklyWomenChildren.data || []
        );
        const extractionFilesData = groupFilesByDay(
          weeklyExtraction.data || []
        );

        // Set the graph data
        setRegularFilesData(regularFilesData);
        setEblotterFilesData(eblotterFilesData);
        setWomenChildrenFilesData(womenChildrenFilesData);
        setExtractionFilesData(extractionFilesData);

        // Set the total counts (all-time)
        setTotalRegularFiles(totalRegular.count || 0);
        setTotalEblotterFiles(totalEblotter.count || 0);
        setTotalWomenChildrenFiles(totalWomenChildren.count || 0);
        setTotalExtractionFiles(totalExtraction.count || 0);
      } catch (error) {
        console.error("Error fetching file data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFileData();
  }, [selectedData]);

  // Helper function to group files by day of the week
  const groupFilesByDay = (files: any[]) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const groupedData = new Array(7).fill(0);

    files.forEach((file) => {
      const date = new Date(file.created_at);
      const dayIndex = (date.getDay() + 6) % 7; // Convert Sunday = 0 to Monday = 0
      groupedData[dayIndex]++;
    });

    return days.map((day, index) => ({
      day,
      total: groupedData[index],
    }));
  };

  // Fetch category usage data
  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        // Parse selected month
        const [year, month] = selectedMonth.split("-").map(Number);
        const startOfMonth = new Date(year, month - 1, 1).toISOString();
        const endOfMonth = new Date(year, month, 0).toISOString();

        // Get all categories with their counts from folder_categories for the selected month
        const { data: categoryUsage, error } = await supabase
          .from("categories")
          .select(
            `
            category_id,
            title,
            folder_categories!inner(
              category_id,
              folders!inner(created_at)
            )
          `
          )
          .gte("folder_categories.folders.created_at", startOfMonth)
          .lte("folder_categories.folders.created_at", endOfMonth)
          .order("title");

        if (error) throw error;

        // Transform the data to count occurrences
        const categoryCounts = (categoryUsage || []).map((category) => ({
          name: category.title,
          value: category.folder_categories?.length || 0,
        }));

        // Sort by usage count (descending)
        const sortedCategories = categoryCounts.sort(
          (a, b) => b.value - a.value
        );

        setCategoryData(sortedCategories);
      } catch (error) {
        console.error("Error fetching category data:", error);
        setCategoryData([]);
      }
    };

    fetchCategoryData();
  }, [selectedMonth]); // Add selectedMonth as dependency

  // Fetch recent files from all categories
  useEffect(() => {
    const fetchRecentFiles = async () => {
      try {
        setIsLoading(true);

        const [
          regularFiles,
          eblotterFiles,
          womenchildrenFiles,
          extractionFiles,
        ] = await Promise.all([
          // Regular files
          supabase
            .from("files")
            .select(
              `
              file_id,
              title,
              created_by,
              created_at,
              creator:users!created_by(name)
            `
            )
            .order("created_at", { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
              if (error) throw error;
              return ((data || []) as unknown as FileWithUser[]).map(
                (file) => ({
                  id: file.file_id!,
                  title: file.title,
                  uploaded_by: file.creator?.name || file.created_by,
                  created_at: file.created_at,
                  file_type: "Incident report" as const,
                })
              );
            }),

          // E-blotter files
          supabase
            .from("eblotter_file")
            .select(
              `
              file_id,
              title,
              created_by,
              created_at,
              creator:users!created_by(name)
            `
            )
            .order("created_at", { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
              if (error) throw error;
              return ((data || []) as unknown as FileWithUser[]).map(
                (file) => ({
                  id: file.file_id!,
                  title: file.title,
                  uploaded_by: file.creator?.name || file.created_by,
                  created_at: file.created_at,
                  file_type: "eblotter" as const,
                })
              );
            }),

          // Women and children files
          supabase
            .from("womenchildren_file")
            .select(
              `
              file_id,
              title,
              created_by,
              created_at,
              creator:users!created_by(name)
            `
            )
            .order("created_at", { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
              if (error) throw error;
              return ((data || []) as unknown as FileWithUser[]).map(
                (file) => ({
                  id: file.file_id!,
                  title: file.title,
                  uploaded_by: file.creator?.name || file.created_by,
                  created_at: file.created_at,
                  file_type: "womenchildren" as const,
                })
              );
            }),

          // Extraction files
          supabase
            .from("extraction")
            .select(
              `
              extraction_id,
              title,
              created_by,
              created_at,
              creator:users!created_by(name)
            `
            )
            .order("created_at", { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
              if (error) throw error;
              return ((data || []) as unknown as FileWithUser[]).map(
                (file) => ({
                  id: file.extraction_id!,
                  title: file.title,
                  uploaded_by: file.creator?.name || file.created_by,
                  created_at: file.created_at,
                  file_type: "extraction" as const,
                })
              );
            }),
        ]);

        // Combine and sort all files
        const sortedFiles = [
          ...regularFiles,
          ...eblotterFiles,
          ...womenchildrenFiles,
          ...extractionFiles,
        ]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 10);

        setRecentFiles(sortedFiles);
      } catch (error) {
        console.error("Error fetching recent files:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentFiles();
  }, []);

  // Add new useEffect for officer data with month filtering
  useEffect(() => {
    const fetchOfficerData = async () => {
      try {
        const [year, month] = selectedOfficerMonth.split("-").map(Number);
        const startOfMonth = new Date(year, month - 1, 1).toISOString();
        const endOfMonth = new Date(year, month, 0).toISOString();

        // Fetch all files created in the selected month
        const [
          regularFiles,
          eblotterFiles,
          womenchildrenFiles,
          extractionFiles,
        ] = await Promise.all([
          supabase
            .from("files")
            .select("created_by, creator:users!created_by(name)")
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth)
            .then(({ data }) => (data || []) as unknown as FileCreator[]),
          supabase
            .from("eblotter_file")
            .select("created_by, creator:users!created_by(name)")
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth)
            .then(({ data }) => (data || []) as unknown as FileCreator[]),
          supabase
            .from("womenchildren_file")
            .select("created_by, creator:users!created_by(name)")
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth)
            .then(({ data }) => (data || []) as unknown as FileCreator[]),
          supabase
            .from("extraction")
            .select("created_by, creator:users!created_by(name)")
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth)
            .then(({ data }) => (data || []) as unknown as FileCreator[]),
        ]);

        // Combine all files and count by officer
        const allFiles = [
          ...regularFiles,
          ...eblotterFiles,
          ...womenchildrenFiles,
          ...extractionFiles,
        ];

        const officerCounts = new Map<string, number>();

        allFiles.forEach((file) => {
          const officerName = file.creator?.name || "Unknown";
          officerCounts.set(
            officerName,
            (officerCounts.get(officerName) || 0) + 1
          );
        });

        // Convert to array and sort by number of files
        const sortedOfficers = Array.from(officerCounts.entries())
          .map(([officer, filesUploaded]) => ({ officer, filesUploaded }))
          .sort((a, b) => b.filesUploaded - a.filesUploaded);

        setOfficerData(sortedOfficers);
      } catch (error) {
        console.error("Error fetching officer data:", error);
      }
    };

    fetchOfficerData();
  }, [selectedOfficerMonth]);

  // Add new useEffect for monthly totals
  useEffect(() => {
    const fetchMonthlyTotals = async () => {
      try {
        const [year, month] = selectedTotalMonth.split("-").map(Number);
        const startOfMonth = new Date(year, month - 1, 1).toISOString();
        const endOfMonth = new Date(year, month, 0).toISOString();

        const [
          regularFiles,
          eblotterFiles,
          womenchildrenFiles,
          extractionFiles,
        ] = await Promise.all([
          supabase
            .from("files")
            .select("file_id", { count: "exact" })
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth),
          supabase
            .from("eblotter_file")
            .select("file_id", { count: "exact" })
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth),
          supabase
            .from("womenchildren_file")
            .select("file_id", { count: "exact" })
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth),
          supabase
            .from("extraction")
            .select("extraction_id", { count: "exact" })
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth),
        ]);

        setTotalRegularFiles(regularFiles.count || 0);
        setTotalEblotterFiles(eblotterFiles.count || 0);
        setTotalWomenChildrenFiles(womenchildrenFiles.count || 0);
        setTotalExtractionFiles(extractionFiles.count || 0);
      } catch (error) {
        console.error("Error fetching monthly totals:", error);
      }
    };

    fetchMonthlyTotals();
  }, [selectedTotalMonth]);

  const fetchRecentEblotters = async () => {
    try {
      const { data, error } = await supabase
        .from('eblotter_file')
        .select(`
          file_id,
          title,
          blotter_number,
          created_by,
          created_at,
          creator:users!created_by(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Format the data to match the RecentEblotter interface
      const formattedData = (data || []).map((item: any) => ({
        file_id: item.file_id,
        title: item.title,
        blotter_number: item.blotter_number,
        created_by: item.created_by,
        created_at: item.created_at,
        creator: item.creator || { name: item.created_by }
      }));

      setRecentEblotters(formattedData);
    } catch (error) {
      console.error('Error fetching recent e-blotter entries:', error);
      setRecentEblotters([]);
    }
  };

  // Add the fetch function after fetchRecentEblotters
  const fetchRecentExtractions = async () => {
    try {
      const { data: extractionData, error: extractionError } = await supabase
        .from('extraction')
        .select(`
          extraction_id,
          title,
          control_num,
          created_by,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (extractionError) throw extractionError;

      // Fetch creator names in a separate query
      const creatorIds = [...new Set((extractionData || []).map(item => item.created_by))];
      const { data: creatorData, error: creatorError } = await supabase
        .from('users')
        .select('id:user_id, name')
        .in('user_id', creatorIds);

      if (creatorError) throw creatorError;

      // Create a map of creator IDs to names
      const creatorMap = new Map(
        (creatorData || []).map(creator => [creator.id, { name: creator.name }])
      );

      // Transform the data to match the RecentExtraction interface
      const transformedData: RecentExtraction[] = (extractionData || []).map(item => ({
        extraction_id: item.extraction_id,
        title: item.title,
        control_num: item.control_num,
        created_by: item.created_by,
        created_at: item.created_at,
        creator: creatorMap.get(item.created_by) || null
      }));

      setRecentExtractions(transformedData);
    } catch (error) {
      console.error('Error fetching recent extractions:', error);
    }
  };

  // Add fetchRecentExtractions to useEffect
  useEffect(() => {
    fetchRecentEblotters();
    fetchRecentExtractions();
  }, []);

  const handleDataChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedData(event.target.value);
  };

  const pageCount = Math.ceil(recentFiles.length / itemsPerPage);

  const handlePageClick = (data: { selected: number }) => {
    setCurrentPage(data.selected);
  };

  const currentItems = recentFiles.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  // Function to get file type display name
  const getFileTypeDisplay = (type: string) => {
    switch (type) {
      case "Incident Report":
        return "Incident Report";
      case "eblotter":
        return "E-Blotter";
      case "womenchildren":
        return "Women & Children";
      case "extraction":
        return "Extraction";
      default:
        return type;
    }
  };

  // Get the appropriate data and total based on the selected data type
  const getSelectedData = () => {
    switch (selectedData) {
      case "regularFiles":
        return { data: regularFilesData, total: totalRegularFiles };
      case "eblotterFiles":
        return { data: eblotterFilesData, total: totalEblotterFiles };
      case "womenChildrenFiles":
        return { data: womenChildrenFilesData, total: totalWomenChildrenFiles };
      case "extractionFiles":
        return { data: extractionFilesData, total: totalExtractionFiles };
      case "officerUploads":
        return {
          data: officerData,
          total: officerData.reduce((acc, curr) => acc + curr.filesUploaded, 0),
        };
      default:
        return { data: regularFilesData, total: totalRegularFiles };
    }
  };

  return (
    <div className={styles.container}>
      <h1 className="text-2xl font-medium mb-4 text-blue-900 col-span-full">
        Dashboard
      </h1>

      {/* Total Files Section */}
      <div className={styles.cardGrid}>
        {/* Total Files */}
        <Card className={styles.card}>
          <CardHeader className={styles.cardHeader}>
            <div className="flex items-center gap-2">
              <Files className="w-4 h-4 text-gray-500" />
              <CardTitle className={styles.cardTitle}>
                Total Files Uploaded
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className={styles.cardContent}>
            {(
              totalRegularFiles +
              totalEblotterFiles +
              totalWomenChildrenFiles +
              totalExtractionFiles
            ).toLocaleString()}
          </CardContent>
        </Card>

        {/* Incident Reports */}
        <Card className="border border-gray-300 rounded-lg bg-blue-100 p-1 h-24 flex flex-col justify-center">
          <CardHeader className={styles.cardHeader}>
            <div className="flex items-center gap-2">
              <FileTextIcon className="w-5 h-5 text-blue-600" />
              <CardTitle className={styles.cardTitle}>
                Incident Reports
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className={styles.cardContent}>
            {totalRegularFiles}
          </CardContent>
        </Card>

        {/* E-Blotter */}
        <Card className="border border-gray-300 rounded-lg bg-green-100 p-1 h-24 flex flex-col justify-center">
          <CardHeader className={styles.cardHeader}>
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-600" />
              <CardTitle className={styles.cardTitle}>
                Blotter Reports
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className={styles.cardContent}>
            {totalEblotterFiles}
          </CardContent>
        </Card>

        {/* Women & Children */}
        <Card className="border border-gray-300 rounded-lg bg-purple-100 p-1 h-24 flex flex-col justify-center">
          <CardHeader className={styles.cardHeader}>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <CardTitle className={styles.cardTitle}>
                Women & Children
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className={styles.cardContent}>
            {totalWomenChildrenFiles}
          </CardContent>
        </Card>

        {/* Extraction */}
        <Card className="border border-gray-300 rounded-lg bg-orange-100 p-1 h-24 flex flex-col justify-center">
          <CardHeader className={styles.cardHeader}>
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-orange-600" />
              <CardTitle className={styles.cardTitle}>
                Extraction
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className={styles.cardContent}>
            {totalExtractionFiles}
          </CardContent>
        </Card>
      </div>

      {/* File Statistics Card */}
      <Card className="p-3 shadow-md col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-lg bg-white flex flex-col">
        <CardHeader className="p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Daily Files Statistics
            </CardTitle>
            <span className="text-muted-foreground text-sm">
              {selectedData === "Incident Report"
                ? "Incident Report"
                : selectedData === "eblotterFiles"
                ? "E-Blotter Files"
                : selectedData === "womenChildrenFiles"
                ? "Women & Children Files"
                : "Extraction Files"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <label
              htmlFor="data-select"
              className="mr-2 text-xs font-medium text-gray-700"
            >
              Select File Type:
              </label>
              <select
                id="data-select"
                value={selectedData}
                onChange={handleDataChange}
              className="p-1 font-poppins border rounded-lg text-xs"
            >
              <option value="Incident Report">Incident Report</option>
              <option value="eblotterFiles">E-Blotter Files</option>
              <option value="womenChildrenFiles">Women & Children Files</option>
              <option value="extractionFiles">Extraction Files</option>
              </select>
            </div>
        </CardHeader>

        <CardContent className="h-36 p-2 flex items-center justify-center flex-grow">
          {isLoading || !getSelectedData().data.length ? (
            <div className={styles.responsiveContainer}>
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" aspect={3.5}>
              <AreaChart
                data={getSelectedData().data}
                margin={{
                  top: 10,
                  right: 50,
                  left: 0,
                  bottom: 0,
                }}
                key={JSON.stringify(getSelectedData().data)}
              >
                {/* X-Axis for days */}
                <XAxis
                  dataKey="day"
                  stroke="#2563eb"
                  tickFormatter={(tick) => tick}
                  className="text-sm"
                />

                {/* Y-Axis with whole number values */}
                <YAxis
                  stroke="#2563eb"
                  tickFormatter={(tick) => `${Math.floor(tick)}`}
                  domain={["auto", "auto"]}
                  allowDecimals={false}
                  className="text-sm"
                />

                <Tooltip />

                {/* Area chart with updated color for a more cohesive look */}
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#1d4ed8" // Updated line color to a darker blue
                  fill="#2563eb" // Updated fill color to a lighter blue
                  fillOpacity={0.3} // Make the fill semi-transparent
                  animationDuration={1500} // Set animation duration
                  animationEasing="ease-in-out" // Set animation easing to smoothen transition
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>

        <CardFooter className={styles.cardFooter}>
          {isLoading ? (
            <Skeleton className="h-5 w-32 mx-auto" />
          ) : getSelectedData().data.length === 0 ? (
            <span>No data to display</span>
          ) : (
            <span>
              Total this week: {" "}
              {selectedData === "officerUploads"
                ? getSelectedData().data.reduce(
                    (sum, item) =>
                      sum + (item as { filesUploaded: number }).filesUploaded,
                    0
                  )
                : getSelectedData().data.reduce(
                    (sum, item) => sum + (item as { total: number }).total,
                    0
                  )}
            </span>
          )}
        </CardFooter>
      </Card>

      {/* Category Distribution Card */}
      <Card className="p-3 shadow-md col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-lg bg-white flex flex-col">
        <CardHeader className="p-2">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Crime Category Distribution
          </CardTitle>
          <div className="flex items-center mt-3 justify-between w-full">
            <label className="text-xs font-medium text-gray-700 mr-2">
              Select Month:
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px] h-7 text-xs m-1">
                <SelectValue placeholder="Select month">
                  {formatSelectedMonth(selectedMonth)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="h-44 overflow-hidden flex flex-row">
          {categoryData.length > 0 ? (
            <div className="flex flex-row w-full">
              {/* Treemap Chart */}
              <ResponsiveContainer width="75%" height={180}>
                <Treemap
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  fill="#3b82f6"
                >
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value}`,
                      `${name}`,
                    ]}
                  />
                </Treemap>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-col items-start w-1/4 p-2 text-xs">
                {categoryData.map((entry, index) => (
                  <div
                    key={entry.name}
                    className="flex items-center text-gray-600 gap-1.5 leading-none mb-1"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "#3b82f6" : "#2563eb",
                      }}
                    />
                    <span className="text-[11px]">{entry.name}</span>
                    <span className="text-[11px] font-medium">
                      ({entry.value})
          </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.responsiveContainer}>
              <Skeleton className="h-full w-full" />
            </div>
          )}
        </CardContent>

        <CardFooter className={styles.cardFooter}>
          {categoryData.length > 0 ? (
            <div className="flex items-center text-xs">
              Most used category: {" "}
              <span className="mr-1 ml-2">{categoryData[0]?.name}</span>
              <span>({categoryData[0]?.value} folders)</span>
          </div>
          ) : (
            <span className="text-sm">No data to display</span>
          )}
        </CardFooter>
      </Card>

      {/* Officer Upload Stats Card */}
      <Card className="p-3 shadow-md col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-lg bg-white flex flex-col">
        <CardHeader className="p-2">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Officer Upload Statistics
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Files uploaded by officers
          </CardDescription>
          <div className="flex items-center mt-3">
            <label className="text-xs font-medium text-gray-700 mr-2 w-[500px]">
              Select Month:
            </label>
            <Select
              value={selectedOfficerMonth}
              onValueChange={setSelectedOfficerMonth}
            >
              <SelectTrigger className="h-7 text-xs border m-1 rounded-lg shadow-none">
                <SelectValue placeholder="Select month">
                  {isLoading ? (
                    <Skeleton className="h-5 w-32" />
                  ) : (
                    formatSelectedMonth(selectedOfficerMonth)
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-xs"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-grow overflow-y-auto">
          {isLoading ? (
            <div className={styles.responsiveContainer}>
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {officerData.map((officer) => (
                <div
                  key={officer.officer}
                  className="flex items-center justify-between p-2 border-b border-gray-200"
                >
                  <div className="flex items-center">
                    {/* Assuming officer.avatar is a valid URL */}
                    <img
                      src="/assets/RACU.png"
                      alt={officer.officer}
                      className="h-8 w-8 rounded-full mr-4"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {officer.officer}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {officer.filesUploaded} files uploaded
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className={styles.cardFooter}>
          {isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : officerData.length === 0 ? (
            <span>No data to display</span>
          ) : (
            <span>
              Total Uploads: {" "}
              {officerData.reduce((acc, curr) => acc + curr.filesUploaded, 0)}
            </span>
          )}
        </CardFooter>
      </Card>

      {/* Recent Files Upload Card */}
      <Card className="p-3 shadow-md col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-lg bg-white">
        <CardHeader className="p-2">
          <CardTitle className="text-lg font-semibold text-gray-900">
          Recent Files Upload
          </CardTitle>
        </CardHeader>

        <CardContent className="h-52 overflow-auto">
          <div className="w-full h-full">
            {isLoading ? (
              <div className={styles.responsiveContainer}>
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <table className="min-w-full border-collapse table-auto text-xs">
                <thead className="bg-blue-100 text-blue-900">
                  <tr>
                    <th className="px-6 py-3 text-left border-b">File</th>
                    <th className="px-6 py-3 text-left border-b">
                      Uploaded By
                    </th>
                    <th className="px-6 py-3 text-left border-b">File Type</th>
                    <th className="px-6 py-3 text-left border-b">
                      Upload Time
                    </th>
                </tr>
              </thead>
              <tbody>
                  {currentItems.map((file) => (
                    <tr
                      key={`${file.file_type}-${file.id}`}
                      className="hover:bg-blue-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-2 border-b">{file.title}</td>

                      {/* Uploaded By Column with Avatar (with fallback image) */}
                      <td className="px-6 py-2 border-b flex items-center space-x-2">
                        {/* Check if officer image exists, otherwise fallback to default image */}
                        <img
                          src="/assets/RACU.png" // Use the fallback image if uploaded_by_image is not provided
                          alt={file.uploaded_by}
                          className="h-8 w-8 rounded-full"
                        />
                        <span>{file.uploaded_by}</span>
                      </td>

                      <td className="px-6 py-2 border-b">
                        {getFileTypeDisplay(file.file_type)}
                      </td>
                      <td className="px-6 py-2 border-b">
                        {new Date(file.created_at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })} {" "}
                        - {" "}
                        {new Date(file.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "Asia/Taipei", // Taiwan timezone
                        })}
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Pagination>
            <PaginationContent className="flex items-center space-x-2">
              <PaginationItem>
                <PaginationLink
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(0, prev - 1))
                  }
                  aria-disabled={currentPage === 0}
                  className="text-xs mr-7"
                >
                  <PaginationPrevious />
                </PaginationLink>
              </PaginationItem>

              {Array.from({ length: pageCount }, (_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    onClick={() => setCurrentPage(i)}
                    isActive={currentPage === i}
                    className="text-xs"
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationLink
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(pageCount - 1, prev + 1))
                  }
                  aria-disabled={currentPage === pageCount - 1}
                  className="text-xs mx-3"
                >
                  <PaginationNext />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      </Card>

      {/* Recent E-Blotter Entries */}
      <Card 
        className="p-3 shadow-md col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-lg bg-white"
      >
        <CardHeader className="p-2">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Recent E-Blotter Entries
          </CardTitle>
        </CardHeader>

        <CardContent className="h-52 overflow-auto">
          {recentEblotters.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500">No recent e-blotter entries found</p>
            </div>
          ) : (
            <table className="min-w-full border-collapse table-auto text-xs">
              <thead className="bg-blue-100 text-blue-900">
                <tr>
                  <th className="px-6 py-3 text-left border-b">Entry Number</th>
                  <th className="px-6 py-3 text-left border-b">Title</th>
                  <th className="px-6 py-3 text-left border-b">Created By</th>
                  <th className="px-6 py-3 text-left border-b">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentEblotters.map((eblotter) => (
                  <tr
                    key={eblotter.file_id}
                    className="hover:bg-blue-50 transition-colors duration-200"
                  >
                    <td className="px-6 py-2 border-b">
                      <span className="font-medium text-blue-900">
                        {eblotter.blotter_number || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-2 border-b">{eblotter.title}</td>
                    <td className="px-6 py-2 border-b flex items-center space-x-2">
                      <img
                        src="/assets/RACU.png"
                        alt={eblotter.creator?.name || "Unknown"}
                        className="h-8 w-8 rounded-full"
                      />
                      <span>{eblotter.creator?.name || "Unknown"}</span>
                    </td>
                    <td className="px-6 py-2 border-b">
                      {new Date(eblotter.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })} {" "}
                      - {" "}
                      {new Date(eblotter.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Taipei",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Recent Extractions */}
      <Card className="p-3 shadow-md col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-lg bg-white">
        <CardHeader className="p-2">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Recent Extractions
          </CardTitle>
        </CardHeader>

        <CardContent className="h-52 overflow-auto">
          {recentExtractions.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500">No recent extractions found</p>
            </div>
          ) : (
            <table className="min-w-full border-collapse table-auto text-xs">
              <thead className="bg-blue-100 text-blue-900">
                <tr>
                  <th className="px-6 py-3 text-left border-b">Control Number</th>
                  <th className="px-6 py-3 text-left border-b">Title</th>
                  <th className="px-6 py-3 text-left border-b">Created By</th>
                  <th className="px-6 py-3 text-left border-b">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentExtractions.map((extraction) => (
                  <tr
                    key={extraction.extraction_id}
                    className="hover:bg-blue-50 transition-colors duration-200"
                  >
                    <td className="px-6 py-2 border-b">
                      <span className="font-medium text-blue-900">
                        {extraction.control_num || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-2 border-b">{extraction.title}</td>
                    <td className="px-6 py-2 border-b flex items-center space-x-2">
                      <img
                        src="/assets/RACU.png"
                        alt={extraction.creator?.name || "Unknown"}
                        className="h-8 w-8 rounded-full"
                      />
                      <span>{extraction.creator?.name || extraction.created_by}</span>
                    </td>
                    <td className="px-6 py-2 border-b">
                      {new Date(extraction.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })} {" "}
                      - {" "}
                      {new Date(extraction.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Taipei",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
