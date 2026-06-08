import { useEffect, useState } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Metrics } from "./pages/Metrics";
import { Goals } from "./pages/Goals";
import { EventsDashboard } from "./pages/EventsDashboard";
import { KshCdpoPage } from "./pages/KshCdpoPage";
import { KshCdpoDashboard } from "./pages/KshCdpoDashboard";
import { PresentationsPage } from "./pages/PresentationsPage";
import { PresentationPackagePage } from "./pages/PresentationPackagePage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { MboPage } from "./pages/MboPage";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import { subscribeToAuthState, syncAuthStateFromSupabase } from "./utils/api";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const session = await syncAuthStateFromSupabase();
        if (!isMounted) return;
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error("Failed to sync auth session:", error);
        if (!isMounted) return;
        setIsAuthenticated(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    const unsubscribe = subscribeToAuthState((session) => {
      if (!isMounted) return;
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-[#0a0a0f]" />;
  }

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
      { path: "mbo", Component: MboPage },
      { path: "dashboard", Component: EventsDashboard },
      { path: "metrics", Component: Metrics },
      { path: "goals", Component: Goals },
      { path: "ksh-cdpo", Component: KshCdpoPage },
      { path: "ksh-cdpo/:dashboardId", Component: KshCdpoDashboard },
      { path: "presentations", Component: PresentationsPage },
      { path: "presentations/:presentationId", Component: PresentationPackagePage },
      { path: "workspace/:pageId", Component: WorkspacePage },
    ],
  },
]);
