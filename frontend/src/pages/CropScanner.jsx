import { useState, useRef } from "react";
import { useWeb3 } from "../context/Web3Context";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function CropScanner() {
  const { account } = useWeb3();
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10 MB");
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) {
      toast.error("Please upload a leaf image first");
      return;
    }

    setScanning(true);
    toast.loading("Scanning leaf for diseases...", { id: "scan" });

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("temperature", "28");
      formData.append("humidity", "70");
      formData.append("rainfall", "100");

      const response = await fetch(`${API_BASE}/predictions/scan-image`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Scan failed");
      }

      setResult(data.scanResult);
      toast.success("Scan complete!", { id: "scan" });
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("Scan failed: " + error.message, { id: "scan" });
    } finally {
      setScanning(false);
    }
  };

  const clearScan = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return "#10b981";
    if (confidence >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="page">
      <h1 className="page-title">
        <span>🔬</span> Crop Disease Scanner
      </h1>
      <p className="page-desc">
        Upload a leaf image to identify diseases using our AI model trained on
        31 crop conditions across Maize, Potato, Rice, Tea, and Tomato.
      </p>

      <div className="scanner-layout">
        {/* Upload Section */}
        <div className="scanner-upload-section">
          <div
            className={`scanner-dropzone ${dragActive ? "drag-active" : ""} ${preview ? "has-preview" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !preview && fileInputRef.current?.click()}
          >
            {preview ? (
              <div className="scanner-preview-wrapper">
                <img src={preview} alt="Leaf preview" className="scanner-preview-img" />
                <button className="scanner-clear-btn" onClick={(e) => { e.stopPropagation(); clearScan(); }}>
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div className="scanner-placeholder">
                <span className="scanner-icon">📸</span>
                <h3>Upload Leaf Image</h3>
                <p>Drag & drop a crop leaf photo here, or click to browse</p>
                <p className="scanner-formats">Supports: JPG, JPEG, PNG (max 10 MB)</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              style={{ display: "none" }}
              id="leaf-image-upload"
            />
          </div>

          <button
            className="btn btn-primary btn-lg scanner-btn"
            onClick={handleScan}
            disabled={!selectedFile || scanning}
            id="scan-disease-btn"
          >
            {scanning ? (
              <>
                <span className="spinner"></span> Analyzing with AI...
              </>
            ) : (
              "🤖 Scan for Diseases"
            )}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="scanner-results">
            {/* Main Result Card */}
            <div className={`scanner-result-card ${result.is_healthy ? "healthy" : "diseased"}`}>
              <div className="result-header">
                <span className="result-status-icon">
                  {result.is_healthy ? "✅" : "⚠️"}
                </span>
                <div>
                  <h2 className="result-disease-name">{result.disease_name}</h2>
                  <p className="result-crop">Crop: {result.crop_type?.charAt(0).toUpperCase() + result.crop_type?.slice(1)}</p>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="result-confidence">
                <div className="confidence-header">
                  <span>Confidence</span>
                  <span style={{ color: getConfidenceColor(result.confidence) }}>
                    {result.confidence}%
                  </span>
                </div>
                <div className="confidence-bar-bg">
                  <div
                    className="confidence-bar-fill"
                    style={{
                      width: `${Math.min(100, result.confidence)}%`,
                      backgroundColor: getConfidenceColor(result.confidence),
                    }}
                  ></div>
                </div>
              </div>

              {/* Health Score */}
              <div className="result-health">
                <span className="health-label">Health Score</span>
                <span className={`health-value ${result.is_healthy ? "good" : "bad"}`}>
                  {result.health_score}/100
                </span>
              </div>
            </div>

            {/* Disease Risk Card */}
            {result.disease_risk && (
              <div className="scanner-result-card risk-card">
                <h3>📊 Disease Risk Assessment</h3>
                <div className="risk-score">
                  <span className="risk-value">{result.disease_risk.risk_score}</span>
                  <span className="risk-label">{result.disease_risk.risk_label}</span>
                </div>
                <p className="risk-model">Model: {result.disease_risk.model}</p>
              </div>
            )}

            {/* Top 5 Probabilities */}
            {result.all_probabilities && (
              <div className="scanner-result-card probs-card">
                <h3>🔍 Top Predictions</h3>
                <div className="prob-list">
                  {Object.entries(result.all_probabilities).map(([name, prob]) => (
                    <div key={name} className="prob-item">
                      <span className="prob-name">{name.replace(/_/g, " ")}</span>
                      <div className="prob-bar-bg">
                        <div
                          className="prob-bar-fill"
                          style={{ width: `${Math.min(100, prob)}%` }}
                        ></div>
                      </div>
                      <span className="prob-value">{prob}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="scanner-result-card recs-card">
                <h3>💡 Recommendations</h3>
                <ul className="rec-list">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="rec-item">
                      <span className="rec-bullet">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Model Info */}
            <div className="scanner-model-info">
              <p>Model: {result.model}</p>
              <p>Source: {result.source}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
