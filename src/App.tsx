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
import Archives from './pages/Archives';
import FolderPage from "./pages/FolderPage/index";
import ProtectedRoute from "./utils/protectedRoute";
import Cookies from 'js-cookie';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check for existing login state when the app loads
  useEffect(() => {
    const userToken = Cookies.get('user_token');
    const userData = Cookies.get('user_data');
    if (userToken && userData) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
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
