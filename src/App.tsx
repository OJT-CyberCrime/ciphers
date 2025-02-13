import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./Sidebar";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import IncidentReport from "./pages/IncidentReport";
import Certifications from "./pages/Certifications";
import Login from "./Screens/Login";
import { useState } from "react";
import Eblotter from './pages/Eblotter';
import Archives from './pages/Archives';
import FolderPage from "./pages/FolderPage";

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100 overflow-hidden">
      <Router>
        <div className="flex">
          {/* Sidebar appears only if logged in */}
          {isLoggedIn && <Sidebar />}

          {/* Main Content */}
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/incident-report" element={<IncidentReport />} />
              <Route path="/certifications" element={<Certifications />} />
              <Route path="/eblotter" element={<Eblotter />} />
              <Route path='/archives' element={<Archives />} />
              <Route path="/folder/:id" element={<FolderPage />} />
              <Route path="*" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
            </Routes>
          </main>
        </div>
      </Router>
    </div>
  );
};

export default App;
