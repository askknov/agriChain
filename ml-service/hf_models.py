"""
HuggingFace Model Integration Module
Downloads and loads trained models from Jhumpa30/agriai-models on HuggingFace.
Models: TFLite image classifier, disease risk, yield prediction, market price.
"""

import os
import numpy as np
import requests
import joblib
import pandas as pd
from PIL import Image
import io

# ── HuggingFace model source ──────────────────────────────────
HF_BASE_URL = "https://huggingface.co/Jhumpa30/agriai-models/resolve/main/"
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# ── 31 Disease Classes ────────────────────────────────────────
CLASS_NAMES = [
    'Maize_Blight', 'Maize_CommonRust', 'Maize_GrayLeafSpot', 'Maize_Healthy',
    'Potato_EarlyBlight', 'Potato_Healthy', 'Potato_LateBlight',
    'Rice_BacterialLeafBlight', 'Rice_BrownSpot', 'Rice_Healthy', 'Rice_LeafBlast',
    'Rice_LeafScald', 'Rice_SheathBlight',
    'Tea_AlgalLeafSpot', 'Tea_Anthracnose', 'Tea_BirdEyeSpot', 'Tea_BrownBlight',
    'Tea_GrayBlight', 'Tea_Healthy', 'Tea_RedLeafSpot', 'Tea_WhiteSpot',
    'Tomato_BacterialSpot', 'Tomato_EarlyBlight', 'Tomato_Healthy',
    'Tomato_LateBlight', 'Tomato_LeafMold', 'Tomato_MosaicVirus',
    'Tomato_SeptoriaLeafSpot', 'Tomato_SpiderMites', 'Tomato_TargetSpot',
    'Tomato_YellowLeafCurlVirus'
]

HEALTHY_CLASSES = {
    "Maize_Healthy", "Rice_Healthy", "Tea_Healthy",
    "Potato_Healthy", "Tomato_Healthy"
}

CROP_MAP = {
    "Rice": "rice", "Maize": "maize", "Potato": "potato",
    "Tea": "tea", "Tomato": "tomato"
}

# ── Disease-specific recommendations ─────────────────────────
DISEASE_RECOMMENDATIONS = {
    "Rice_LeafBlast": [
        "Improve field drainage.",
        "Reduce excess nitrogen fertilizer.",
        "Apply recommended fungicide."
    ],
    "Rice_BacterialLeafBlight": [
        "Improve field sanitation.",
        "Avoid excess nitrogen fertilizer.",
        "Use resistant varieties where possible."
    ],
    "Rice_BrownSpot": [
        "Ensure balanced fertilization (potassium deficiency increases susceptibility).",
        "Improve water management.",
        "Apply foliar fungicide if severity increases."
    ],
    "Rice_LeafScald": [
        "Use disease-free seeds.",
        "Reduce plant density for better air circulation.",
        "Apply fungicide at early infection stage."
    ],
    "Rice_SheathBlight": [
        "Reduce plant density.",
        "Avoid excessive nitrogen fertilizer.",
        "Apply validated fungicide at boot stage."
    ],
    "Potato_LateBlight": [
        "Remove infected plants immediately.",
        "Avoid overhead irrigation.",
        "Apply preventive fungicide."
    ],
    "Potato_EarlyBlight": [
        "Practice crop rotation.",
        "Remove infected plant debris.",
        "Apply copper-based or chlorothalonil fungicide."
    ],
    "Tomato_YellowLeafCurlVirus": [
        "Control whitefly populations.",
        "Remove infected plants.",
        "Use resistant varieties."
    ],
    "Tomato_MosaicVirus": [
        "Remove infected plants.",
        "Disinfect tools regularly.",
        "Avoid handling wet plants."
    ],
    "Tomato_LateBlight": [
        "Remove and destroy infected foliage.",
        "Improve air circulation between plants.",
        "Apply copper-based fungicide preventively."
    ],
    "Tomato_EarlyBlight": [
        "Mulch around plant base to prevent soil splash.",
        "Practice crop rotation (3-year cycle).",
        "Apply chlorothalonil-based fungicide."
    ],
    "Tomato_BacterialSpot": [
        "Use pathogen-free seeds and transplants.",
        "Avoid overhead irrigation.",
        "Apply copper bactericides early."
    ],
    "Tomato_LeafMold": [
        "Improve greenhouse ventilation.",
        "Reduce humidity below 85%.",
        "Apply fungicide to undersides of leaves."
    ],
    "Tomato_SeptoriaLeafSpot": [
        "Remove lower infected leaves promptly.",
        "Avoid overhead watering.",
        "Apply chlorothalonil or mancozeb fungicide."
    ],
    "Tomato_SpiderMites": [
        "Spray plants with strong water jet to dislodge mites.",
        "Introduce predatory mites (Phytoseiulus persimilis).",
        "Apply neem oil or miticide if infestation is severe."
    ],
    "Tomato_TargetSpot": [
        "Remove infected plant debris.",
        "Improve air circulation.",
        "Apply broad-spectrum fungicide."
    ],
    "Maize_Blight": [
        "Use resistant hybrids.",
        "Ensure proper crop rotation.",
        "Apply fungicide at early tasseling stage."
    ],
    "Maize_CommonRust": [
        "Plant rust-resistant varieties.",
        "Apply foliar fungicide at first sign of pustules.",
        "Monitor fields regularly during humid conditions."
    ],
    "Maize_GrayLeafSpot": [
        "Practice conservation tillage to reduce inoculum.",
        "Use resistant hybrids.",
        "Apply strobilurin-based fungicide if warranted."
    ],
    "Tea_AlgalLeafSpot": [
        "Improve air circulation through pruning.",
        "Remove heavily infected leaves.",
        "Apply copper-based fungicide."
    ],
    "Tea_Anthracnose": [
        "Prune affected branches.",
        "Improve drainage around tea bushes.",
        "Apply carbendazim or mancozeb fungicide."
    ],
    "Tea_BirdEyeSpot": [
        "Maintain proper shade management.",
        "Avoid overhead irrigation.",
        "Apply zinc-based fungicide."
    ],
    "Tea_BrownBlight": [
        "Prune affected areas to improve ventilation.",
        "Ensure balanced fertilization.",
        "Apply copper oxychloride fungicide."
    ],
    "Tea_GrayBlight": [
        "Improve drainage and reduce shade excess.",
        "Remove dead and infected branches.",
        "Apply appropriate fungicide as recommended by tea board."
    ],
    "Tea_RedLeafSpot": [
        "Avoid over-pruning during rainy season.",
        "Maintain soil nutrition balance.",
        "Apply copper fungicide at first sign."
    ],
    "Tea_WhiteSpot": [
        "Improve air circulation through strategic pruning.",
        "Apply sulfur-based or copper fungicide.",
        "Reduce excessive nitrogen application."
    ],
}


def _download_file(filename):
    """Download a model file from HuggingFace if not already cached."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    path = os.path.join(MODELS_DIR, filename)

    if os.path.exists(path):
        return path

    url = HF_BASE_URL + filename
    print(f"  [HF] Downloading {filename} from HuggingFace...")
    r = requests.get(url, stream=True, timeout=120)
    r.raise_for_status()

    with open(path, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)

    print(f"  [HF] [OK] Downloaded {filename} ({os.path.getsize(path) / 1024 / 1024:.1f} MB)")
    return path


# ── Cached model instances ────────────────────────────────────
_tflite_interpreter = None
_risk_model = None
_risk_columns = None
_yield_model = None
_yield_columns = None
_price_model = None
_price_scaler = None
_price_columns = None


def _get_tflite_interpreter():
    """Load or return cached TFLite interpreter."""
    global _tflite_interpreter
    if _tflite_interpreter is None:
        from ai_edge_litert import interpreter as tfl
        path = _download_file("best_crop_model.tflite")
        _tflite_interpreter = tfl.Interpreter(model_path=path)
        _tflite_interpreter.allocate_tensors()
        print("  [HF] [OK] TFLite crop disease model loaded")
    return _tflite_interpreter


def _get_risk_model():
    """Load or return cached disease risk model."""
    global _risk_model, _risk_columns
    if _risk_model is None:
        _risk_model = joblib.load(_download_file("disease_risk_model.pkl"))
        _risk_columns = joblib.load(_download_file("disease_risk_columns.pkl"))
        print("  [HF] [OK] Disease risk model loaded")
    return _risk_model, _risk_columns


def _get_yield_model():
    """Load or return cached yield prediction model."""
    global _yield_model, _yield_columns
    if _yield_model is None:
        _yield_model = joblib.load(_download_file("yield_prediction_model.pkl"))
        _yield_columns = joblib.load(_download_file("yield_prediction_columns.pkl"))
        print("  [HF] [OK] Yield prediction model loaded")
    return _yield_model, _yield_columns


def _get_price_model():
    """Load or return cached market price model."""
    global _price_model, _price_scaler, _price_columns
    if _price_model is None:
        _price_model = joblib.load(_download_file("market_price_model_v2.pkl"))
        _price_scaler = joblib.load(_download_file("market_price_scaler.pkl"))
        _price_columns = joblib.load(_download_file("market_price_columns_v2.pkl"))
        print("  [HF] [OK] Market price model loaded")
    return _price_model, _price_scaler, _price_columns


# ═══════════════════════════════════════════════════════════════
#  PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def classify_leaf_image(image_bytes):
    """
    Classify a crop leaf image using the TFLite model.
    Returns disease name, confidence, crop type, health score, and recommendations.
    """
    interpreter = _get_tflite_interpreter()

    # Preprocess image: resize to 224x224, NO /255.0 normalization (per friend's code)
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224))
    img_array = np.array(img, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)

    # Run inference
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    interpreter.set_tensor(input_details[0]["index"], img_array)
    interpreter.invoke()

    prediction = interpreter.get_tensor(output_details[0]["index"])
    prediction = np.array(prediction).flatten()

    idx = int(np.argmax(prediction))
    confidence = float(prediction[idx])

    predicted_class = CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else "Unknown"
    crop_type = CROP_MAP.get(predicted_class.split("_")[0], "unknown")
    is_healthy = predicted_class in HEALTHY_CLASSES
    health_score = 100 if is_healthy else 50

    # Generate recommendations
    recommendations = _generate_recommendations(predicted_class, health_score, 0)

    return {
        "predicted_class": predicted_class,
        "disease_name": predicted_class.replace("_", " "),
        "confidence": round(confidence * 100, 2) if confidence <= 1 else round(confidence, 2),
        "crop_type": crop_type,
        "is_healthy": is_healthy,
        "health_score": health_score,
        "recommendations": recommendations,
        "all_probabilities": {
            CLASS_NAMES[i]: round(float(prediction[i]) * 100, 2)
            for i in np.argsort(prediction)[-5:][::-1]
            if i < len(CLASS_NAMES)
        },
        "model": "TFLite_CropDiseaseClassifier_v1",
        "source": "Jhumpa30/agriai-models (HuggingFace)",
    }


def predict_risk_hf(health_score, temperature, humidity, rainfall):
    """Predict disease risk using friend's trained model."""
    model, columns = _get_risk_model()

    risk_input = pd.DataFrame(
        [[health_score, temperature, humidity, rainfall]],
        columns=columns
    )
    disease_risk = model.predict(risk_input)[0]

    return {
        "risk_score": round(float(disease_risk), 1),
        "risk_label": "High Risk" if disease_risk >= 70 else "Moderate Risk" if disease_risk >= 40 else "Low Risk",
        "model": "DiseaseRiskModel_HF_v1",
    }


def predict_yield_hf(crop_type, crop_year=2025, area=1.0, annual_rainfall=1000.0,
                     fertilizer=50.0, pesticide=5.0, avg_temp=28.0,
                     max_temp=35.0, min_temp=20.0):
    """Predict yield using friend's trained model."""
    model, columns = _get_yield_model()

    row = {c: 0 for c in columns}

    base = {
        "Crop_Year": crop_year,
        "Area": area,
        "Annual_Rainfall": annual_rainfall,
        "Fertilizer": fertilizer,
        "Pesticide": pesticide,
        "Avg_Temperature": avg_temp,
        "Max_Temperature": max_temp,
        "Min_Temperature": min_temp,
    }

    for k, v in base.items():
        if k in row:
            row[k] = v

    crop_col = f"Crop_{crop_type.capitalize()}"
    if crop_col in row:
        row[crop_col] = 1

    X = pd.DataFrame([row])[columns]
    predicted_yield = model.predict(X)[0]

    return {
        "predicted_yield": round(float(predicted_yield), 2),
        "unit": "tonnes/hectare",
        "model": "YieldPredictionModel_HF_v1",
    }


def predict_price_hf(demand=1.0, supply=1.0, inflation=5.0,
                     transport_cost=10.0, predicted_yield=None):
    """Predict market price using friend's trained model."""
    model, scaler, columns = _get_price_model()

    if predicted_yield is None:
        predicted_yield = 25.0  # default

    price_input = pd.DataFrame([{
        "Demand_Index": demand,
        "Supply_Index": supply,
        "Inflation_Rate": inflation,
        "Transport_Cost": transport_cost,
        "predicted_yield": predicted_yield,
    }])

    price_input = price_input.reindex(columns=columns, fill_value=0)
    price_input = scaler.transform(price_input)

    price = model.predict(price_input)[0]

    return {
        "predicted_price": round(float(price), 2),
        "currency": "INR",
        "unit": "per quintal",
        "model": "MarketPriceModel_HF_v2",
    }


def _generate_recommendations(disease, health_score, disease_risk):
    """Generate farming recommendations based on disease detection."""
    recommendations = []

    # Health score advice
    if health_score >= 90:
        recommendations.append("Crop health is excellent.")
    elif health_score >= 70:
        recommendations.append("Crop health is good. Continue regular monitoring.")
    elif health_score >= 50:
        recommendations.append("Crop health is declining. Preventive action is recommended.")
    else:
        recommendations.append("Crop health is poor. Immediate intervention is required.")

    # Risk advice
    try:
        risk = float(disease_risk)
    except (ValueError, TypeError):
        risk = 0

    if risk >= 70:
        recommendations.append("High disease risk detected.")
    elif risk >= 40:
        recommendations.append("Moderate disease risk detected.")
    else:
        recommendations.append("Disease risk is low.")

    # Disease-specific advice
    if disease in HEALTHY_CLASSES:
        recommendations.append("No disease detected.")
        recommendations.append("Maintain current crop management practices.")
    elif disease in DISEASE_RECOMMENDATIONS:
        recommendations.extend(DISEASE_RECOMMENDATIONS[disease])
    else:
        recommendations.append("Monitor disease progression carefully.")
        recommendations.append("Follow recommended crop protection practices.")
        recommendations.append("Consult local agricultural experts if symptoms worsen.")

    return recommendations
