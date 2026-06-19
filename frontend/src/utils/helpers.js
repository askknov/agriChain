const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Helper for API calls
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

// ── Farmer APIs ──
export const farmerAPI = {
  getAll: () => apiCall("/farmers"),
  getByAddress: (addr) => apiCall(`/farmers/${addr}`),
  register: (data) => apiCall("/farmers", { method: "POST", body: data }),
  verify: (addr) => apiCall(`/farmers/${addr}/verify`, { method: "PUT" }),
};

// ── Crop APIs ──
export const cropAPI = {
  getAll: (farmer) =>
    apiCall(`/crops${farmer ? `?farmer=${farmer}` : ""}`),
  getById: (id) => apiCall(`/crops/${id}`),
  register: (data) => apiCall("/crops", { method: "POST", body: data }),
  updateStatus: (id, data) =>
    apiCall(`/crops/${id}/status`, { method: "PUT", body: data }),
};

// ── Prediction APIs ──
export const predictionAPI = {
  analyze: (cropId) =>
    apiCall(`/predictions/analyze/${cropId}`, { method: "POST" }),
  getByCrop: (cropId) => apiCall(`/predictions/crop/${cropId}`),
  getById: (id) => apiCall(`/predictions/${id}`),
  verify: (id) => apiCall(`/predictions/verify/${id}`, { method: "POST" }),
};

// ── Supply Chain APIs ──
export const supplyChainAPI = {
  getAll: (handler) =>
    apiCall(`/supplychain${handler ? `?handler=${handler}` : ""}`),
  getById: (id) => apiCall(`/supplychain/${id}`),
  create: (data) => apiCall("/supplychain", { method: "POST", body: data }),
  transfer: (id, data) =>
    apiCall(`/supplychain/${id}/transfer`, { method: "PUT", body: data }),
  getHistory: (id) => apiCall(`/supplychain/${id}/history`),
};

// ── Dashboard APIs ──
export const dashboardAPI = {
  getStats: () => apiCall("/dashboard/stats"),
  health: () => apiCall("/health"),
};

/**
 * Format a date from timestamp
 */
export function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  const date =
    typeof timestamp === "number"
      ? new Date(timestamp * 1000) // blockchain timestamps are in seconds
      : new Date(timestamp);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Shorten an Ethereum address
 */
export function shortenAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Get Etherscan URL for a transaction
 */
export function getEtherscanUrl(txHash, network = "sepolia") {
  const base =
    network === "sepolia"
      ? "https://sepolia.etherscan.io"
      : "https://etherscan.io";
  return `${base}/tx/${txHash}`;
}
