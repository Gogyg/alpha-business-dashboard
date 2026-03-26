import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Metrics } from "./pages/Metrics";
import { Goals } from "./pages/Goals";
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
      { path: "metrics", Component: Metrics },
      { path: "goals", Component: Goals },
    ],
  },
]);