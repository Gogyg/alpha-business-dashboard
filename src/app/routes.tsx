import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Metrics } from "./pages/Metrics";
import { Goals } from "./pages/Goals";
import { EventsDashboard } from "./pages/EventsDashboard";
import { KshCdpoPage } from "./pages/KshCdpoPage";
import { KshCdpoDashboard } from "./pages/KshCdpoDashboard";
import { WorkspacePage } from "./pages/WorkspacePage";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import { getAuthToken } from "./utils/api";

// Protected route component (Auth temporarily disabled by user request)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = !!getAuthToken();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/reset-password",
    Component: ResetPassword,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: "dashboard", Component: EventsDashboard },
      { path: "metrics", Component: Metrics },
      { path: "goals", Component: Goals },
      { path: "ksh-cdpo", Component: KshCdpoPage },
      { path: "ksh-cdpo/:dashboardId", Component: KshCdpoDashboard },
      { path: "workspace/:pageId", Component: WorkspacePage },
    ],
  },
]);
