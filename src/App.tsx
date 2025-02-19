import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import IncidentReport from "./pages/IncidentReport/index";
import Certifications from "./pages/Certifications";
import Login from "./Screens/Login";
import { useState, useEffect } from "react";
import Eblotter from './pages/Eblotter';
import EblotterFile from './pages/eblotter/index';
import Archives from './pages/Archives/index';
import FolderPage from "./pages/FolderPage/index";
import ProtectedRoute from "./utils/protectedRoute";
import Cookies from 'js-cookie';
import WomenChildren from './pages/WomenChildren';
import { supabase } from "./utils/supa";

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check for existing login state when the app loads
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const userToken = Cookies.get('user_token');
        const userData = Cookies.get('user_data');
        const { data: { session } } = await supabase.auth.getSession();

        // Only consider logged in if all three conditions are met
        if (userToken && userData && session) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
          // Clean up any stray auth data
          Cookies.remove('user_token');
          Cookies.remove('user_data');
          localStorage.clear();
          sessionStorage.clear();
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
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 overflow-hidden">
      <Router>
        <div className="flex">
          {/* Sidebar appears only if logged in */}
          {isLoggedIn && <Sidebar setIsLoggedIn={setIsLoggedIn} />}

          {/* Main Content */}
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
              
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
              <Route path="/certifications" element={
                <ProtectedRoute>
                  <Certifications />
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
              <Route path="/archives" element={
                <ProtectedRoute>
                  <Archives />
                </ProtectedRoute>
              } />
              <Route path="/folder/:id" element={
                <ProtectedRoute>
                  <FolderPage />
                </ProtectedRoute>
              } />
              <Route path="/wcp" element={
                <ProtectedRoute>
                  <WomenChildren />
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
