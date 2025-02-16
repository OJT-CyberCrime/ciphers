import { useState } from "react";
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

const recentFiles = [
  { fileName: "File1.pdf", uploadedBy: "Officer A", fileType: "PDF", uploadTime: "2023-10-01 10:00 AM" },
  { fileName: "File2.pdf", uploadedBy: "Officer B", fileType: "PDF", uploadTime: "2023-10-01 11:00 AM" },
  { fileName: "File3.pdf", uploadedBy: "Officer C", fileType: "PDF", uploadTime: "2023-10-01 12:00 PM" },
  { fileName: "File4.pdf", uploadedBy: "Officer D", fileType: "PDF", uploadTime: "2023-10-01 01:00 PM" },
  { fileName: "File5.pdf", uploadedBy: "Officer E", fileType: "PDF", uploadTime: "2023-10-01 02:00 PM" },
  { fileName: "File6.pdf", uploadedBy: "Officer F", fileType: "PDF", uploadTime: "2023-10-01 03:00 PM" },
  { fileName: "File7.pdf", uploadedBy: "Officer G", fileType: "PDF", uploadTime: "2023-10-01 04:00 PM" },
  { fileName: "File8.pdf", uploadedBy: "Officer H", fileType: "PDF", uploadTime: "2023-10-01 05:00 PM" },
];

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
  const itemsPerPage = 3;

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
                {currentItems.map((file, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="border px-4 py-2 text-xs">{file.fileName}</td>
                    <td className="border px-4 py-2 text-xs">{file.uploadedBy}</td>
                    <td className="border px-4 py-2 text-xs">{file.fileType || 'N/A'}</td>
                    <td className="border px-4 py-2 text-xs">{file.uploadTime || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
