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
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Treemap,
  Legend,
  CartesianGrid,
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
import { Users, Archive, Files, FileTextIcon, FileCheck, Calendar, Loader2, FileSearch, File, FileText, Upload, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    public_url: string | null;
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
  container: `p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 font-poppins max-w-screen-xl mx-auto`,
  cardGrid: `col-span-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2`,
  card: `border border-gray-300 rounded-lg bg-white p-1 h-24 flex flex-col justify-center shadow-sm `,
  cardHeader: `flex flex-row items-center justify-between text-gray-900 font-medium pb-2`,
  cardContent: `text-4xl font-bold text-gray-900 text-center`,
  cardTitle: `text-sm font-medium text-gray-700`,
  cardFooter: `text-xs text-gray-600 p-3 text-center mt-auto`,
  responsiveContainer: `w-full h-full flex items-center justify-center`,
};

// Add this interface for the time-based category data
interface CategoryTimeData {
  time: string;
  count: number;
  category: string;
}

// Add this interface for category options
interface CategoryOption {
  value: string;
  label: string;
}

export default function Dashboard() {
  const [selectedData, setSelectedData] = useState("incidentReport");
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
    [] as { officer: string; filesUploaded: number; public_url: string | null }[]
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
  const [currentEblotterPage, setCurrentEblotterPage] = useState(0);
  const [currentExtractionPage, setCurrentExtractionPage] = useState(0);
  const navigate = useNavigate();

  // Add new state variables for the category time graph
  const [categoryTimeData, setCategoryTimeData] = useState<CategoryTimeData[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isLoadingCategoryData, setIsLoadingCategoryData] = useState<boolean>(false);

  // Handler functions for date pickers
  const handleStartDateChange = (date: Date | null): void => {
    if (date) {
      setStartDate(date);
    }
  };

  const handleEndDateChange = (date: Date | null): void => {
    if (date) {
      setEndDate(date);
    }
  };

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
            .select("created_by, creator:users!created_by(name, public_url)")
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth)
            .then(({ data }) => (data || []) as unknown as FileCreator[]),
          supabase
            .from("eblotter_file")
            .select("created_by, creator:users!created_by(name, public_url)")
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth)
            .then(({ data }) => (data || []) as unknown as FileCreator[]),
          supabase
            .from("womenchildren_file")
            .select("created_by, creator:users!created_by(name, public_url)")
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth)
            .then(({ data }) => (data || []) as unknown as FileCreator[]),
          supabase
            .from("extraction")
            .select("created_by, creator:users!created_by(name, public_url)")
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

        const officerCounts = new Map<string, { filesUploaded: number; public_url: string | null }>();

        allFiles.forEach((file) => {
          const officerName = file.creator?.name || "Unknown";
          const publicUrl = file.creator?.public_url || null;
          const currentCount = officerCounts.get(officerName) || { filesUploaded: 0, public_url: publicUrl };
          officerCounts.set(
            officerName,
            {
              filesUploaded: currentCount.filesUploaded + 1,
              public_url: publicUrl
            }
          );
        });

        // Convert to array and sort by number of files
        const sortedOfficers = Array.from(officerCounts.entries())
          .map(([officer, data]) => ({
            officer,
            filesUploaded: data.filesUploaded,
            public_url: data.public_url
          }))
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

  const handleDataChange = (value: string) => {
    setSelectedData(value);
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

  // Add useEffect to fetch available categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("category_id, title")
          .order("title");

        if (error) throw error;

        const options: CategoryOption[] = (data || []).map((category) => ({
          value: category.category_id,
          label: category.title,
        }));

        setCategoryOptions(options);
        if (options.length > 0) {
          setSelectedCategory(options[0].value);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Add function to fetch category time data
  const fetchCategoryTimeData = async () => {
    if (!selectedCategory || !startDate || !endDate) return;

    try {
      setIsLoadingCategoryData(true);

      // Format dates for Supabase query
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = endDate.toISOString();

      // First, get folders with the selected category
      const { data: folderData, error: folderError } = await supabase
        .from("folder_categories")
        .select(`
          folders!inner(
            folder_id,
            files(file_id, reporting_person_details(time_of_incident, date_of_incident)),
            eblotter_file(file_id, reporting_person_details(time_of_incident, date_of_incident)),
            womenchildren_file(file_id, reporting_person_details(time_of_incident, date_of_incident))
          )
        `)
        .eq("category_id", selectedCategory);

      if (folderError) throw folderError;

      // Process the data to get counts by time
      const timeCountMap: Map<string, number> = new Map();

      // Process all folders with the selected category
      (folderData || []).forEach((folderCategory: any) => {
        const folder = folderCategory.folders;

        // Process regular files
        if (folder && folder.files && Array.isArray(folder.files)) {
          folder.files.forEach((file: any) => {
            if (file && file.reporting_person_details && Array.isArray(file.reporting_person_details)) {
              file.reporting_person_details.forEach((report: any) => {
                if (report.date_of_incident &&
                  new Date(report.date_of_incident) >= startDate &&
                  new Date(report.date_of_incident) <= endDate) {

                  // Format the time for display (using just the hour)
                  const timeOfIncident = report.time_of_incident || "00:00:00";
                  const hour = timeOfIncident.split(":")[0];
                  const timeKey = `${hour}:00`;

                  // Increment the count for this time
                  timeCountMap.set(timeKey, (timeCountMap.get(timeKey) || 0) + 1);
                }
              });
            }
          });
        }

        // Process e-blotter files
        if (folder && folder.eblotter_file && Array.isArray(folder.eblotter_file)) {
          folder.eblotter_file.forEach((file: any) => {
            if (file && file.reporting_person_details && Array.isArray(file.reporting_person_details)) {
              file.reporting_person_details.forEach((report: any) => {
                if (report.date_of_incident &&
                  new Date(report.date_of_incident) >= startDate &&
                  new Date(report.date_of_incident) <= endDate) {

                  const timeOfIncident = report.time_of_incident || "00:00:00";
                  const hour = timeOfIncident.split(":")[0];
                  const timeKey = `${hour}:00`;

                  timeCountMap.set(timeKey, (timeCountMap.get(timeKey) || 0) + 1);
                }
              });
            }
          });
        }

        // Process women and children files
        if (folder && folder.womenchildren_file && Array.isArray(folder.womenchildren_file)) {
          folder.womenchildren_file.forEach((file: any) => {
            if (file && file.reporting_person_details && Array.isArray(file.reporting_person_details)) {
              file.reporting_person_details.forEach((report: any) => {
                if (report.date_of_incident &&
                  new Date(report.date_of_incident) >= startDate &&
                  new Date(report.date_of_incident) <= endDate) {

                  const timeOfIncident = report.time_of_incident || "00:00:00";
                  const hour = timeOfIncident.split(":")[0];
                  const timeKey = `${hour}:00`;

                  timeCountMap.set(timeKey, (timeCountMap.get(timeKey) || 0) + 1);
                }
              });
            }
          });
        }
      });

      // Get the selected category name
      const categoryName = categoryOptions.find(
        (cat) => cat.value === selectedCategory
      )?.label || "Unknown";

      // Convert the map to an array for the chart
      const chartData: CategoryTimeData[] = Array.from(timeCountMap.entries())
        .map(([time, count]) => ({
          time,
          count,
          category: categoryName,
        }))
        .sort((a, b) => {
          // Sort by hour
          const hourA = parseInt(a.time.split(":")[0]);
          const hourB = parseInt(b.time.split(":")[0]);
          return hourA - hourB;
        });

      setCategoryTimeData(chartData);
    } catch (error) {
      console.error("Error fetching category time data:", error);
    } finally {
      setIsLoadingCategoryData(false);
    }
  };

  // Add useEffect to fetch data when filters change
  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryTimeData();
    }
  }, [selectedCategory, startDate, endDate]);

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
        <Card className="border border-gray-300 rounded-lg bg-blue-100 p-1 h-24 flex flex-col justify-center shadow-sm">
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
        <Card className="border border-gray-300 rounded-lg bg-green-100 p-1 h-24 flex flex-col justify-center shadow-sm">
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
        <Card className="border border-gray-300 rounded-lg bg-purple-100 p-1 h-24 flex flex-col justify-center shadow-sm">
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
        <Card className="border border-gray-300 rounded-lg bg-orange-100 p-1 h-24 flex flex-col justify-center shadow-sm">
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
      <Card className="p-4 shadow-sm col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-lg bg-white flex flex-col">
        <CardHeader className="p-0">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
              Daily Files Statistics
            </CardTitle>
            <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              {selectedData === "incidentReport"
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
              className="text-xs sm:text-sm font-medium text-gray-700"
            >
              File Type:
            </label>
            <Select
              value={selectedData}
              onValueChange={(value: string) => handleDataChange(value)}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs sm:text-sm">
                <SelectValue placeholder="Select file type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="incidentReport" className="text-xs sm:text-sm">
                  Incident Report
                </SelectItem>
                <SelectItem value="eblotterFiles" className="text-xs sm:text-sm">
                  E-Blotter Files
                </SelectItem>
                <SelectItem value="womenChildrenFiles" className="text-xs sm:text-sm">
                  Women & Children Files
                </SelectItem>
                <SelectItem value="extractionFiles" className="text-xs sm:text-sm">
                  Extraction Files
                </SelectItem>
              </SelectContent>
            </Select>

          </div>
        </CardHeader>

        <CardContent className="flex-grow p-0 mt-3">
          {isLoading || !getSelectedData().data.length ? (
            <div className="h-full w-full flex items-center justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <p className="text-xs text-gray-500">Loading data...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileSearch className="h-6 w-6 text-gray-300" />
                  <p className="text-xs text-gray-500">No data available</p>
                </div>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={getSelectedData().data}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                  tickMargin={8}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(tick) => `${Math.floor(tick)}`}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: "6px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    border: "none",
                    fontSize: "12px"
                  }}
                  formatter={(value) => [`${value} files`, "Count"]}
                  labelFormatter={(label) => `Day: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#colorTotal)"
                  fillOpacity={1}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>

        <CardFooter className="p-0 pt-3 text-xs sm:text-sm border-t border-gray-100 mt-auto">
          {isLoading ? (
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse"></div>
          ) : getSelectedData().data.length === 0 ? (
            <span className="text-gray-500">No data to display</span>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-gray-600">
                Weekly Total:{" "}
                <span className="font-medium text-gray-800">
                  {(() => {
                    const data = getSelectedData().data;
                    if (selectedData === "officerUploads") {
                      return data.reduce((sum, item) => {
                        if ("filesUploaded" in item) {
                          return sum + item.filesUploaded;
                        }
                        return sum;
                      }, 0);
                    } else {
                      return data.reduce((sum, item) => {
                        if ("total" in item) {
                          return sum + item.total;
                        }
                        return sum;
                      }, 0);
                    }
                  })()}

                </span>
              </span>
              <span className="text-gray-600">
                Peak Day:{" "}
                <span className="font-medium text-gray-800">
                  {(() => {
                    const data = getSelectedData().data;
                    if (selectedData === "officerUploads") return "-";

                    const peak = data.reduce(
                      (max, item) => {
                        if ("total" in item && item.total > max.total) return item;
                        return max;
                      },
                      { day: "", total: 0 }
                    );
                    return peak.day || "-";
                  })()}

                </span>
              </span>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Category Distribution Card */}
      <Card className="p-4 shadow-sm col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-lg bg-white flex flex-col">
        <CardHeader className="p-0 pb-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
              Crime Category Distribution
            </CardTitle>
            <div className="flex items-center justify-between w-full mt-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">
                Select Month:
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px] sm:w-[180px] h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="Select month">
                    {formatSelectedMonth(selectedMonth)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-xs sm:text-sm"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-0">
          {categoryData.length > 0 ? (
            <div className="flex h-full">
              {/* Treemap Chart - 70% width */}
              <div className="w-[70%] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill="#3b82f6"
                  >
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [
                        `${value}`,
                        `${name}`,
                      ]}
                      contentStyle={{
                        borderRadius: "6px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        fontSize: "12px"
                      }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </div>

              {/* Legend - 30% width with scroll */}
              <div className="w-[30%] h-full overflow-y-auto p-2">
                <div className="flex flex-col gap-1.5">
                  {categoryData.map((entry, index) => (
                    <div
                      key={`${entry.name}-${index}`}
                      className="flex items-center text-gray-700"
                    >
                      <div
                        className="w-3 h-3 rounded-sm mr-2 flex-shrink-0"
                        style={{
                          backgroundColor: index % 2 === 0 ? "#3b82f6" : "#2563eb",
                        }}
                      />
                      <span className="text-xs truncate">{entry.name}</span>
                      <span className="text-xs font-medium ml-auto pl-2">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          )}
        </CardContent>

        <CardFooter className="p-0 pt-2 text-xs border-t border-gray-100 mt-auto">
          {categoryData.length > 0 ? (
            <div className="flex items-center w-full justify-between">
              <div className="text-gray-600">
                Most frequent category:{" "}
                <span className="font-medium text-gray-800">
                  {categoryData[0]?.name}
                </span>
              </div>
              <div className="text-gray-600">
                Count:{" "}
                <span className="font-medium text-gray-800">
                  {categoryData[0]?.value}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 italic">No data available</div>
          )}
        </CardFooter>
      </Card>

      {/* Category Time Analysis Card */}
      <Card className="col-span-4 p-6 shadow-md rounded-xl bg-white flex flex-col h-full p-4 shadow-sm col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 h-150 rounded-2xl bg-white flex flex-col">
        <CardHeader className="p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Incident Time Analysis by Category
            </CardTitle>
            <CardDescription className="text-sm text-gray-500">
              Number of incidents by time of day when they occurred for selected category
            </CardDescription>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">
                Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 text-sm border rounded-lg shadow-sm w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-sm"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate?.toISOString().split("T")[0]}
                  onChange={(e) => handleStartDateChange(new Date(e.target.value))}
                  className="h-9 text-sm w-full"
                />
                <span className="text-xs text-gray-500">to</span>
                <Input
                  type="date"
                  value={endDate?.toISOString().split("T")[0]}
                  onChange={(e) => handleEndDateChange(new Date(e.target.value))}
                  className="h-9 text-sm w-full"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                size="sm"
                onClick={fetchCategoryTimeData}
                className="h-9 text-sm w-full bg-blue-900 hover:bg-blue-800"
                disabled={!selectedCategory}
              >
                {isLoadingCategoryData ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  "Refresh Data"
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-grow min-h-[300px] mt-6">
          {isLoadingCategoryData ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">Loading data...</p>
              </div>
            </div>
          ) : categoryTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={categoryTimeData}
                margin={{
                  top: 16,
                  right: 24,
                  left: 16,
                  bottom: 16,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#64748b"
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    border: "none"
                  }}
                  formatter={(value) => [`${value} incidents`, "Count"]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Incident Count"
                  dot={{ stroke: '#2563eb', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#1d4ed8', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
              <Calendar className="h-10 w-10 text-gray-300" />
              <p className="text-gray-500 text-center text-sm">
                {selectedCategory
                  ? "No data available for the selected filters"
                  : "Please select a category to view data"}
              </p>
              {!selectedCategory && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-blue-600"
                  onClick={() => document.getElementById('category-select')?.focus()}
                >
                  Select a category
                </Button>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-0 pt-6 text-xs text-gray-500">
          {isLoadingCategoryData ? (
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse"></div>
          ) : categoryTimeData.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">
                Total Incidents: {categoryTimeData.reduce((sum, item) => sum + item.count, 0)}
              </span>
              <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">
                Peak Time: {
                  categoryTimeData.reduce(
                    (peak, item) => item.count > peak.count ? item : peak,
                    { time: "N/A", count: 0, category: "" }
                  ).time
                }
              </span>
              <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">
                Average per hour: {Math.round(categoryTimeData.reduce((sum, item) => sum + item.count, 0) / categoryTimeData.length)}
              </span>
            </div>
          ) : (
            <span>Select filters and refresh to view analytics</span>
          )}
        </CardFooter>
      </Card>

      {/* Officer Upload Stats Card */}
      <Card className="p-4 shadow-sm col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-xl bg-white flex flex-col">
        <CardHeader className="p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
              Officer Upload Statistics
            </CardTitle>
          </div>

          <div className="flex items-center justify-between mt-3">
            <label className="text-xs sm:text-sm font-medium text-gray-700">
              Select Month:
            </label>
            <Select
              value={selectedOfficerMonth}
              onValueChange={setSelectedOfficerMonth}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs sm:text-sm">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select month">
                    {formatSelectedMonth(selectedOfficerMonth)}
                  </SelectValue>
                )}
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-xs sm:text-sm"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-0 mt-3 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : officerData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <Upload className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No uploads this month</p>
            </div>
          ) : (
            <div className="space-y-2">
              {officerData.map((officer) => (
                <div
                  key={officer.officer}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={officer.public_url || "/assets/RACU.png"}
                        alt={officer.officer}
                        className="h-10 w-10 rounded-full object-cover border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = "/assets/RACU.png";
                        }}
                      />
                      <div className="absolute -bottom-1 -right-1 bg-blue-100 rounded-full p-1">
                        <User className="h-3 w-3 text-blue-600" />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[180px]">
                      {officer.officer}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {officer.filesUploaded}
                    </span>
                    <span className="text-xs text-gray-500">files</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-0 pt-3 border-t border-gray-100">
          {isLoading ? (
            <Skeleton className="h-5 w-full" />
          ) : officerData.length === 0 ? (
            <p className="text-xs text-gray-500">No upload data available</p>
          ) : (
            <div className="w-full flex justify-between items-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Total uploads:{" "}
                <span className="font-medium text-gray-900">
                  {officerData.reduce((acc, curr) => acc + curr.filesUploaded, 0)}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {officerData.length} {officerData.length === 1 ? "officer" : "officers"}
              </p>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Recent Files Upload Card */}
      <Card className="p-4 shadow-sm col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-xl bg-white flex flex-col">
        <CardHeader className="p-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
              Recent File Uploads
            </CardTitle>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              {currentItems.length} files
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-0 mt-3 overflow-hidden">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <p className="text-xs text-gray-500">Loading files...</p>
              </div>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2">
              <File className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No recent files found</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="overflow-auto flex-grow">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="text-left text-xs sm:text-sm text-gray-600 border-b">
                      <th className="px-3 py-2 font-medium">File</th>
                      <th className="px-3 py-2 font-medium hidden sm:table-cell">Uploaded By</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium hidden xs:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentItems.map((file) => (
                      <tr
                        key={`${file.file_type}-${file.id}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-3 py-2 text-xs sm:text-sm max-w-[120px] sm:max-w-[180px] truncate">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{file.title}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{file.title}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-3 py-2 text-xs sm:text-sm hidden sm:table-cell">
                          {file.uploaded_by}
                        </td>
                        <td className="px-3 py-2 text-xs sm:text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${file.file_type === 'Incident report'
                            ? 'bg-blue-100 text-blue-800'
                            : file.file_type === 'eblotter'
                              ? 'bg-green-100 text-green-800'
                              : file.file_type === 'womenchildren'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                            {getFileTypeDisplay(file.file_type)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs sm:text-sm hidden xs:table-cell whitespace-nowrap">
                          {new Date(file.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          <span className="hidden sm:inline">
                            {', ' + new Date(file.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-0 pt-3 border-t border-gray-100">
          <div className="w-full flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Showing {Math.min(currentPage * itemsPerPage + 1, currentItems.length)}-
              {Math.min((currentPage + 1) * itemsPerPage, currentItems.length)} of {currentItems.length}
            </p>
            <Pagination className="m-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                    className="h-8 w-8 text-xs hover-none mr-5"
                    disabled={currentPage === 0}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, pageCount) }).map((_, index) => {
                  const pageNum = currentPage < 3
                    ? index
                    : currentPage > pageCount - 4
                      ? pageCount - 5 + index
                      : currentPage - 2 + index;
                  if (pageNum >= 0 && pageNum < pageCount) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="h-8 w-8 text-xs"
                        >
                          {pageNum + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((prev) => Math.min(pageCount - 1, prev + 1))}
                    className="h-8 w-8 text-xs ml-3"
                    disabled={currentPage === pageCount - 1}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardFooter>
      </Card>

      {/* Recent E-Blotter Entries */}
      <Card className="p-4 shadow-sm col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-xl bg-white flex flex-col">
        <CardHeader className="p-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
              Recent Blotter Entries
            </CardTitle>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              {recentEblotters.length} entries
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-0 mt-3 overflow-hidden">
          {recentEblotters.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <FileText className="h-6 w-6 text-gray-300" />
              <p className="text-sm text-gray-500">No recent e-blotter entries found</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="overflow-auto flex-grow">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="text-left text-xs sm:text-sm text-gray-600 border-b">
                      <th className="px-4 py-2 font-medium">Entry #</th>
                      <th className="px-4 py-2 font-medium">Title</th>
                      <th className="px-4 py-2 font-medium hidden sm:table-cell">Created By</th>
                      <th className="px-4 py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentEblotters
                      .slice(currentEblotterPage * itemsPerPage, (currentEblotterPage + 1) * itemsPerPage)
                      .map((eblotter) => (
                        <tr
                          key={eblotter.file_id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-2 text-xs sm:text-sm font-medium text-blue-800">
                            {eblotter.blotter_number || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-xs sm:text-sm max-w-[120px] truncate">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="text-left truncate">
                                  {eblotter.title}
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[300px] break-words">
                                  <p>{eblotter.title}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="px-4 py-2 text-xs sm:text-sm hidden sm:table-cell">
                            {eblotter.creator?.name || "Unknown"}
                          </td>
                          <td className="px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                            {new Date(eblotter.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            <span className="hidden sm:inline">
                              {', ' + new Date(eblotter.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-0 pt-3 border-t border-gray-100">
          <div className="w-full flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Showing {Math.min(currentEblotterPage * itemsPerPage + 1, recentEblotters.length)}-
              {Math.min((currentEblotterPage + 1) * itemsPerPage, recentEblotters.length)} of {recentEblotters.length}
            </p>
            <Pagination className="m-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentEblotterPage((prev) => Math.max(0, prev - 1))}
                    className="h-8 w-8 text-xs mr-5"
                    disabled={currentEblotterPage === 0}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, Math.ceil(recentEblotters.length / itemsPerPage)) }).map((_, index) => {
                  const pageNum = currentEblotterPage < 3
                    ? index
                    : currentEblotterPage > Math.ceil(recentEblotters.length / itemsPerPage) - 4
                      ? Math.ceil(recentEblotters.length / itemsPerPage) - 5 + index
                      : currentEblotterPage - 2 + index;
                  if (pageNum >= 0 && pageNum < Math.ceil(recentEblotters.length / itemsPerPage)) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentEblotterPage(pageNum)}
                          isActive={currentEblotterPage === pageNum}
                          className="h-8 w-8 text-xs"
                        >
                          {pageNum + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentEblotterPage((prev) => Math.min(Math.ceil(recentEblotters.length / itemsPerPage) - 1, prev + 1))}
                    className="h-8 w-8 text-xs ml-5"
                    disabled={currentEblotterPage === Math.ceil(recentEblotters.length / itemsPerPage) - 1}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardFooter>
      </Card>

      {/* Recent Extractions */}
      <Card className="p-4 shadow-sm col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 h-80 rounded-xl bg-white flex flex-col">
        <CardHeader className="p-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
              Recent Extractions
            </CardTitle>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              {recentExtractions.length} entries
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-0 mt-3 overflow-hidden">
          {recentExtractions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <FileSearch className="h-6 w-6 text-gray-300" />
              <p className="text-sm text-gray-500">No recent extractions found</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="overflow-auto flex-grow">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="text-left text-xs sm:text-sm text-gray-600 border-b">
                      <th className="px-4 py-2 font-medium">Control #</th>
                      <th className="px-4 py-2 font-medium">Title</th>
                      <th className="px-4 py-2 font-medium hidden sm:table-cell">Created By</th>
                      <th className="px-4 py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentExtractions
                      .slice(currentExtractionPage * itemsPerPage, (currentExtractionPage + 1) * itemsPerPage)
                      .map((extraction) => (
                        <tr
                          key={extraction.extraction_id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-2 text-xs sm:text-sm font-medium text-blue-800">
                            {extraction.control_num || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-xs sm:text-sm max-w-[120px] truncate">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="text-left truncate">
                                  {extraction.title}
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[300px] break-words">
                                  <p>{extraction.title}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="px-4 py-2 text-xs sm:text-sm hidden sm:table-cell">
                            {extraction.creator?.name || extraction.created_by || "Unknown"}
                          </td>
                          <td className="px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                            {new Date(extraction.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            <span className="hidden sm:inline">
                              {', ' + new Date(extraction.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-0 pt-3 border-t border-gray-100">
          <div className="w-full flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Showing {Math.min(currentExtractionPage * itemsPerPage + 1, recentExtractions.length)}-
              {Math.min((currentExtractionPage + 1) * itemsPerPage, recentExtractions.length)} of {recentExtractions.length}
            </p>
            <Pagination className="m-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentExtractionPage((prev) => Math.max(0, prev - 1))}
                    className="h-8 w-8 text-xs mr-5"
                    disabled={currentExtractionPage === 0}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, Math.ceil(recentExtractions.length / itemsPerPage)) }).map((_, index) => {
                  const pageNum = currentExtractionPage < 3
                    ? index
                    : currentExtractionPage > Math.ceil(recentExtractions.length / itemsPerPage) - 4
                      ? Math.ceil(recentExtractions.length / itemsPerPage) - 5 + index
                      : currentExtractionPage - 2 + index;
                  if (pageNum >= 0 && pageNum < Math.ceil(recentExtractions.length / itemsPerPage)) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentExtractionPage(pageNum)}
                          isActive={currentExtractionPage === pageNum}
                          className="h-8 w-8 text-xs"
                        >
                          {pageNum + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentExtractionPage((prev) => Math.min(Math.ceil(recentExtractions.length / itemsPerPage) - 1, prev + 1))}
                    className="h-8 w-8 text-xs ml-3"
                    disabled={currentExtractionPage === Math.ceil(recentExtractions.length / itemsPerPage) - 1}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
