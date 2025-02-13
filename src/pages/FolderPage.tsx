import { useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator} from "@/components/ui/breadcrumb"; // Adjust the import path as necessary
import SearchBar from "@/Search"; // Adjust the import path as necessary
import { ChevronRight, Plus} from "lucide-react"; // Import the ChevronRight icon
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components

const FolderPage = () => {
  const { id } = useParams<{ id: string }>(); // Get the folder ID from the URL
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("");

  const categories = [
    "All",
    "Category 1",
    "Category 2",
    "Category 3",
    // Add more categories as needed
  ];

  // Get the current location to determine the previous page
  const location = useLocation();
  const previousPage = location.state?.from || "/eblotter"; // Default to eBlotter if no state is provided
  const previousPageName = location.state?.fromName || "eBlotter"; // Get the name of the previous page

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
        //   onClick={addFolder}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
        >
          <Plus size={16} /> Add Folder
        </Button>
      </div>

      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-4 text-gray-600 flex space-x-2">
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="flex items-center">
          <ChevronRight size={16} />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href={previousPage}>{previousPageName}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="flex items-center">
          <ChevronRight size={16} />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Folder {id}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Folder Content */}
      <h1 className="text-2xl font-medium font-poppins text-blue-900">Folder {id}</h1>
      {/* Add more content related to the folder here */}
    </div>
  );
};

export default FolderPage; 