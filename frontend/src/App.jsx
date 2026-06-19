import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Web3Provider } from "./context/Web3Context";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import FarmerRegistration from "./pages/FarmerRegistration";
import CropManagement from "./pages/CropManagement";
import MLPredictions from "./pages/MLPredictions";
import SupplyChainTracker from "./pages/SupplyChainTracker";
import Admin from "./pages/Admin";
import "./index.css";

export default function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/register" element={<FarmerRegistration />} />
              <Route path="/crops" element={<CropManagement />} />
              <Route path="/predictions" element={<MLPredictions />} />
              <Route path="/supply-chain" element={<SupplyChainTracker />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
              },
            }}
          />
        </div>
      </Router>
    </Web3Provider>
  );
}
