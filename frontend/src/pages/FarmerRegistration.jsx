import { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { farmerAPI } from "../utils/helpers";
import toast from "react-hot-toast";

export default function FarmerRegistration() {
  const { account, contracts } = useWeb3();
  const [form, setForm] = useState({
    name: "",
    location: "",
    phone: "",
    email: "",
    farmSize: "",
  });
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [step, setStep] = useState(1); // 1: form, 2: blockchain, 3: done

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!account) {
      toast.error("Please connect your wallet first!");
      return;
    }

    if (!form.name || !form.location) {
      toast.error("Name and Location are required!");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Register on blockchain
      setStep(2);
      toast.loading("Sending transaction to blockchain...", { id: "register" });

      let txReceipt = null;
      if (contracts.farmerRegistry) {
        const tx = await contracts.farmerRegistry.registerFarmer(
          form.name,
          form.location
        );
        txReceipt = await tx.wait();
        setTxHash(txReceipt.hash);
        toast.success("Blockchain transaction confirmed!", { id: "register" });
      } else {
        toast.success("Blockchain skipped (contracts not deployed)", {
          id: "register",
        });
      }

      // Step 2: Save off-chain data to backend
      toast.loading("Saving profile to database...", { id: "backend" });
      await farmerAPI.register({
        walletAddress: account,
        name: form.name,
        location: form.location,
        phone: form.phone,
        email: form.email,
        farmSize: form.farmSize,
        txHash: txReceipt?.hash || "",
      });
      toast.success("Profile saved!", { id: "backend" });

      setStep(3);
    } catch (error) {
      console.error("Registration error:", error);
      const msg = error.reason || error.message || "Registration failed";
      toast.error(msg, { id: "register" });
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">
        <span>🧑‍🌾</span> Farmer Registration
      </h1>
      <p className="page-desc">
        Register as a farmer on the blockchain. Your identity will be recorded
        on Ethereum for transparent verification.
      </p>

      {step === 3 ? (
        <div className="success-card">
          <div className="success-icon">✅</div>
          <h2>Registration Successful!</h2>
          <p>
            Your farmer profile has been registered on the blockchain and saved
            to the database.
          </p>
          {txHash && (
            <div className="tx-info">
              <span className="tx-label">Transaction Hash:</span>
              <code className="tx-hash">{txHash}</code>
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={() => {
              setStep(1);
              setForm({
                name: "",
                location: "",
                phone: "",
                email: "",
                farmSize: "",
              });
              setTxHash("");
            }}
          >
            Register Another Farmer
          </button>
        </div>
      ) : (
        <div className="form-card">
          {/* Progress Steps */}
          <div className="progress-steps">
            <div className={`progress-step ${step >= 1 ? "active" : ""}`}>
              <span className="step-num">1</span>
              <span className="step-label">Fill Details</span>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 2 ? "active" : ""}`}>
              <span className="step-num">2</span>
              <span className="step-label">Blockchain TX</span>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 3 ? "active" : ""}`}>
              <span className="step-num">3</span>
              <span className="step-label">Complete</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g., Ramesh Kumar"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="location">Location *</label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g., Pune, Maharashtra"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g., +91 9876543210"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g., ramesh@email.com"
                />
              </div>
              <div className="form-group full-width">
                <label htmlFor="farmSize">Farm Size</label>
                <input
                  id="farmSize"
                  type="text"
                  name="farmSize"
                  value={form.farmSize}
                  onChange={handleChange}
                  placeholder="e.g., 5 acres"
                />
              </div>
            </div>

            <div className="form-info">
              <p>
                <strong>Connected Wallet:</strong>{" "}
                {account || "Not connected — connect your MetaMask wallet first"}
              </p>
              <p className="form-note">
                * This will create a transaction on the blockchain. You will need
                to confirm it in MetaMask.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !account}
            >
              {loading ? "Processing..." : "Register on Blockchain"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
