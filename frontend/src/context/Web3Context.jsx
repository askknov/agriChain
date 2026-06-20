import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import {
  FARMER_REGISTRY_ABI,
  CROP_REGISTRY_ABI,
  ML_PREDICTION_STORE_ABI,
  SUPPLY_CHAIN_ABI,
  CONTRACT_ADDRESSES,
} from "../utils/contracts";

const Web3Context = createContext(null);

// Hardhat test accounts (LOCAL ONLY — free fake ETH, not real money)
const DEMO_ACCOUNTS = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    key: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    label: "Demo Farmer (Account #0)",
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    key: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    label: "Demo Processor (Account #1)",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    key: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    label: "Demo Retailer (Account #2)",
  },
];

const HARDHAT_RPC = "http://127.0.0.1:8545";

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [contracts, setContracts] = useState({});
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoAccountIndex, setDemoAccountIndex] = useState(0);

  // Initialize contracts with signer
  const initContracts = useCallback((signerInstance) => {
    const c = {};

    if (CONTRACT_ADDRESSES.FarmerRegistry) {
      c.farmerRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.FarmerRegistry,
        FARMER_REGISTRY_ABI,
        signerInstance
      );
    }
    if (CONTRACT_ADDRESSES.CropRegistry) {
      c.cropRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.CropRegistry,
        CROP_REGISTRY_ABI,
        signerInstance
      );
    }
    if (CONTRACT_ADDRESSES.MLPredictionStore) {
      c.mlPredictionStore = new ethers.Contract(
        CONTRACT_ADDRESSES.MLPredictionStore,
        ML_PREDICTION_STORE_ABI,
        signerInstance
      );
    }
    if (CONTRACT_ADDRESSES.SupplyChain) {
      c.supplyChain = new ethers.Contract(
        CONTRACT_ADDRESSES.SupplyChain,
        SUPPLY_CHAIN_ABI,
        signerInstance
      );
    }

    setContracts(c);
  }, []);

  // ── DEMO MODE: Connect directly to local Hardhat without MetaMask ──
  const connectDemo = async (accountIndex = 0) => {
    try {
      setIsConnecting(true);
      const demoAccount = DEMO_ACCOUNTS[accountIndex] || DEMO_ACCOUNTS[0];

      // Try to connect to local Hardhat node
      const jsonProvider = new ethers.JsonRpcProvider(HARDHAT_RPC);
      
      try {
        // Quick check if node is alive
        await jsonProvider.getNetwork();
        
        const wallet = new ethers.Wallet(demoAccount.key, jsonProvider);
        setProvider(jsonProvider);
        setSigner(wallet);
        setAccount(demoAccount.address.toLowerCase());
        setChainId(31337);
        setIsDemoMode(true);
        setDemoAccountIndex(accountIndex);
        initContracts(wallet);
        console.log(`Demo mode: Connected to Hardhat as ${demoAccount.label}`);
      } catch (e) {
        // Fallback for cloud/phone access where localhost:8545 doesn't exist
        console.log("Local blockchain not found. Starting Cloud Offline Demo Mode.");
        setProvider(null);
        setSigner(null);
        setAccount(demoAccount.address.toLowerCase());
        setChainId(null);
        setIsDemoMode(true);
        setDemoAccountIndex(accountIndex);
        setContracts({}); // Empty contracts triggers the fallback logic in components
        toast?.success("Connected in Cloud Demo Mode (Blockchain Skipped)");
      }
    } catch (error) {
      console.error("Demo connect failed:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  // ── METAMASK MODE: Connect via MetaMask (original) ──
  const connectWallet = async () => {
    if (!window.ethereum) {
      // If no MetaMask, auto-use demo mode
      await connectDemo(0);
      return;
    }

    try {
      setIsConnecting(true);
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const signerInstance = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(signerInstance);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      setIsDemoMode(false);
      initContracts(signerInstance);
    } catch (error) {
      console.error("MetaMask connect failed, switching to demo mode:", error);
      // Fallback to demo mode if MetaMask fails
      await connectDemo(0);
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch demo account
  const switchDemoAccount = async (index) => {
    if (isDemoMode) {
      await connectDemo(index);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setContracts({});
    setIsDemoMode(false);
  };

  // Listen for MetaMask account/chain changes (only if MetaMask is present)
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
        connectWallet();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        chainId,
        contracts,
        isConnecting,
        isDemoMode,
        demoAccountIndex,
        demoAccounts: DEMO_ACCOUNTS,
        connectWallet,
        connectDemo,
        switchDemoAccount,
        disconnectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
