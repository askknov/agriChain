import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { farmerAPI, shortenAddress, formatDate } from "../utils/helpers";
import toast from "react-hot-toast";

export default function Admin() {
  const { account, contracts } = useWeb3();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFarmers();
  }, []);

  async function fetchFarmers() {
    try {
      const res = await farmerAPI.getAll();
      setFarmers(res.data);
    } catch {
      // backend not available
    }
  }

  async function handleVerify(farmer) {
    setLoading(true);
    try {
      // Verify on blockchain
      if (contracts.farmerRegistry) {
        toast.loading("Verifying on blockchain...", { id: "verify" });
        const tx = await contracts.farmerRegistry.verifyFarmer(
          farmer.walletAddress
        );
        await tx.wait();
        toast.success("Blockchain verification confirmed!", { id: "verify" });
      }

      // Update backend
      await farmerAPI.verify(farmer.walletAddress);
      toast.success(`${farmer.name} has been verified!`);
      fetchFarmers();
    } catch (error) {
      toast.error(error.reason || error.message, { id: "verify" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">
        <span>⚙️</span> Admin Panel
      </h1>
      <p className="page-desc">
        Manage farmer verification and system overview. Only the contract
        owner (deployer) can verify farmers.
      </p>

      <div className="admin-info-card">
        <p>
          <strong>Connected as:</strong>{" "}
          {account ? shortenAddress(account) : "Not connected"}
        </p>
        <p>
          <strong>Total Farmers:</strong> {farmers.length}
        </p>
        <p>
          <strong>Verified:</strong>{" "}
          {farmers.filter((f) => f.isVerified).length}
        </p>
        <p>
          <strong>Pending:</strong>{" "}
          {farmers.filter((f) => !f.isVerified).length}
        </p>
      </div>

      <h2 className="section-title">Registered Farmers</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Wallet</th>
              <th>Farm Size</th>
              <th>Registered</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {farmers.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-row">
                  No farmers registered yet
                </td>
              </tr>
            ) : (
              farmers.map((farmer) => (
                <tr key={farmer._id}>
                  <td>
                    <strong>{farmer.name}</strong>
                  </td>
                  <td>{farmer.location}</td>
                  <td>
                    <code>{shortenAddress(farmer.walletAddress)}</code>
                  </td>
                  <td>{farmer.farmSize || "—"}</td>
                  <td>{formatDate(farmer.createdAt)}</td>
                  <td>
                    {farmer.isVerified ? (
                      <span className="status-badge verified">✅ Verified</span>
                    ) : (
                      <span className="status-badge pending">⏳ Pending</span>
                    )}
                  </td>
                  <td>
                    {!farmer.isVerified && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleVerify(farmer)}
                        disabled={loading}
                      >
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
