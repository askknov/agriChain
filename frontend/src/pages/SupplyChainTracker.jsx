import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { supplyChainAPI, cropAPI, formatDate, shortenAddress } from "../utils/helpers";
import { BATCH_STATUS } from "../utils/contracts";
import toast from "react-hot-toast";

export default function SupplyChainTracker() {
  const { account, contracts } = useWeb3();
  const [batches, setBatches] = useState([]);
  const [crops, setCrops] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ cropId: "", quantity: "", unit: "kg" });
  const [transferForm, setTransferForm] = useState({
    to: "",
    toName: "",
    toRole: "Processor",
    newStatus: "Processing",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [account]);

  async function fetchData() {
    try {
      const [batchRes, cropRes] = await Promise.all([
        supplyChainAPI.getAll(),
        cropAPI.getAll(account),
      ]);
      setBatches(batchRes.data);
      setCrops(cropRes.data);
    } catch {
      // backend not available
    }
  }

  async function handleCreateBatch(e) {
    e.preventDefault();
    if (!account) return toast.error("Connect wallet first");

    setLoading(true);
    try {
      const crop = crops.find((c) => c._id === form.cropId);
      let txHash = "";
      let onChainId = null;

      if (contracts.supplyChain && crop?.onChainId) {
        toast.loading("Creating batch on blockchain...", { id: "batch" });
        const tx = await contracts.supplyChain.createBatch(
          crop.onChainId,
          form.quantity,
          form.unit,
          "Farmer"
        );
        const receipt = await tx.wait();
        txHash = receipt.hash;

        const event = receipt.logs
          .map((log) => {
            try { return contracts.supplyChain.interface.parseLog(log); }
            catch { return null; }
          })
          .find((e) => e && e.name === "BatchCreated");

        onChainId = event ? Number(event.args.batchId) : null;
        toast.success("Batch created on-chain!", { id: "batch" });
      }

      await supplyChainAPI.create({
        onChainId,
        cropId: form.cropId,
        onChainCropId: crop?.onChainId,
        quantity: Number(form.quantity),
        unit: form.unit,
        currentHandler: account,
        currentHandlerName: "Farmer",
        txHash,
      });

      toast.success("Batch created!");
      setShowForm(false);
      setForm({ cropId: "", quantity: "", unit: "kg" });
      fetchData();
    } catch (error) {
      toast.error(error.reason || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer(batchId) {
    setLoading(true);
    try {
      await supplyChainAPI.transfer(batchId, {
        to: transferForm.to,
        toName: transferForm.toName,
        toRole: transferForm.toRole,
        newStatus: transferForm.newStatus,
        notes: transferForm.notes,
      });
      toast.success("Batch transferred!");
      setShowTransfer(null);
      setTransferForm({
        to: "",
        toName: "",
        toRole: "Processor",
        newStatus: "Processing",
        notes: "",
      });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status) {
    const colors = {
      Created: "#10b981",
      Processing: "#f59e0b",
      Processed: "#8b5cf6",
      InTransit: "#f97316",
      Delivered: "#06b6d4",
      AtRetailer: "#ec4899",
      Sold: "#22c55e",
    };
    return colors[status] || "#6b7280";
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>🚛</span> Supply Chain Tracker
          </h1>
          <p className="page-desc">
            Track produce from farm to market with blockchain-verified
            provenance.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ Create Batch"}
        </button>
      </div>

      {/* Create Batch Form */}
      {showForm && (
        <div className="form-card">
          <h2>Create New Batch</h2>
          <form onSubmit={handleCreateBatch}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="batchCrop">Select Crop</label>
                <select
                  id="batchCrop"
                  value={form.cropId}
                  onChange={(e) => setForm({ ...form, cropId: e.target.value })}
                  required
                >
                  <option value="">Choose a crop...</option>
                  {crops.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.cropType} — {c.location}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="quantity">Quantity</label>
                <input
                  id="quantity"
                  type="number"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                  placeholder="e.g., 500"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="unit">Unit</label>
                <select
                  id="unit"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="quintal">quintal</option>
                  <option value="ton">ton</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Batch"}
            </button>
          </form>
        </div>
      )}

      {/* Batch List */}
      <div className="batch-list">
        {batches.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📦</span>
            <h3>No batches yet</h3>
            <p>Create a batch from a harvested crop to start tracking.</p>
          </div>
        ) : (
          batches.map((batch) => (
            <div key={batch._id} className="batch-card">
              <div className="batch-header">
                <h3>
                  Batch #{batch.onChainId || "—"}{" "}
                  {batch.cropId?.cropType && `(${batch.cropId.cropType})`}
                </h3>
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: getStatusColor(batch.status) + "20",
                    color: getStatusColor(batch.status),
                  }}
                >
                  {batch.status}
                </span>
              </div>

              <div className="batch-info">
                <p>
                  <strong>Quantity:</strong> {batch.quantity} {batch.unit}
                </p>
                <p>
                  <strong>Handler:</strong> {batch.currentHandlerName} (
                  {batch.currentHandlerRole})
                </p>
                <p>
                  <strong>Created:</strong> {formatDate(batch.createdAt)}
                </p>
              </div>

              {/* Transfer Timeline */}
              {batch.transfers && batch.transfers.length > 0 && (
                <div className="timeline">
                  <h4>Transfer History</h4>
                  {batch.transfers.map((t, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <strong>
                          {t.fromName} ({t.fromRole}) → {t.toName} ({t.toRole})
                        </strong>
                        {t.notes && <p>{t.notes}</p>}
                        <span className="timeline-time">
                          {formatDate(t.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="batch-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    setShowTransfer(
                      showTransfer === batch._id ? null : batch._id
                    )
                  }
                >
                  ↗️ Transfer Batch
                </button>
              </div>

              {/* Transfer Form */}
              {showTransfer === batch._id && (
                <div className="transfer-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Recipient Address</label>
                      <input
                        type="text"
                        value={transferForm.to}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            to: e.target.value,
                          })
                        }
                        placeholder="0x..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Recipient Name</label>
                      <input
                        type="text"
                        value={transferForm.toName}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            toName: e.target.value,
                          })
                        }
                        placeholder="e.g., AgriFoods Ltd"
                      />
                    </div>
                    <div className="form-group">
                      <label>Role</label>
                      <select
                        value={transferForm.toRole}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            toRole: e.target.value,
                          })
                        }
                      >
                        <option value="Processor">Processor</option>
                        <option value="Distributor">Distributor</option>
                        <option value="Retailer">Retailer</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>New Status</label>
                      <select
                        value={transferForm.newStatus}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            newStatus: e.target.value,
                          })
                        }
                      >
                        {BATCH_STATUS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group full-width">
                      <label>Notes</label>
                      <input
                        type="text"
                        value={transferForm.notes}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Transfer notes..."
                      />
                    </div>
                  </div>
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={() => handleTransfer(batch._id)}
                    disabled={loading}
                  >
                    {loading ? "Transferring..." : "Confirm Transfer"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
