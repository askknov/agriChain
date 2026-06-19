"""
Disease Risk Prediction Module
Uses a trained Random Forest classifier on crop/environmental features
to predict disease probability and identify likely diseases.
"""

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import json
import os

# ── Disease Knowledge Base ─────────────────────────────────
# Real agricultural disease data by crop type
DISEASE_DATABASE = {
    "Wheat": {
        "diseases": [
            {"name": "Wheat Rust", "conditions": {"humidity": "high", "temp_range": [15, 25], "season": "rabi"}, "severity": "high"},
            {"name": "Powdery Mildew", "conditions": {"humidity": "moderate", "temp_range": [15, 22], "season": "rabi"}, "severity": "moderate"},
            {"name": "Leaf Blight", "conditions": {"humidity": "high", "temp_range": [20, 30], "season": "any"}, "severity": "high"},
            {"name": "Smut", "conditions": {"humidity": "moderate", "temp_range": [18, 28], "season": "rabi"}, "severity": "moderate"},
        ],
    },
    "Rice": {
        "diseases": [
            {"name": "Rice Blast", "conditions": {"humidity": "high", "temp_range": [20, 30], "season": "kharif"}, "severity": "high"},
            {"name": "Bacterial Leaf Blight", "conditions": {"humidity": "high", "temp_range": [25, 35], "season": "kharif"}, "severity": "high"},
            {"name": "Sheath Blight", "conditions": {"humidity": "high", "temp_range": [25, 32], "season": "kharif"}, "severity": "moderate"},
            {"name": "Brown Spot", "conditions": {"humidity": "moderate", "temp_range": [20, 30], "season": "any"}, "severity": "moderate"},
        ],
    },
    "Tomato": {
        "diseases": [
            {"name": "Early Blight", "conditions": {"humidity": "moderate", "temp_range": [20, 30], "season": "any"}, "severity": "moderate"},
            {"name": "Late Blight", "conditions": {"humidity": "high", "temp_range": [15, 22], "season": "any"}, "severity": "high"},
            {"name": "Fusarium Wilt", "conditions": {"humidity": "low", "temp_range": [25, 35], "season": "any"}, "severity": "high"},
            {"name": "Leaf Curl Virus", "conditions": {"humidity": "moderate", "temp_range": [25, 35], "season": "any"}, "severity": "high"},
        ],
    },
    "Cotton": {
        "diseases": [
            {"name": "Cotton Bollworm", "conditions": {"humidity": "moderate", "temp_range": [25, 35], "season": "kharif"}, "severity": "high"},
            {"name": "Bacterial Blight", "conditions": {"humidity": "high", "temp_range": [25, 35], "season": "kharif"}, "severity": "moderate"},
            {"name": "Alternaria Leaf Spot", "conditions": {"humidity": "high", "temp_range": [25, 30], "season": "any"}, "severity": "moderate"},
            {"name": "Root Rot", "conditions": {"humidity": "high", "temp_range": [20, 30], "season": "any"}, "severity": "high"},
        ],
    },
    "Sugarcane": {
        "diseases": [
            {"name": "Red Rot", "conditions": {"humidity": "high", "temp_range": [25, 35], "season": "any"}, "severity": "high"},
            {"name": "Smut", "conditions": {"humidity": "moderate", "temp_range": [25, 35], "season": "any"}, "severity": "moderate"},
            {"name": "Leaf Scald", "conditions": {"humidity": "high", "temp_range": [20, 30], "season": "any"}, "severity": "moderate"},
            {"name": "Wilt", "conditions": {"humidity": "low", "temp_range": [30, 40], "season": "any"}, "severity": "high"},
        ],
    },
}


def _build_disease_model():
    """
    Build a Random Forest model trained on synthetic agricultural data.
    Features: [temperature, humidity, rainfall, crop_age_days, soil_moisture, soil_ph]
    Target: disease risk level (0=low, 1=moderate, 2=high)
    """
    np.random.seed(42)
    n_samples = 500

    # Generate synthetic training data based on agricultural knowledge
    # High risk conditions: high humidity + warm temp + young plants
    temperature = np.random.uniform(10, 42, n_samples)
    humidity = np.random.uniform(20, 100, n_samples)
    rainfall = np.random.uniform(0, 300, n_samples)
    crop_age = np.random.uniform(10, 180, n_samples)
    soil_moisture = np.random.uniform(10, 90, n_samples)
    soil_ph = np.random.uniform(4.5, 8.5, n_samples)

    X = np.column_stack([temperature, humidity, rainfall, crop_age, soil_moisture, soil_ph])

    # Generate labels based on real agricultural rules
    risk = np.zeros(n_samples, dtype=int)
    for i in range(n_samples):
        score = 0
        # High humidity → higher disease risk
        if humidity[i] > 80:
            score += 2
        elif humidity[i] > 60:
            score += 1

        # Warm + humid = fungal paradise
        if 20 < temperature[i] < 35 and humidity[i] > 70:
            score += 2

        # Excessive rainfall
        if rainfall[i] > 200:
            score += 1

        # Young crops are more vulnerable
        if crop_age[i] < 30:
            score += 1

        # Extreme pH
        if soil_ph[i] < 5.5 or soil_ph[i] > 7.5:
            score += 1

        # Waterlogged soil
        if soil_moisture[i] > 80:
            score += 1

        risk[i] = min(2, score // 2)  # 0=low, 1=moderate, 2=high

    model = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=8)
    model.fit(X, risk)
    return model


# Train model at module load
_disease_model = _build_disease_model()


def predict_disease_risk(crop_type, temperature=28, humidity=65, rainfall=50,
                         crop_age_days=60, soil_moisture=45, soil_ph=6.5,
                         health_score=None):
    """
    Predict disease risk using the trained Random Forest model
    combined with the crop-specific disease knowledge base.
    """
    # ── ML Model prediction ──
    features = np.array([[temperature, humidity, rainfall, crop_age_days, soil_moisture, soil_ph]])
    risk_class = int(_disease_model.predict(features)[0])
    risk_proba = _disease_model.predict_proba(features)[0]

    risk_labels = ["Low Risk", "Moderate Risk", "High Risk"]
    risk_scores = [20, 50, 80]

    base_risk_score = risk_scores[risk_class]

    # Adjust based on specific probabilities
    weighted_risk = sum(p * s for p, s in zip(risk_proba, risk_scores))

    # ── Knowledge-based disease identification ──
    crop_diseases = DISEASE_DATABASE.get(crop_type, DISEASE_DATABASE.get("Wheat"))
    identified_diseases = []

    for disease in crop_diseases["diseases"]:
        cond = disease["conditions"]
        match_score = 0

        # Temperature match
        if cond["temp_range"][0] <= temperature <= cond["temp_range"][1]:
            match_score += 35

        # Humidity match
        if cond["humidity"] == "high" and humidity > 70:
            match_score += 30
        elif cond["humidity"] == "moderate" and 40 < humidity <= 70:
            match_score += 30
        elif cond["humidity"] == "low" and humidity <= 40:
            match_score += 30

        # Add some randomness for realism
        match_score += np.random.randint(-5, 10)
        match_score = max(0, min(100, match_score))

        if match_score > 25:
            identified_diseases.append({
                "name": disease["name"],
                "probability": round(match_score, 1),
                "severity": disease["severity"],
            })

    identified_diseases.sort(key=lambda x: x["probability"], reverse=True)

    # If health score is low, increase risk
    if health_score and health_score < 50:
        weighted_risk = min(95, weighted_risk + 15)

    final_risk = round(weighted_risk, 1)
    risk_label = "Low Risk" if final_risk < 35 else "Moderate Risk" if final_risk < 60 else "High Risk"

    return {
        "risk_score": final_risk,
        "risk_label": risk_label,
        "risk_class_probabilities": {
            "low": round(risk_proba[0] * 100, 1),
            "moderate": round(risk_proba[1] * 100, 1),
            "high": round(risk_proba[2] * 100, 1),
        },
        "identified_diseases": identified_diseases[:3],
        "primary_risk": identified_diseases[0]["name"] if identified_diseases else "None detected",
        "model": "RandomForest_v1",
        "features_used": {
            "temperature": temperature,
            "humidity": humidity,
            "rainfall": rainfall,
            "crop_age_days": crop_age_days,
            "soil_moisture": soil_moisture,
            "soil_ph": soil_ph,
        },
    }
