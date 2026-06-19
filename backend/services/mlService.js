/**
 * @file mlService.js
 * @description ML Service Adapter — calls the Python ML microservice.
 *
 * The ML service runs on http://localhost:8000 and provides real
 * ML predictions using scikit-learn models:
 *   - Crop Health: Image color-space analysis (ExG, NDI, green ratio)
 *   - Disease Risk: Random Forest classifier on environmental features
 *   - Yield Prediction: Ridge Regression with polynomial features
 *   - Market Price: Time-series analysis with seasonal decomposition
 *   - Recommendations: Rule-based expert system + ML insights
 *
 * Start the ML service: cd ml-service && python app.py
 */

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000/api/predict";

/**
 * Main analysis function — calls the Python ML service for all 5 predictions
 * @param {Object} cropData - { cropType, location, soilType, irrigationType }
 * @returns {Array} Array of prediction objects
 */
async function analyzeCrop(cropData) {
  try {
    const response = await fetch(ML_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cropType: cropData.cropType || "Wheat",
        location: cropData.location || "",
        soilType: cropData.soilType || "",
        irrigationType: cropData.irrigationType || "Drip",
        cropAgeDays: cropData.cropAgeDays || 60,
        temperature: cropData.temperature || 28,
        humidity: cropData.humidity || 65,
        rainfall: cropData.rainfall || 100,
        soilPh: cropData.soilPh || 6.5,
        soilMoisture: cropData.soilMoisture || 45,
      }),
    });

    if (!response.ok) {
      throw new Error(`ML service responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "ML service returned an error");
    }

    return data.predictions;
  } catch (error) {
    console.log(`⚠️  ML service error: ${error.message}`);
    console.log("   Falling back to built-in predictions...");
    // Fallback to built-in predictions if ML service is down
    return fallbackPredictions(cropData.cropType || "Wheat");
  }
}

/**
 * Analyze a single prediction type
 */
async function analyzeSingle(cropData, predictionType) {
  const allPredictions = await analyzeCrop(cropData);
  const prediction = allPredictions.find(
    (p) => p.predictionType === predictionType
  );
  if (!prediction) {
    throw new Error(`Prediction type not found: ${predictionType}`);
  }
  return prediction;
}

/**
 * Fallback predictions when ML service is unavailable.
 * These are minimal but functional so the system doesn't break.
 */
function fallbackPredictions(cropType) {
  return [
    {
      predictionType: "CropHealth",
      result: {
        score: 75,
        label: "Good",
        details: `Crop health assessment for ${cropType} based on default parameters. Connect the ML service for AI-powered analysis.`,
        recommendations: [
          "Start the ML service for real-time analysis: cd ml-service && python app.py",
          "Continue regular crop monitoring",
          "Ensure adequate irrigation",
        ],
        metadata: { analysis_method: "fallback", note: "ML service offline" },
      },
      confidence: 60,
    },
    {
      predictionType: "DiseaseRisk",
      result: {
        score: 30,
        label: "Low Risk",
        details: `Basic disease risk estimate for ${cropType}. Start the ML service for Random Forest model predictions.`,
        recommendations: [
          "Monitor for disease symptoms",
          "Ensure proper drainage",
          "Connect ML service for accurate risk assessment",
        ],
        metadata: { model: "fallback" },
      },
      confidence: 50,
    },
    {
      predictionType: "YieldPrediction",
      result: {
        score: 70,
        label: "Estimated yield (connect ML service for accuracy)",
        details: `Yield estimate for ${cropType} using regional averages. Start the ML service for regression model predictions.`,
        recommendations: [
          "Maintain current farming practices",
          "Start ML service for precise yield prediction",
        ],
        metadata: { model: "fallback" },
      },
      confidence: 45,
    },
    {
      predictionType: "MarketPrice",
      result: {
        score: 60,
        label: "Market price data (connect ML service)",
        details: `Basic price information for ${cropType}. Start the ML service for time-series forecasting.`,
        recommendations: [
          "Check local APMC mandi for current prices",
          "Start ML service for price predictions",
        ],
        metadata: { model: "fallback" },
      },
      confidence: 40,
    },
    {
      predictionType: "Recommendation",
      result: {
        score: 65,
        label: "Basic Recommendations",
        details: `General farming recommendations for ${cropType}. Start the ML service for personalized, condition-based recommendations.`,
        recommendations: [
          "Follow standard crop calendar for your region",
          "Monitor soil moisture regularly",
          "Apply fertilizers per recommended schedule",
          "Start ML service: cd ml-service && python app.py",
        ],
        metadata: { model: "fallback" },
      },
      confidence: 55,
    },
  ];
}

module.exports = { analyzeCrop, analyzeSingle };
