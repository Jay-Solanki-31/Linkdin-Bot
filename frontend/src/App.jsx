import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Fetcher from "./pages/Fetcher.jsx";
import FetcherList from "./pages/FetcherList";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fetcher" element={<Fetcher />} />
          <Route path="/records" element={<FetcherList />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
