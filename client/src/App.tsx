import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import DesignBoard from './pages/DesignBoard';
import Settings from './pages/Settings';
import NewProject from './pages/NewProject';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-terra-200 border-t-terra-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { loading, needsSetup, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="w-12 h-12 border-4 border-terra-200 border-t-terra-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> :
        needsSetup ? <Navigate to="/setup" replace /> :
        <Login />
      } />
      <Route path="/setup" element={
        user ? <Navigate to="/" replace /> :
        !needsSetup ? <Navigate to="/login" replace /> :
        <Setup />
      } />

      <Route path="/" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/projects" element={
        <ProtectedRoute><Layout><ProjectList /></Layout></ProtectedRoute>
      } />
      <Route path="/projects/new" element={
        <ProtectedRoute><Layout><NewProject /></Layout></ProtectedRoute>
      } />
      <Route path="/projects/:id" element={
        <ProtectedRoute><Layout><ProjectDetail /></Layout></ProtectedRoute>
      } />
      <Route path="/projects/:id/design-board" element={
        <ProtectedRoute><Layout><DesignBoard /></Layout></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
