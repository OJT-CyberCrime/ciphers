import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Login from "./Screens/Login";
import { useState, useEffect } from "react";
import ProtectedRoute from "./utils/protectedRoute";
import Cookies from 'js-cookie';
import { supabase } from "./utils/supa";
import IncidentReport from "./pages/IncidentReport/index";
import IncidentReportFile from "./pages/IncidentReportFile/index";
import Eblotter from './pages/Eblotter';
import EblotterFile from './pages/eblotter/index';
import WomenChildren from './pages/WomenChildren/index';
import WomenChildrenFile from './pages/WomenChildrenFile/index';
import Extraction from "./pages/extraction/index";
import ExtractionFile from './pages/extractionFile/index';
import Archives from './pages/Archives/index';
import { Toaster } from "@/components/ui/sonner";
import TwoFactorResetPage from './pages/TwoFactorResetPage';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check for existing login state when the app loads
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const userToken = sessionStorage.getItem('user_token');
        const userData = sessionStorage.getItem('user_data');
        const { data: { session } } = await supabase.auth.getSession();

        // Only consider logged in if all conditions are met
        if (userToken && userData && session) {
          setIsLoggedIn(true);
          // Ensure cookies are in sync with session storage
          Cookies.set("user_token", userToken, { sameSite: 'strict' });
          Cookies.set("user_data", userData, { sameSite: 'strict' });
        } else {
          setIsLoggedIn(false);
          // Clean up all auth data
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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsLoggedIn(false);
        // Clean up all auth data
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

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      <Toaster/>
      <Router>
        <div className={`flex ${isLoggedIn ? "ml-64" : "ml-0"}`}>
          {/* Sidebar appears only if logged in */}
          {isLoggedIn && <Sidebar setIsLoggedIn={setIsLoggedIn} />}

          {/* Main Content */}
          <main className={`flex-1 ${isLoggedIn ? "p-6" : ""}`}>
            <Routes>
              <Route path="/login" element={
                isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login setIsLoggedIn={setIsLoggedIn} />
              } />
              
              <Route path="/2fa-reset" element={<TwoFactorResetPage />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/incident-report" element={
                <ProtectedRoute>
                  <IncidentReport />
                </ProtectedRoute>
              } />
               <Route path="/IncidentReportFile/:id" element={
                <ProtectedRoute>
                  <IncidentReportFile />
                </ProtectedRoute>
              } />
                <Route path="/eblotter" element={
                <ProtectedRoute>
                  <Eblotter />
                </ProtectedRoute>
              } />
              <Route path="/eblotter/:id" element={
                <ProtectedRoute>
                  <EblotterFile />
                </ProtectedRoute>
              } />
              <Route path="/wcp" element={
                <ProtectedRoute>
                  <WomenChildren />
                </ProtectedRoute>
              } />
              <Route path="/wcp/:id" element={
                <ProtectedRoute>
                  <WomenChildrenFile />
                </ProtectedRoute>
              } />
              <Route path="/extraction" element={
                <ProtectedRoute>
                  <Extraction />
                </ProtectedRoute>
              } />
              <Route path="/extraction/:id" element={
                <ProtectedRoute>
                  <ExtractionFile />
                </ProtectedRoute>
              } />
              <Route path="/archives" element={
                <ProtectedRoute>
                  <Archives />
                </ProtectedRoute>
              } />
              
              {/* Redirect to login for unknown routes */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </div>
  );
};

export default App;