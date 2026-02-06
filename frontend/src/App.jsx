import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Fetcher from "./pages/Fetcher.jsx";
import FetcherList from "./pages/FetcherList.jsx";
import QueueMonitor from "./pages/QueueMonitor.jsx";
import AIPosts from "./pages/AIPosts.jsx";
// import FetchedContent from "./pages/FetchedContent.jsx";
import { Toaster } from "sonner";

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />

      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/fetcher" element={<Fetcher />} />
            <Route path="/records" element={<FetcherList />} />
            {/* <Route path="/fetched" element={<FetchedContent />} /> */}
            <Route path="/queue" element={<QueueMonitor />} />
            <Route path="/posts" element={<AIPosts />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </>
  );
}

export default App;
