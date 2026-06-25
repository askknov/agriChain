import { Link, useLocation } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { shortenAddress } from "../utils/helpers";
import {
  HiOutlineHome,
  HiOutlineUserAdd,
  HiOutlineViewGrid,
  HiOutlineChartBar,
  HiOutlineCamera,
  HiOutlineTruck,
  HiOutlineCog,
} from "react-icons/hi";

const navLinks = [
  { path: "/", label: "Dashboard", icon: HiOutlineHome },
  { path: "/register", label: "Register", icon: HiOutlineUserAdd },
  { path: "/crops", label: "Crops", icon: HiOutlineViewGrid },
  { path: "/predictions", label: "ML Predictions", icon: HiOutlineChartBar },
  { path: "/scanner", label: "Crop Scanner", icon: HiOutlineCamera },
  { path: "/supply-chain", label: "Supply Chain", icon: HiOutlineTruck },
  { path: "/admin", label: "Admin", icon: HiOutlineCog },
];

export default function Navbar() {
  const {
    account,
    isConnecting,
    isDemoMode,
    demoAccountIndex,
    demoAccounts,
    connectWallet,
    connectDemo,
    switchDemoAccount,
    disconnectWallet,
  } = useWeb3();
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">
          <span className="logo-icon">🌾</span>
          <span className="logo-text">AgriChain</span>
        </div>
      </div>

      <div className="navbar-links">
        {navLinks.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`nav-link ${location.pathname === path ? "active" : ""}`}
          >
            <Icon className="nav-icon" />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <div className="navbar-wallet">
        {account ? (
          <div className="wallet-info">
            {isDemoMode && (
              <div className="demo-badge">DEMO MODE</div>
            )}
            <div className="wallet-address">
              <span className="wallet-dot"></span>
              {shortenAddress(account)}
            </div>
            {isDemoMode && (
              <select
                className="demo-select"
                value={demoAccountIndex}
                onChange={(e) => switchDemoAccount(Number(e.target.value))}
              >
                {demoAccounts.map((acc, i) => (
                  <option key={i} value={i}>
                    {acc.label}
                  </option>
                ))}
              </select>
            )}
            <button className="btn btn-outline btn-sm" onClick={disconnectWallet}>
              Disconnect
            </button>
          </div>
        ) : (
          <div className="connect-buttons">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => connectDemo(0)}
              disabled={isConnecting}
              style={{ width: "100%", marginBottom: "0.5rem" }}
            >
              {isConnecting ? "Connecting..." : "Demo Mode (No Wallet)"}
            </button>
            {window.ethereum && (
              <button
                className="btn btn-outline btn-sm"
                onClick={connectWallet}
                disabled={isConnecting}
                style={{ width: "100%" }}
              >
                Connect MetaMask
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
