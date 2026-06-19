import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { dashboardAPI } from "../utils/helpers";
import {
  HiOutlineUsers,
  HiOutlineCollection,
  HiOutlineChartBar,
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineLightningBolt,
} from "react-icons/hi";

export default function Dashboard() {
  const { account, chainId } = useWeb3();
  const [stats, setStats] = useState({
    farmers: 0,
    crops: 0,
    predictions: 0,
    batches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await dashboardAPI.getStats();
        setStats(res.data);
      } catch {
        // Use default zeros if backend not available
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Registered Farmers",
      value: stats.farmers,
      icon: HiOutlineUsers,
      color: "var(--color-primary)",
      gradient: "linear-gradient(135deg, #10b981, #059669)",
    },
    {
      label: "Crops Tracked",
      value: stats.crops,
      icon: HiOutlineCollection,
      color: "var(--color-accent)",
      gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    },
    {
      label: "ML Predictions",
      value: stats.predictions,
      icon: HiOutlineChartBar,
      color: "#8b5cf6",
      gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    },
    {
      label: "Supply Chain Batches",
      value: stats.batches,
      icon: HiOutlineTruck,
      color: "#06b6d4",
      gradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
    },
  ];

  const features = [
    {
      icon: HiOutlineShieldCheck,
      title: "Tamper-Proof Records",
      desc: "All farming activities recorded on Ethereum blockchain for complete transparency and verification.",
    },
    {
      icon: HiOutlineChartBar,
      title: "ML-Powered Insights",
      desc: "AI analysis for crop health, disease risk, yield prediction, and market price forecasting.",
    },
    {
      icon: HiOutlineTruck,
      title: "Farm-to-Fork Tracking",
      desc: "Track every step of the supply chain from harvest to retail with full provenance data.",
    },
    {
      icon: HiOutlineLightningBolt,
      title: "Smart Contracts",
      desc: "Automated verification and trust through Ethereum smart contracts on Sepolia testnet.",
    },
  ];

  return (
    <div className="page dashboard">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-emoji">🌾</span>
            AgriChain
          </h1>
          <p className="hero-subtitle">
            Blockchain & ML Based Sustainable Agricultural Value Chain Management
          </p>
          <div className="hero-badges">
            <span className="badge badge-success">
              {account ? "Wallet Connected" : "Wallet Not Connected"}
            </span>
            <span className="badge badge-info">
              {chainId === 11155111
                ? "Sepolia Testnet"
                : chainId === 31337
                  ? "Hardhat Local"
                  : "Unknown Network"}
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-icon-wrap" style={{ background: card.gradient }}>
              <card.icon className="stat-icon" />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {loading ? "..." : card.value}
              </span>
              <span className="stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="features-section">
        <h2 className="section-title">Platform Features</h2>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon-wrap">
                <f.icon className="feature-icon" />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* System Architecture Info */}
      <section className="arch-section">
        <h2 className="section-title">System Architecture</h2>
        <div className="arch-grid">
          <div className="arch-card">
            <h3>🔗 On-Chain (Ethereum)</h3>
            <ul>
              <li>Farmer identities & verification</li>
              <li>Crop lifecycle status</li>
              <li>ML prediction hashes (integrity proof)</li>
              <li>Supply chain transfer records</li>
            </ul>
          </div>
          <div className="arch-card">
            <h3>💾 Off-Chain (MongoDB)</h3>
            <ul>
              <li>Detailed farmer profiles</li>
              <li>Crop images & soil data</li>
              <li>Full ML prediction results</li>
              <li>Logistics & transfer details</li>
            </ul>
          </div>
          <div className="arch-card">
            <h3>🤖 ML Module</h3>
            <ul>
              <li>Crop health assessment</li>
              <li>Disease risk prediction</li>
              <li>Yield estimation</li>
              <li>Market price forecasting</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
