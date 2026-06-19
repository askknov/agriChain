import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { cropAPI, predictionAPI, formatDate } from "../utils/helpers";
import toast from "react-hot-toast";

const typeIcons = {
  CropHealth: "🌿",
  DiseaseRisk: "🦠",
  YieldPrediction: "📊",
  MarketPrice: "💰",
  Recommendation: "💡",
};

const typeColors = {
  CropHealth: "#10b981",
  DiseaseRisk: "#ef4444",
  YieldPrediction: "#8b5cf6",
  MarketPrice: "#f59e0b",
  Recommendation: "#06b6d4",
};

export default function MLPredictions() {
  const { account } = useWeb3();
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (account) fetchCrops();
  }, [account]);

  async function fetchCrops() {
    try {
      const res = await cropAPI.getAll(account);
      setCrops(res.data);
      if (res.data.length > 0) {
        selectCrop(res.data[0]);
      }
    } catch {
      // Backend not available
    }
  }

  async function selectCrop(crop) {
    setSelectedCrop(crop);
    setLoading(true);
    try {
      const res = await predictionAPI.getByCrop(crop._id);
      setPredictions(res.data);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    if (!selectedCrop) return;
    setAnalyzing(true);
    try {
      toast.loading("Running ML analysis...", { id: "ml" });
      const res = await predictionAPI.analyze(selectedCrop._id);
      setPredictions(res.data);
      toast.success(`${res.data.length} predictions generated!`, { id: "ml" });
    } catch (error) {
      toast.error("Analysis failed", { id: "ml" });
    } finally {
      setAnalyzing(false);
    }
  }

  async function verifyPrediction(pred) {
    try {
      toast.loading("Verifying on blockchain...", { id: "verify" });
      const res = await predictionAPI.verify(pred._id);
      if (res.verified) {
        toast.success("✅ Prediction verified — data integrity confirmed!", {
          id: "verify",
        });
      } else {
        toast.error(
          "⚠️ Verification failed — " + (res.reason || "hash mismatch"),
          { id: "verify" }
        );
      }
    } catch {
      toast.error("Verification error", { id: "verify" });
    }
  }

  // Group predictions by type for the latest run
  const latestPredictions = predictions.reduce((acc, pred) => {
    if (!acc[pred.predictionType] ||
        new Date(pred.createdAt) > new Date(acc[pred.predictionType].createdAt)) {
      acc[pred.predictionType] = pred;
    }
    return acc;
  }, {});

  return (
    <div className="page">
      <h1 className="page-title">
        <span>🤖</span> ML Predictions
      </h1>
      <p className="page-desc">
        AI-powered crop analysis with blockchain-verified integrity. Select a
        crop to view or generate predictions.
      </p>

      {/* Crop Selector */}
      <div className="selector-bar">
        <div className="crop-chips">
          {crops.map((crop) => (
            <button
              key={crop._id}
              className={`chip ${selectedCrop?._id === crop._id ? "active" : ""}`}
              onClick={() => selectCrop(crop)}
            >
              {crop.cropType} — {crop.location}
            </button>
          ))}
        </div>
        {selectedCrop && (
          <button
            className="btn btn-primary"
            onClick={runAnalysis}
            disabled={analyzing}
          >
            {analyzing ? "Analyzing..." : "🔄 Run New Analysis"}
          </button>
        )}
      </div>

      {/* Predictions Display */}
      {loading ? (
        <div className="loading-state">Loading predictions...</div>
      ) : Object.keys(latestPredictions).length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <h3>No predictions yet</h3>
          <p>
            {selectedCrop
              ? 'Click "Run New Analysis" to generate ML predictions for this crop.'
              : "Select or register a crop first."}
          </p>
        </div>
      ) : (
        <div className="predictions-grid">
          {Object.values(latestPredictions).map((pred) => (
            <div
              key={pred._id}
              className="prediction-card"
              style={{
                borderTop: `3px solid ${typeColors[pred.predictionType]}`,
              }}
            >
              <div className="pred-header">
                <span className="pred-icon">
                  {typeIcons[pred.predictionType]}
                </span>
                <h3>{pred.predictionType.replace(/([A-Z])/g, " $1").trim()}</h3>
                <div className="pred-confidence">
                  <div
                    className="confidence-ring"
                    style={{
                      background: `conic-gradient(${typeColors[pred.predictionType]} ${pred.confidence * 3.6}deg, var(--bg-tertiary) 0deg)`,
                    }}
                  >
                    <span>{pred.confidence}%</span>
                  </div>
                </div>
              </div>

              <div className="pred-body">
                <div className="pred-score">
                  <span
                    className="score-badge"
                    style={{
                      backgroundColor:
                        typeColors[pred.predictionType] + "20",
                      color: typeColors[pred.predictionType],
                    }}
                  >
                    {pred.result?.label}
                  </span>
                </div>
                <p className="pred-details">{pred.result?.details}</p>

                {pred.result?.recommendations && (
                  <div className="pred-recs">
                    <h4>Recommendations:</h4>
                    <ul>
                      {pred.result.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pred-footer">
                <span className="pred-time">
                  {formatDate(pred.createdAt)}
                </span>
                <div className="pred-actions">
                  {pred.isOnChain && (
                    <span className="onchain-badge">🔗 On-Chain</span>
                  )}
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => verifyPrediction(pred)}
                  >
                    Verify Integrity
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
