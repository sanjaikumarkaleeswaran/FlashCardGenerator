import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateFlashcards from './pages/CreateFlashcards';
import Review from './pages/Review';
import History from './pages/History';
import Settings from './pages/Settings';
import StudyAssistant from './pages/StudyAssistant';
import Summary from './pages/Summary';
import Quiz from './pages/Quiz';
import MindMap from './pages/MindMap';
import Planner from './pages/Planner';
import Analytics from './pages/Analytics';
import DocumentLibrary from './pages/DocumentLibrary';
import KnowledgeBase from './pages/KnowledgeBase';
import Sidebar from './components/Sidebar';
import { authService } from './services/api';

// Route Guard component to protect private study paths
const ProtectedRoute = ({ children }) => {
  const isAuth = authService.isAuthenticated();
  return isAuth ? children : <Navigate to="/login" replace />;
};

function App() {
  const isAuth = authService.isAuthenticated();

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans antialiased text-slate-800 dark:text-slate-200">
        {!isAuth && <Navbar />}
        <div className="flex flex-1 overflow-hidden">
          {isAuth && <Sidebar />}
          <main className="flex-1 overflow-y-auto">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assistant"
                element={
                  <ProtectedRoute>
                    <StudyAssistant />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <CreateFlashcards />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/review"
                element={
                  <ProtectedRoute>
                    <Review />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <History />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/summary"
                element={
                  <ProtectedRoute>
                    <Summary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz"
                element={
                  <ProtectedRoute>
                    <Quiz />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mindmap"
                element={
                  <ProtectedRoute>
                    <MindMap />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/planner"
                element={
                  <ProtectedRoute>
                    <Planner />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <DocumentLibrary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/knowledge-base"
                element={
                  <ProtectedRoute>
                    <KnowledgeBase />
                  </ProtectedRoute>
                }
              />

              {/* Fallback Catch-all Route */}
              <Route path="*" element={<Navigate to={isAuth ? "/dashboard" : "/"} replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
