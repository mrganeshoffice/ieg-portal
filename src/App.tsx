import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChartPage from './pages/ChartPage';
import AboutPage from './pages/AboutPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProductPresentationsPage from './pages/ProductPresentationsPage';

const FactoryLayoutPage = lazy(() => import('./pages/FactoryLayoutPage'));
const FactoryDimensionsPage = lazy(() => import('./pages/FactoryDimensionsPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));

/** Admin auth is a separate provider, mounted only for /admin/* routes. */
function AdminShell() {
  return <AdminAuthProvider><Outlet /></AdminAuthProvider>;
}

function Protected({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<div className="skeleton m-8 h-96" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AdminShell />}>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
        <Route element={<Protected><AppLayout /></Protected>}>
          <Route index element={<DashboardPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="org-chart" element={<ChartPage kind="org" />} />
          <Route path="group-structure" element={<ChartPage kind="group" />} />
          <Route path="hr/:n" element={<ChartPage kind="hr" />} />
          <Route path="departments/:key" element={<ChartPage kind="dept" />} />
          <Route path="product-ppt" element={<ProductPresentationsPage />} />
          <Route path="administration" element={<ChartPage kind="admin" />} />
          <Route path="factory-layout" element={<FactoryLayoutPage />} />
          <Route path="factory-dimensions" element={<FactoryDimensionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
