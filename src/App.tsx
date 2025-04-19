import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Login from "./Screens/Login";
import ProtectedRoute from "./utils/protectedRoute";
import Cookies from 'js-cookie';
import { supabase } from "./utils/supa";
import IncidentReport from "./pages/IncidentReport/index";
import IncidentReportFile from "./pages/IncidentReportFile/index";
import Eblotter from './pages/Eblotter/index';
import EblotterFile from './pages/eblotterFile/index';
import WomenChildren from './pages/WomenChildren/index';
import WomenChildrenFile from './pages/WomenChildrenFile/index';
import Extraction from "./pages/extraction/index";
import ExtractionFile from './pages/extractionFile/index';
import Archives from './pages/Archives/index';
import { Toaster } from "@/components/ui/sonner";
import TwoFactorResetPage from './pages/TwoFactorResetPage';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Update isMobile when window resizes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const userToken = sessionStorage.getItem('user_token');
        const userData = sessionStorage.getItem('user_data');
        const { data: { session } } = await supabase.auth.getSession();

        if (userToken && userData && session) {
          setIsLoggedIn(true);
          Cookies.set("user_token", userToken, { sameSite: 'strict' });
          Cookies.set("user_data", userData, { sameSite: 'strict' });
        } else {
          setIsLoggedIn(false);
          Cookies.remove('user_token');
          Cookies.remove('user_data');
          sessionStorage.removeItem('user_token');
          sessionStorage.removeItem('user_data');
          localStorage.clear();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsLoggedIn(false);
      }
    };

    checkAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsLoggedIn(false);
        Cookies.remove('user_token');
        Cookies.remove('user_data');
        sessionStorage.removeItem('user_token');
        sessionStorage.removeItem('user_data');
        localStorage.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // const getMarginLeft = () => {
  //   if (!isLoggedIn) return "ml-0";
  //   if (window.innerWidth < 768) {
  //     return mobileSidebarOpen ? "ml-64" : "ml-0";
  //   }
  //   return "ml-64";
  // };

  return (
    <div className={`min-h-screen bg-gray-50 overflow-hidden ${!isLoggedIn ? "pt-0" : "pt-16"} md:pt-0 m-0`}>
      <Toaster />
      <Router>
      <div className={`flex transition-all duration-300 ${isLoggedIn && !isMobile ? "ml-64" : "ml-0"}`}>
          {isLoggedIn && (
            <Sidebar
              setIsLoggedIn={setIsLoggedIn}
              mobileSidebarOpen={mobileSidebarOpen}
              setMobileSidebarOpen={setMobileSidebarOpen}
            />
          )}

          <main className={`flex-1 ${isLoggedIn ? "p-6" : ""}`}>
            <Routes>
              <Route path="/login" element={
                isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login setIsLoggedIn={setIsLoggedIn} />
              } />
              <Route path="/2fa-reset" element={<TwoFactorResetPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="/incident-report" element={<ProtectedRoute><IncidentReport /></ProtectedRoute>} />
              <Route path="/IncidentReportFile/:id" element={<ProtectedRoute><IncidentReportFile /></ProtectedRoute>} />
              <Route path="/eblotter" element={<ProtectedRoute><Eblotter /></ProtectedRoute>} />
              <Route path="/eblotterfile/:id" element={<ProtectedRoute><EblotterFile /></ProtectedRoute>} />
              <Route path="/wcp" element={<ProtectedRoute><WomenChildren /></ProtectedRoute>} />
              <Route path="/wcp/:id" element={<ProtectedRoute><WomenChildrenFile /></ProtectedRoute>} />
              <Route path="/extraction" element={<ProtectedRoute><Extraction /></ProtectedRoute>} />
              <Route path="/extraction/:id" element={<ProtectedRoute><ExtractionFile /></ProtectedRoute>} />
              <Route path="/archives" element={<ProtectedRoute><Archives /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </div>
  );
};

export default App;
