import { useEffect, useState } from "react";
import { supabase } from "../utils/supa";

// Define the type for user data
interface UserData {
  name: string;
  email: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("users").select("name, email");
  
      console.log("Fetched data:", data); // Debugging
      console.error("Fetch error:", error); // Debugging
  
      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(data || []); 
      }
    };
  
    fetchUsers();
  }, []);
  

  return (
    <div className="p-6">
      <h1 className="text-2xl font-medium font-poppins mb-2 text-blue-900">
        Accounts
      </h1>
      <hr className="border-gray-300 border-1 mb-6" />
      <div className="mt-4">
        {users.length > 0 ? (
          users.map((user, index) => (
            <div key={index} className="flex items-center mb-4">
              <img src="/assets/RACU.png" alt="Avatar" width="90" height="90" className="rounded-full mr-4" />
              <div className="flex flex-col">
                <span className="text-xl font-semibold font-poppins text-gray-800">{user.name}</span>
                <span className="text-sm font-poppins text-gray-600">{user.email}</span>
              </div>
            </div>
          ))
        ) : (
          <span className="text-sm font-poppins text-gray-600">Loading...</span>
        )}
      </div>
    </div>
  );
}