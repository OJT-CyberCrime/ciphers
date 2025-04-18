import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  FileText,
  FileCheck,
  LogOut,
  ClipboardList,
  Archive,
  PersonStanding,
  Menu,
  X,
  PanelRightOpen
} from "lucide-react";
import { logout } from "@/utils/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Cookies from "js-cookie";
import { supabase } from "@/utils/supa";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarProps {
  setIsLoggedIn: (value: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (value: boolean) => void
}

export default function Sidebar({ setIsLoggedIn }: SidebarProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | undefined>(() => {
    const userData = JSON.parse(Cookies.get("user_data") || "{}");
    return userData.role;
  });
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const userData = JSON.parse(Cookies.get("user_data") || "{}");
  const userId = userData.uuid;
  const [loading, setLoading] = useState(true);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      if (!userId) return;

      const { data: dbUser, error } = await supabase
        .from("users")
        .select("role, name, file_path")
        .eq("uuid", userId)
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
        return;
      }

      if (dbUser.role !== userRole) {
        const updatedUserData = { ...userData, role: dbUser.role };
        Cookies.set("user_data", JSON.stringify(updatedUserData));
        setUserRole(dbUser.role);
      }

      setUserName(dbUser.name || "Unknown User");

      if (dbUser.file_path) {
        const { data } = supabase.storage
          .from("profilepic")
          .getPublicUrl(dbUser.file_path);

        setProfilePic(data.publicUrl);
      }
      setLoading(false);
    };

    fetchUserData();

    const subscription = supabase
      .channel(`realtime-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `uuid=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            setUserName(payload.new.name || "Unknown User");
            setUserRole(payload.new.role);

            if (payload.new.file_path) {
              const { data } = supabase.storage
                .from("profilepic")
                .getPublicUrl(payload.new.file_path);

              setProfilePic(data.publicUrl);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        setIsLoggedIn(false);
        navigate("/login");
      } else {
        toast.error("Failed to logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 w-full h-16 bg-blue-900 flex items-center justify-between px-4 z-40 shadow-lg">
        {/* Menu Button */}
        <button
          className="p-2 rounded-md text-white"
          onClick={() => setIsMobileSidebarOpen(true)}
        >
          <PanelRightOpen size={24} />
        </button>

        <h2 className="font-poppins font-medium text-white">CRIMS</h2>
        {/* User Avatar */}
        {loading ? (
          <Skeleton className="w-8 h-8 rounded-full" />
        ) : profilePic ? (
          <img
            src={profilePic}
            alt="User Avatar"
            className="w-8 h-8 rounded-full border-2 border-white object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-sm text-white">?</span>
          </div>
        )}
      </header>


      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 ${userRole === "wcpd" ? "bg-indigo-50" : "bg-white"
          } shadow-sm p-5 flex flex-col z-50 border-r border-gray-200 transform ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        {/* Mobile Close Button */}
        <button
          className="md:hidden absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <X size={20} />
        </button>

        {/* Profile Section */}
        <div className="w-full p-4 border-b border-gray-200">
          <div className="flex flex-col items-center space-y-2">
            {loading ? (
              <>
                <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
                <Skeleton className="w-32 h-6" />
                <Skeleton className="w-20 h-4" />
              </>
            ) : (
              <>
                {profilePic ? (
                  <img
                    src={profilePic}
                    alt="User Avatar"
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-blue-900 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-xl text-white">?</span>
                  </div>
                )}
                <div className="text-center font-poppins">
                  <p className="text-base md:text-lg font-bold text-gray-800">{userName}</p>
                  <p className="text-xs text-gray-500">{userRole}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col justify-between">
          <nav className="space-y-2 font-poppins text-sm px-2 mt-4">
            <SidebarLink
              to="/dashboard"
              icon={<Home size={20} />}
              label="Dashboard"
            />
            <SidebarLink to="/users" icon={<Users size={20} />} label="Account" />
            <SidebarLink
              to="/incident-report"
              icon={<FileText size={20} />}
              label="Incident Reports"
            />
            <SidebarLink
              to="/extraction"
              icon={<FileCheck size={20} />}
              label="Extraction Certifications"
            />
            <SidebarLink
              to="/eblotter"
              icon={<ClipboardList size={20} />}
              label="Blotter Reports"
            />
            {userRole === "wcpd" || userRole === "superadmin" ? (
              <SidebarLink
                to="/wcp"
                icon={<PersonStanding size={20} />}
                label="Women and Children"
              />
            ) : null}
                        <SidebarLink
              to="/archives"
              icon={<Archive size={20} />}
              label="Archives"
            />
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200">
            <Button
              className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 bg-blue-900 hover:bg-blue-700 text-white"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              Logout
            </Button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              CRIMS &copy; {new Date().getFullYear()} <br /> All rights reserved.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition duration-200 hover:text-blue-900 hover:bg-blue-100",
          isActive ? "text-blue-900 font-semibold bg-blue-100" : "text-gray-900"
        )
      }
    >
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}