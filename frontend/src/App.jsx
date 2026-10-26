import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import Fetcher from "./pages/Fetcher.jsx";
import FetcherList from "./pages/FetcherList.jsx";
import AIPosts from "./pages/AIPosts.jsx";
import { Toaster } from "sonner";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Connect from "./pages/Connect";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import { LoadingSkeleton } from "./components/WorkspaceUI";
const Studio = lazy(() => import("./pages/Studio.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />

      <BrowserRouter>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="p-6">
                <LoadingSkeleton />
              </div>
            }
          >
            <Routes>
              <Route path="/connect" element={<Connect />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/fetcher" element={<Fetcher />} />
                  <Route path="/records" element={<FetcherList />} />
                  <Route path="/studio" element={<Studio />} />
                  <Route path="/posts" element={<AIPosts />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Dashboard />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}

export default App;
