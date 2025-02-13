import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Users, 
  FileText, 
  FileCheck, 
  LogOut, 
  ClipboardList, 
  Archive
} from "lucide-react";
import { logout } from "@/utils/auth";
import { toast } from "sonner";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        navigate('/');
      } else {
        console.error('Logout failed:', result.error);
        toast.error('Failed to logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <aside className="h-screen w-52 bg-white text-gray-900 flex flex-col p-5 shadow-md shadow-gray-300 items-center">
      <img src="/assets/RACU.png" alt="RACU Logo" className="w-20 h-20 mb-2 mt-5" />
      <h1 className="text-xl font-bold mb-12 font-poppins text-center text-blue-900">CIPHERS</h1>
      
      {/* Navigation Links */}
      <nav className="space-y-4 flex-1 font-poppins text-md w-full">
        <SidebarLink to="/dashboard" icon={<Home size={20} />} label="Dashboard" />
        <SidebarLink to="/users" icon={<Users size={20} />} label="Account" />
        <SidebarLink to="/incident-report" icon={<FileText size={20} />} label="Incident Reports" />
        <SidebarLink to="/certifications" icon={<FileCheck size={20} />} label="Extraction Certifications" />
        <SidebarLink to="/eblotter" icon={<ClipboardList size={20} />} label="eBlotter" />
        <SidebarLink to="/archives" icon={<Archive size={20} />} label="Archives" />
      </nav>

      {/* Logout Button */}
      <Button 
        className="w-full bg-blue-900 hover:bg-blue-700 flex items-center gap-2 mt-6"
        onClick={handleLogout}
      >
        <LogOut size={18} />
        Logout
      </Button>
    </aside>
  );
}

function SidebarLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center gap-3 px-3 py-2 rounded-md transition ${
          isActive ? "text-blue-900 font-semibold" : "text-gray-900"
        } hover:text-blue-900`
      }
    >
      {/* Apply styles correctly within the NavLink */}
      <span className="transition">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}