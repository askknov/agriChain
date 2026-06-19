import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { cropAPI, predictionAPI, formatDate } from "../utils/helpers";
import { CROP_STATUS } from "../utils/contracts";
import toast from "react-hot-toast";

export default function CropManagement() {
  const { account, contracts } = useWeb3();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    cropType: "Wheat",
    location: "",
    plantingDate: "",
    soilType: "",
    irrigationType: "",
    notes: "",
  });

  const cropTypes = ["Wheat", "Rice", "Tomato", "Cotton", "Sugarcane", "Maize", "Soybean"];

  useEffect(() => {
    if (account) fetchCrops();
  }, [account]);

  async function fetchCrops() {
    try {
      const res = await cropAPI.getAll(account);
      setCrops(res.data);
    } catch {
      // Backend not available
    }
  }

  async function handleRegisterCrop(e) {
    e.preventDefault();
    if (!account) return toast.error("Connect wallet first");

    setLoading(true);
    try {
      const plantingTimestamp = Math.floor(
        new Date(form.plantingDate).getTime() / 1000
      );

      // Register on blockchain
      let txHash = "";
      let onChainId = null;
      if (contracts.cropRegistry) {
        toast.loading("Sending to blockchain...", { id: "crop" });
        const tx = await contracts.cropRegistry.registerCrop(
          form.cropType,
          plantingTimestamp,
          form.location
        );
        const receipt = await tx.wait();
        txHash = receipt.hash;

        // Parse event to get crop ID
        const event = receipt.logs
          .map((log) => {
            try {
              return contracts.cropRegistry.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((e) => e && e.name === "CropRegistered");

        onChainId = event ? Number(event.args.cropId) : null;
        toast.success("Blockchain confirmed!", { id: "crop" });
      }

      // Save to backend
      await cropAPI.register({
        onChainId,
        farmerAddress: account,
        cropType: form.cropType,
        location: form.location,
        plantingDate: form.plantingDate,
        soilType: form.soilType,
        irrigationType: form.irrigationType,
        notes: form.notes,
        txHash,
      });

      toast.success("Crop registered successfully!");
      setShowForm(false);
      setForm({
        cropType: "Wheat",
        location: "",
        plantingDate: "",
        soilType: "",
        irrigationType: "",
        notes: "",
      });
      fetchCrops();
    } catch (error) {
      toast.error(error.reason || error.message || "Failed to register crop");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzeCrop(cropId) {
    try {
      toast.loading("Running ML analysis...", { id: "analyze" });
      const res = await predictionAPI.analyze(cropId);
      toast.success(
        `${res.data.length} predictions generated!`,
        { id: "analyze" }
      );
      // Optionally navigate to predictions page
    } catch (error) {
      toast.error("Analysis failed: " + error.message, { id: "analyze" });
    }
  }

  function getStatusColor(status) {
    const colors = {
      Planted: "#10b981",
      Growing: "#f59e0b",
      ReadyForHarvest: "#8b5cf6",
      Harvested: "#06b6d4",
      InTransit: "#f97316",
      Delivered: "#22c55e",
    };
    return colors[status] || "#6b7280";
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>🌱</span> Crop Management
          </h1>
          <p className="page-desc">
            Register and track your crops on the blockchain. Run ML analysis
            for insights.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ Register New Crop"}
        </button>
      </div>

      {/* Register Form */}
      {showForm && (
        <div className="form-card">
          <h2>Register New Crop</h2>
          <form onSubmit={handleRegisterCrop}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="cropType">Crop Type *</label>
                <select
                  id="cropType"
                  name="cropType"
                  value={form.cropType}
                  onChange={(e) =>
                    setForm({ ...form, cropType: e.target.value })
                  }
                >
                  {cropTypes.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="cropLocation">Location *</label>
                <input
                  id="cropLocation"
                  type="text"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="e.g., Field A, Pune"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="plantingDate">Planting Date *</label>
                <input
                  id="plantingDate"
                  type="date"
                  value={form.plantingDate}
                  onChange={(e) =>
                    setForm({ ...form, plantingDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="soilType">Soil Type</label>
                <select
                  id="soilType"
                  value={form.soilType}
                  onChange={(e) =>
                    setForm({ ...form, soilType: e.target.value })
                  }
                >
                  <option value="">Select...</option>
                  <option value="Alluvial">Alluvial</option>
                  <option value="Black">Black (Regur)</option>
                  <option value="Red">Red</option>
                  <option value="Laterite">Laterite</option>
                  <option value="Sandy">Sandy</option>
                  <option value="Clayey">Clayey</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="irrigationType">Irrigation</label>
                <select
                  id="irrigationType"
                  value={form.irrigationType}
                  onChange={(e) =>
                    setForm({ ...form, irrigationType: e.target.value })
                  }
                >
                  <option value="">Select...</option>
                  <option value="Drip">Drip</option>
                  <option value="Sprinkler">Sprinkler</option>
                  <option value="Flood">Flood</option>
                  <option value="Rainfed">Rainfed</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <input
                  id="notes"
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? "Registering..." : "Register Crop on Blockchain"}
            </button>
          </form>
        </div>
      )}

      {/* Crop List */}
      <div className="cards-grid">
        {crops.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🌾</span>
            <h3>No crops registered yet</h3>
            <p>Click "Register New Crop" to add your first crop.</p>
          </div>
        ) : (
          crops.map((crop) => (
            <div key={crop._id} className="crop-card">
              <div className="crop-header">
                <h3>{crop.cropType}</h3>
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: getStatusColor(crop.status) + "20",
                    color: getStatusColor(crop.status),
                  }}
                >
                  {crop.status}
                </span>
              </div>
              <div className="crop-details">
                <p>
                  <strong>📍 Location:</strong> {crop.location}
                </p>
                <p>
                  <strong>📅 Planted:</strong> {formatDate(crop.plantingDate)}
                </p>
                {crop.soilType && (
                  <p>
                    <strong>🧱 Soil:</strong> {crop.soilType}
                  </p>
                )}
                {crop.onChainId && (
                  <p>
                    <strong>🔗 Chain ID:</strong> #{crop.onChainId}
                  </p>
                )}
              </div>
              <div className="crop-actions">
                <button
                  className="btn btn-accent btn-sm"
                  onClick={() => handleAnalyzeCrop(crop._id)}
                >
                  🤖 Run ML Analysis
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
