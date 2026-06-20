# 🌾 AgriChain: AI-Powered Blockchain for Agriculture

![AgriChain Banner](https://img.shields.io/badge/Blockchain-Ethereum-blue?style=for-the-badge&logo=ethereum)
![React](https://img.shields.io/badge/Frontend-React_Vite-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs)
![Python](https://img.shields.io/badge/ML-Python_Flask-3776AB?style=for-the-badge&logo=python)

**AgriChain** is a comprehensive agricultural technology platform that bridges the gap between Web3 transparency and Artificial Intelligence. It provides farmers and agricultural stakeholders with a tamper-proof supply chain tracker and AI-driven crop insights.

### 🔗 Live Demo
**[Experience AgriChain Live Here](https://agri-chain-51lcdy84m-knov.vercel.app/)**

---

## 🌟 Key Features

### 1. Blockchain-Backed Transparency (Web3)
- **Immutable Profiles:** Farmers register their identity on the Ethereum blockchain.
- **Traceable Supply Chain:** Crop batches are tracked from farm to processor to retail.
- **Tamper-Proof Data:** Machine learning predictions are hashed and stored on-chain to prevent manipulation.

### 2. AI & Machine Learning Insights
- **Disease Risk Prediction:** Uses Random Forest models trained on agricultural parameters (Temperature, Humidity, Soil pH) to predict disease outbreaks.
- **Computer Vision Crop Health:** Analyzes images using HSV/RGB color space (Excess Green Index) to detect nutrient deficiencies.
- **Yield & Price Forecasting:** Ridge Regression models analyze historical data to provide realistic market price estimates.

### 3. Cloud Demo Mode
- A built-in fallback system allows users to interact with the platform seamlessly on mobile devices or environments without local blockchain nodes, maintaining full database functionality.

---

## 🏗️ Architecture Stack

* **Frontend:** React.js, Vite, Ethers.js, TailwindCSS (Custom CSS)
* **Backend:** Node.js, Express.js, MongoDB Atlas
* **Machine Learning:** Python, Flask, Scikit-Learn, NumPy, Pillow
* **Blockchain:** Solidity, Hardhat, Ethers.js
* **Hosting:** Vercel (Frontend), Render (Backend)

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MongoDB (Local or Atlas)

### Installation Steps

**1. Clone the repository**
```bash
git clone https://github.com/askknov/agriChain.git
cd agriChain
```

**2. Start the Local Blockchain**
```bash
cd blockchain
npm install
npx hardhat node
```
*(Keep this terminal open)*

**3. Deploy Smart Contracts**
```bash
# In a new terminal
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

**4. Start the Node.js Backend**
```bash
cd backend
npm install
npm run dev
```

**5. Start the ML Service**
```bash
cd ml-service
pip install -r requirements.txt
python app.py
```

**6. Start the Frontend**
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173` in your browser.

---

## 🛡️ Security & Privacy
All environmental configurations and wallet private keys are strictly managed via `.env` files and are never exposed to the client.

## 📄 License
This project is open-source and available under the MIT License.
