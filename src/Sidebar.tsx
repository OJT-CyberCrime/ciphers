import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home, Users, FileText, FileCheck, LogOut,
  ClipboardList, Archive, PersonStanding
} from "lucide-react";
import { logout } from "@/utils/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Cookies from "js-cookie";
import { supabase } from "@/utils/supa";

interface SidebarProps {
  setIsLoggedIn: (value: boolean) => void;
}

export default function Sidebar({ setIsLoggedIn }: SidebarProps) {
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

  useEffect(() => {
    const fetchUserData = async () => {
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

      // Update role in cookie and state
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
    };

    fetchUserData();

    // Real-time listener for updates
    const subscription = supabase
      .channel(`realtime-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users", filter: `uuid=eq.${userId}` },
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
    <aside className={`fixed top-0 left-0 h-screen w-64 ${userRole === "wcpd" || userRole === "superadmin" ? 'bg-indigo-50' : 'bg-white'} shadow-sm p-5 flex flex-col z-50`}>
      <ScrollArea className="h-full">
        <div className="flex flex-col items-center">
          <img src="/assets/RACU.png" alt="RACU Logo" className="w-20 h-20 mb-10 mt-5 object-contain" />
        </div>
        <nav className="space-y-4 font-poppins text-sm">
          <SidebarLink to="/dashboard" icon={<Home size={20} />} label="Dashboard" />
          <SidebarLink to="/users" icon={<Users size={20} />} label="Account" />
          <SidebarLink to="/incident-report" icon={<FileText size={20} />} label="Incident Reports" />
          <SidebarLink to="/extraction" icon={<FileCheck size={20} />} label="Extraction Certifications" />
          <SidebarLink to="/eblotter" icon={<ClipboardList size={20} />} label="Blotter Reports" />
          <SidebarLink to="/archives" icon={<Archive size={20} />} label="Archives" />
          {userRole === "wcpd" || userRole === "superadmin" ? (
            <SidebarLink to="/wcp" icon={<PersonStanding size={20} />} label="Women and Children" />
          ) : null}
        </nav>
      </ScrollArea>

      <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          {profilePic ? (
            <img src={profilePic} alt="User Avatar" className="w-16 h-16 rounded-full border-2 border-blue-900 object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-xl text-white">?</span>
            </div>
          )}
          <div className="flex flex-col justify-center items-start space-y-1">
            <p className="text-sm font-semibold text-gray-800">{userName}</p>
            <p className="text-xs text-gray-500">{userRole}</p>
          </div>
        </div>

        <Button className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 bg-blue-900 hover:bg-blue-700 text-white" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </Button>
      </div>
    </aside>
  );
}

function SidebarLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition hover:text-blue-900",
          isActive ? "text-blue-900 font-semibold" : "text-gray-900"
        )
      }
    >
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
