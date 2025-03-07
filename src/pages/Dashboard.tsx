import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardFooter,
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
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
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

// Sample data
const complaintData = [
  { day: "Mon", complaints: 10 },
  { day: "Tue", complaints: 15 },
  { day: "Wed", complaints: 5 },
  { day: "Thu", complaints: 20 },
  { day: "Fri", complaints: 8 },
  { day: "Sat", complaints: 12 },
  { day: "Sun", complaints: 7 },
];

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
  blotter_id: number;
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
  file_type: 'regular' | 'eblotter' | 'womenchildren' | 'extraction';
  created_at: string;
}

const crimeCategoryData = [
  { name: "Theft", value: 400 },
  { name: "Assault", value: 300 },
  { name: "Burglary", value: 200 },
  { name: "Fraud", value: 100 },
  { name: "Vandalism", value: 50 },
];

const totalComplaintsData = [
  { day: "Mon", total: 5 },
  { day: "Tue", total: 8 },
  { day: "Wed", total: 12 },
  { day: "Thu", total: 15 },
  { day: "Fri", total: 10 },
  { day: "Sat", total: 20 },
  { day: "Sun", total: 25 },
];

const totalComplaints = totalComplaintsData.reduce(
  (acc, curr) => acc + curr.total,
  0
);

export default function Dashboard() {
  const [selectedData, setSelectedData] = useState("complaints");
  const [currentPage, setCurrentPage] = useState(0);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 3;

  // Fetch recent files from all categories
  useEffect(() => {
    const fetchRecentFiles = async () => {
      try {
        setIsLoading(true);
        
        const [regularFiles, eblotterFiles, womenchildrenFiles, extractionFiles] = await Promise.all([
          // Regular files
          supabase
            .from('files')
            .select(`
              file_id,
              title,
              created_by,
              created_at,
              creator:created_by(name)
            `)
            .order('created_at', { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
              if (error) throw error;
              return (data || []).map(file => ({
                ...file,
                creator: file.creator ? { name: file.creator[0]?.name } : null
              })) as RegularFile[];
            }),
          
          // E-blotter files
          supabase
            .from('eblotter_file')
            .select(`
              blotter_id,
              title,
              created_by,
              created_at,
              creator:created_by(name)
            `)
            .order('created_at', { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
              if (error) throw error;
              return (data || []).map(file => ({
                ...file,
                creator: file.creator ? { name: file.creator[0]?.name } : null
              })) as EblotterFile[];
            }),
          
          // Women and children files
          supabase
            .from('womenchildren_file')
            .select(`
              file_id,
              title,
              created_by,
              created_at,
              creator:created_by(name)
            `)
            .order('created_at', { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
              if (error) throw error;
              return (data || []).map(file => ({
                ...file,
                creator: file.creator ? { name: file.creator[0]?.name } : null
              })) as WomenChildrenFile[];
            }),
          
          // Extraction files
          supabase
            .from('extraction')
            .select(`
              extraction_id,
              title,
              created_by,
              created_at,
              creator:created_by(name)
            `)
            .order('created_at', { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
              if (error) throw error;
              return (data || []).map(file => ({
                ...file,
                creator: file.creator ? { name: file.creator[0]?.name } : null
              })) as ExtractionFile[];
            })
        ]);

        // Combine and format all files
        const allFiles = [
          ...regularFiles.map(file => ({
            id: file.file_id,
            title: file.title,
            uploaded_by: file.creator?.name || file.created_by,
            created_at: file.created_at,
            file_type: 'regular' as const
          })),
          ...eblotterFiles.map(file => ({
            id: file.blotter_id,
            title: file.title,
            uploaded_by: file.creator?.name || file.created_by,
            created_at: file.created_at,
            file_type: 'eblotter' as const
          })),
          ...womenchildrenFiles.map(file => ({
            id: file.file_id,
            title: file.title,
            uploaded_by: file.creator?.name || file.created_by,
            created_at: file.created_at,
            file_type: 'womenchildren' as const
          })),
          ...extractionFiles.map(file => ({
            id: file.extraction_id,
            title: file.title,
            uploaded_by: file.creator?.name || file.created_by,
            created_at: file.created_at,
            file_type: 'extraction' as const
          }))
        ];

        // Sort by created_at and take the most recent 10
        const sortedFiles = allFiles.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 10);

        setRecentFiles(sortedFiles);
      } catch (error) {
        console.error('Error fetching recent files:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentFiles();
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
      case 'regular':
        return 'Incident Report';
      case 'eblotter':
        return 'E-Blotter';
      case 'womenchildren':
        return 'Women & Children';
      case 'extraction':
        return 'Extraction';
      default:
        return type;
    }
  };

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-poppins">
      <h1 className="text-2xl font-medium mb-4 text-blue-900 col-span-3">
        Dashboard
      </h1>

      {/* Complaints Uploaded Over Time Card */}
      <Card className="p-2 shadow-md col-span-1 lg:col-span-1 h-80">
        <CardHeader className="font-semibold flex-grow text-center text-md text-blue-900">
          Data Visualization
          <CardDescription className="font-normal text-black">
            {/* Dropdown to select data type */}
            <div className="mb-2 flex justify-center items-center">
              <label htmlFor="data-select" className="mr-2 text-sm">
                Select Data Type:
              </label>
              <select
                id="data-select"
                value={selectedData}
                onChange={handleDataChange}
                className="p-1 border rounded text-sm"
              >
                <option value="complaints" className="text-sm">
                  Complaints
                </option>
                <option value="officerUploads" className="text-sm">
                  Officer Uploads
                </option>
              </select>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            {selectedData === "complaints" ? (
              <LineChart data={complaintData}>
                <XAxis dataKey="day" stroke="#3b82f6" />
                <YAxis stroke="#3b82f6" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="complaints"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ stroke: "#3b82f6", strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <BarChart data={officerData}>
                <XAxis dataKey="officer" stroke="#3b82f6" />
                <YAxis stroke="#3b82f6" />
                <Tooltip />
                <Bar
                  dataKey="filesUploaded"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Trending up by 5.2% this month
          </div>
          <div className="leading-none text-muted-foreground">
            Showing total complaints for the last 6 months
          </div>
        </CardFooter>
      </Card>

      {/* Total Complaints Today Card */}
      <Card className="p-2 shadow-md col-span-1 h-80">
        <CardHeader className="font-semibold mb-2 text-center text-md text-blue-900">
          Total Complaints Today
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <span className="text-7xl font-bold">
            {totalComplaints.toLocaleString()}
          </span>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            <TrendingDown className="h-4 w-4 text-green-500" />
            Trending down by 2.1% this month
          </div>
          <div className="leading-none text-muted-foreground">
            Showing total complaints for the last week
          </div>
        </CardFooter>
      </Card>

      {/* Crime Categories Pie Chart Card */}
      <Card className="p-2 shadow-md col-span-2 lg:col-span-1 h-80">
        <CardHeader className="font-semibold text-md text-center text-blue-900">
          Crime Categories
        </CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart className="text-xs">
              <Pie
                data={crimeCategoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={50}
                innerRadius={20}
                fill="#3b82f6"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
        <CardFooter className="flex-col gap-1 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            Most reported crime: Theft
          </div>
          <div className="leading-none text-muted-foreground">
            Showing data for the last month
          </div>
        </CardFooter>
      </Card>

      {/* Recent Files Upload Card */}
      <Card className="p-2 shadow-md col-span-2 lg:col-span-3 h-64">
        <CardHeader className="font-semibold text-md text-blue-900">
          Recent Files Upload
        </CardHeader>
        <CardContent className="h-52 overflow-auto">
          <div className="w-full h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
              </div>
            ) : (
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-white z-10 shadow">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs border-b">File</th>
                    <th className="px-4 py-2 text-left text-xs border-b">Uploaded By</th>
                    <th className="px-4 py-2 text-left text-xs border-b">File Type</th>
                    <th className="px-4 py-2 text-left text-xs border-b">Upload Time</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((file) => (
                    <tr key={`${file.file_type}-${file.id}`} className="hover:bg-gray-100">
                      <td className="border px-4 py-2 text-xs">{file.title}</td>
                      <td className="border px-4 py-2 text-xs">{file.uploaded_by}</td>
                      <td className="border px-4 py-2 text-xs">{getFileTypeDisplay(file.file_type)}</td>
                      <td className="border px-4 py-2 text-xs">
                        {new Date(file.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center mt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                >
                  <PaginationPrevious className="h-4 w-4" />
                </Button>
              </PaginationItem>
              {Array.from({ length: pageCount }, (_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    onClick={() => setCurrentPage(i)}
                    isActive={currentPage === i}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.min(pageCount - 1, prev + 1))}
                  disabled={currentPage === pageCount - 1}
                >
                  <PaginationNext className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      </Card>
    </div>
  );
}
