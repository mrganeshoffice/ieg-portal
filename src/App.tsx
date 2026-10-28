import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminWorkFrame from './components/admin/AdminWorkFrame';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChartPage from './pages/ChartPage';
import AboutPage from './pages/AboutPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProductPresentationsPage from './pages/ProductPresentationsPage';
import OrganisationFlowPage from './pages/OrganisationFlowPage';
import VideosPage from './pages/VideosPage';

const FactoryLayoutPage = lazy(() => import('./pages/FactoryLayoutPage'));
const OfficeLayoutPage = lazy(() => import('./pages/OfficeLayoutPage'));
const FactoryDimensionsPage = lazy(() => import('./pages/FactoryDimensionsPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminVideosPage = lazy(() => import('./pages/AdminVideosPage'));
const AdminEmployeesPage = lazy(() => import('./pages/AdminEmployeesPage'));
const AdminEmployeeDetailPage = lazy(() => import('./pages/AdminEmployeeDetailPage'));
const AdminMasterDataPage = lazy(() => import('./pages/AdminMasterDataPage'));
const AdminAuditPage = lazy(() => import('./pages/AdminAuditPage'));
const WorkHomePage = lazy(() => import('./pages/WorkHomePage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const LeavePage = lazy(() => import('./pages/LeavePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));
const MyProfilePage = lazy(() => import('./pages/MyProfilePage'));
const MyTeamPage = lazy(() => import('./pages/MyTeamPage'));
const SetupPasswordPage = lazy(() => import('./pages/PasswordPages').then((m) => ({ default: m.SetupPasswordPage })));
const ChangePasswordPage = lazy(() => import('./pages/PasswordPages').then((m) => ({ default: m.ChangePasswordPage })));

/** Admin auth is a separate provider, mounted only for /admin/* routes. */
function AdminShell() {
  return <AdminAuthProvider><Outlet /></AdminAuthProvider>;
}

function Protected({ children, allowPending = false }: { children: JSX.Element; allowPending?: boolean }) {
  const { status, session } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <div className="flex min-h-screen items-center justify-center bg-app"><div className="skeleton h-24 w-24 !rounded-3xl" aria-busy="true" aria-label="Checking your session" /></div>;
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (session.mustChangePassword && !allowPending) return <Navigate to="/change-password" replace />;
  return children;
}

/** Company-portal pages (org charts, layouts, products) are only for accounts with full portal access. */
function FullOnly() {
  const { session } = useAuth();
  if (!session?.fullAccess) return <Navigate to="/work" replace />;
  return <Outlet />;
}
function Landing() {
  const { session } = useAuth();
  return session?.fullAccess ? <DashboardPage /> : <Navigate to="/work" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<div className="skeleton m-8 h-96" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup-password" element={<SetupPasswordPage />} />
        <Route path="/change-password" element={<Protected allowPending><ChangePasswordPage /></Protected>} />
        <Route element={<AdminShell />}>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>} />
          <Route path="/admin/videos" element={<AdminProtectedRoute><AdminVideosPage /></AdminProtectedRoute>} />
          <Route path="/admin/employees" element={<AdminProtectedRoute><AdminEmployeesPage /></AdminProtectedRoute>} />
          <Route path="/admin/employees/:id" element={<AdminProtectedRoute><AdminEmployeeDetailPage /></AdminProtectedRoute>} />
          <Route path="/admin/master-data" element={<AdminProtectedRoute><AdminMasterDataPage /></AdminProtectedRoute>} />
          <Route path="/admin/audit" element={<AdminProtectedRoute><AdminAuditPage /></AdminProtectedRoute>} />
          <Route path="/admin/attendance" element={<AdminProtectedRoute><AdminWorkFrame tab="attendance" subtitle="Attendance"><AttendancePage /></AdminWorkFrame></AdminProtectedRoute>} />
          <Route path="/admin/tasks" element={<AdminProtectedRoute><AdminWorkFrame tab="tasks" subtitle="Tasks"><TasksPage /></AdminWorkFrame></AdminProtectedRoute>} />
          <Route path="/admin/leave" element={<AdminProtectedRoute><AdminWorkFrame tab="leave" subtitle="Leave and holidays"><LeavePage /></AdminWorkFrame></AdminProtectedRoute>} />
          <Route path="/admin/reports" element={<AdminProtectedRoute><AdminWorkFrame tab="reports" subtitle="Reports"><ReportsPage /></AdminWorkFrame></AdminProtectedRoute>} />
          <Route path="/admin/chat" element={<AdminProtectedRoute><AdminWorkFrame tab="chat" subtitle="Chat"><ChatPage /></AdminWorkFrame></AdminProtectedRoute>} />
          <Route path="/admin/policy" element={<AdminProtectedRoute><AdminWorkFrame tab="policy" subtitle="Policy and holidays"><PolicyPage /></AdminWorkFrame></AdminProtectedRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
        <Route element={<Protected><AppLayout /></Protected>}>
          <Route index element={<Landing />} />
          <Route element={<FullOnly />}>
            <Route path="about" element={<AboutPage />} />
            <Route path="org-chart" element={<Navigate to="/group-structure" replace />} />
            <Route path="group-structure" element={<ChartPage kind="group" />} />
            <Route path="organisation-flow" element={<OrganisationFlowPage />} />
            <Route path="hr/:n" element={<ChartPage kind="hr" />} />
            <Route path="departments/:key" element={<ChartPage kind="dept" />} />
            <Route path="product-ppt" element={<ProductPresentationsPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="administration" element={<ChartPage kind="admin" />} />
            <Route path="factory-layout" element={<FactoryLayoutPage />} />
            <Route path="office-layout" element={<OfficeLayoutPage />} />
            <Route path="factory-dimensions" element={<FactoryDimensionsPage />} />
          </Route>
          <Route path="work" element={<WorkHomePage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="policy" element={<PolicyPage />} />
          <Route path="my-profile" element={<MyProfilePage />} />
          <Route path="my-team" element={<MyTeamPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
