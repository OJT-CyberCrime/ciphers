import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { logout } from "@/utils/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  setIsLoggedIn: (value: boolean) => void;
}

export default function Sidebar({ setIsLoggedIn }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        setIsLoggedIn(false);
        navigate("/login");
      } else {
        console.error("Logout failed:", result.error);
        toast.error("Failed to logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  return (
    <aside className="h-screen w-64 bg-white shadow-md p-5 flex flex-col">
      <ScrollArea className="h-full">
        <div className="flex flex-col items-center">
          <img
            src="/assets/RACU.png"
            alt="RACU Logo"
            className="w-20 h-20 mb-2 mt-5"
          />
          <h1 className="text-xl font-bold mb-8 font-poppins text-center text-blue-900">
            CIPHERS
          </h1>
        </div>
        <nav className="space-y-4 font-poppins text-md">
          <SidebarLink to="/dashboard" icon={<Home size={20} />} label="Dashboard" />
          <SidebarLink to="/users" icon={<Users size={20} />} label="Account" />
          <SidebarLink to="/incident-report" icon={<FileText size={20} />} label="Incident Reports" />
          <SidebarLink to="/certifications" icon={<FileCheck size={20} />} label="Extraction Certifications" />
          <SidebarLink to="/eblotter" icon={<ClipboardList size={20} />} label="eBlotter" />
          <SidebarLink to="/archives" icon={<Archive size={20} />} label="Archives" />
          <SidebarLink to="/wcp" icon={<PersonStanding size={20} />} label="Women and Children" />
        </nav>
        <Button
          className="w-full bg-blue-900 hover:bg-blue-700 flex items-center gap-2 mt-6"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Logout
        </Button>
      </ScrollArea>
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
