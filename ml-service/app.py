"""
AgriChain ML Service — Flask API Server
Exposes ML prediction endpoints for the Node.js backend to call.

Start: python app.py
Runs on: http://localhost:8000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import traceback

# Import ML modules
from crop_health import analyze_image_health, get_health_label
from disease_detection import predict_disease_risk
from yield_prediction import predict_yield
from price_prediction import predict_market_price
from recommendations import generate_recommendations

# Import HuggingFace models (friend's trained models)
try:
    from hf_models import classify_leaf_image, predict_risk_hf, predict_yield_hf, predict_price_hf
    HF_MODELS_AVAILABLE = True
    print("  [HF] HuggingFace model integration available")
except ImportError as e:
    HF_MODELS_AVAILABLE = False
    print(f"  [HF] HuggingFace models not available: {e}")

app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "service": "AgriChain ML Service",
        "version": "1.0.0",
        "models_loaded": True,
        "timestamp": datetime.now().isoformat(),
    })


@app.route("/api/predict", methods=["POST"])
def predict_all():
    """
    Run all 5 ML predictions for a crop.

    Expected JSON body:
    {
        "cropType": "Wheat",
        "location": "Pune, Maharashtra",
        "soilType": "Black",
        "irrigationType": "Drip",
        "cropAgeDays": 60,
        "temperature": 28,
        "humidity": 65,
        "rainfall": 100,
        "soilPh": 6.5,
        "soilMoisture": 45
    }

    Optional: multipart form with 'image' file field for image-based analysis.
    """
    try:
        # Parse input — support both JSON and form data
        if request.content_type and "multipart" in request.content_type:
            data = request.form.to_dict()
            image_file = request.files.get("image")
            image_bytes = image_file.read() if image_file else None
        else:
            data = request.get_json() or {}
            image_bytes = None

        # Extract parameters with defaults
        crop_type = data.get("cropType", "Wheat")
        temperature = float(data.get("temperature", 28))
        humidity = float(data.get("humidity", 65))
        rainfall = float(data.get("rainfall", 100))
        soil_ph = float(data.get("soilPh", 6.5))
        soil_moisture = float(data.get("soilMoisture", 45))
        crop_age_days = int(data.get("cropAgeDays", 60))
        irrigation_type = data.get("irrigationType", "Drip")
        fertilizer_kg = float(data.get("fertilizerKg", 50))

        # ── 1. Crop Health Assessment ──
        health_result = analyze_image_health(image_bytes)
        health_score = health_result["health_score"]
        health_label = get_health_label(health_score)

        # ── 2. Disease Risk Prediction ──
        disease_result = predict_disease_risk(
            crop_type=crop_type,
            temperature=temperature,
            humidity=humidity,
            rainfall=rainfall,
            crop_age_days=crop_age_days,
            soil_moisture=soil_moisture,
            soil_ph=soil_ph,
            health_score=health_score,
        )

        # ── 3. Yield Prediction ──
        yield_result = predict_yield(
            crop_type=crop_type,
            temperature=temperature,
            rainfall=rainfall,
            humidity=humidity,
            soil_ph=soil_ph,
            soil_moisture=soil_moisture,
            fertilizer_kg=fertilizer_kg,
            irrigation_quality=0.8 if irrigation_type == "Drip" else 0.6,
            crop_age_days=crop_age_days,
            health_score=health_score,
        )

        # ── 4. Market Price Prediction ──
        price_result = predict_market_price(crop_type=crop_type)

        # ── 5. Farming Recommendations ──
        rec_result = generate_recommendations(
            crop_type=crop_type,
            temperature=temperature,
            humidity=humidity,
            soil_ph=soil_ph,
            soil_moisture=soil_moisture,
            crop_age_days=crop_age_days,
            health_score=health_score,
            disease_risk_score=disease_result["risk_score"],
            irrigation_type=irrigation_type,
        )

        # ── Package results ──
        predictions = [
            {
                "predictionType": "CropHealth",
                "result": {
                    "score": health_score,
                    "label": health_label,
                    "details": f"Crop health analysis for {crop_type}: {health_label} ({health_score}/100). "
                               f"Analysis based on {'uploaded image color analysis' if image_bytes else 'multispectral sensor simulation'}. "
                               f"Green vegetation index indicates {'strong' if health_score > 70 else 'moderate' if health_score > 50 else 'weak'} "
                               f"photosynthetic activity.",
                    "recommendations": [
                        "Continue current practices" if health_score > 70
                        else "Investigate nutrient deficiency" if health_score > 50
                        else "Urgent: check for disease or water stress",
                        "Schedule next assessment in 7 days",
                        "Consider foliar nutrient spray if health declines",
                    ],
                    "metadata": health_result,
                },
                "confidence": min(95, int(health_score * 0.85 + 20)),
            },
            {
                "predictionType": "DiseaseRisk",
                "result": {
                    "score": round(disease_result["risk_score"]),
                    "label": disease_result["risk_label"],
                    "details": f"Disease risk assessment for {crop_type}: {disease_result['risk_label']} "
                               f"(risk score: {disease_result['risk_score']}/100). "
                               f"Primary risk: {disease_result['primary_risk']}. "
                               f"Analysis based on RandomForest classifier with environmental features "
                               f"(temp: {temperature}°C, humidity: {humidity}%, soil pH: {soil_ph}).",
                    "recommendations": [
                        f"Monitor for {disease_result['primary_risk']}" if disease_result["risk_score"] < 50
                        else f"Apply preventive treatment for {disease_result['primary_risk']}",
                        "Ensure proper drainage to prevent waterlogging",
                        "Inspect crop edges for early infection signs",
                    ],
                    "metadata": disease_result,
                },
                "confidence": int(max(disease_result["risk_class_probabilities"].values())),
            },
            {
                "predictionType": "YieldPrediction",
                "result": {
                    "score": min(100, int(yield_result["predicted_yield"] / yield_result["regional_average"] * 75)),
                    "label": f"{yield_result['predicted_yield']} {yield_result['unit']}",
                    "details": f"Predicted yield for {crop_type}: {yield_result['predicted_yield']} {yield_result['unit']}. "
                               f"This is {yield_result['vs_average_percent']:+.1f}% compared to the regional average of "
                               f"{yield_result['regional_average']} {yield_result['unit']}. "
                               f"Prediction based on Ridge Regression model with polynomial features.",
                    "recommendations": [
                        "Maintain current farming practices for optimal yield",
                        f"Expected yield range: {yield_result['yield_range']['pessimistic']}-{yield_result['yield_range']['optimistic']} {yield_result['unit']}",
                        "Prepare storage facilities for expected harvest volume",
                    ],
                    "metadata": yield_result,
                },
                "confidence": 80,
            },
            {
                "predictionType": "MarketPrice",
                "result": {
                    "score": min(100, max(10, 50 + int(price_result["price_change_percent"] * 3))),
                    "label": f"₹{price_result['predicted_price_30d']} {price_result['unit']} ({price_result['trend']})",
                    "details": f"Current market price: ₹{price_result['current_price']} {price_result['unit']}. "
                               f"Predicted price in 30 days: ₹{price_result['predicted_price_30d']} "
                               f"({price_result['price_change_percent']:+.1f}% change, {price_result['trend']} trend). "
                               f"Best selling window: {price_result['best_selling_window']['date']} "
                               f"at ₹{price_result['best_selling_window']['expected_price']}.",
                    "recommendations": [
                        f"{'Hold stock for better prices' if price_result['trend'] == 'upward' else 'Consider selling soon'} — "
                        f"market trend is {price_result['trend']}",
                        f"Best selling date: {price_result['best_selling_window']['date']}",
                        "Check nearby APMC mandis for best rates",
                    ],
                    "metadata": price_result,
                },
                "confidence": 72,
            },
            {
                "predictionType": "Recommendation",
                "result": {
                    "score": rec_result["total_recommendations"] * 12,
                    "label": f"{len(rec_result['priority_actions'])} Priority Actions",
                    "details": f"Generated {rec_result['total_recommendations']} recommendations for {crop_type} "
                               f"at {rec_result['crop_info']['growth_stage']} growth stage "
                               f"({crop_age_days} days old, ~{rec_result['crop_info']['days_to_harvest']} days to harvest).",
                    "recommendations": [r["action"] for r in rec_result["recommendations"][:5]],
                    "metadata": rec_result,
                },
                "confidence": 88,
            },
        ]

        return jsonify({
            "success": True,
            "cropType": crop_type,
            "predictions": predictions,
            "analyzedAt": datetime.now().isoformat(),
            "imageAnalyzed": image_bytes is not None,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
        }), 500


@app.route("/api/predict/health", methods=["POST"])
def predict_health_only():
    """Single prediction: Crop Health (supports image upload)."""
    try:
        image_bytes = None
        if request.files.get("image"):
            image_bytes = request.files["image"].read()

        result = analyze_image_health(image_bytes)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/predict/disease", methods=["POST"])
def predict_disease_only():
    """Single prediction: Disease Risk."""
    try:
        data = request.get_json()
        result = predict_disease_risk(**{k: v for k, v in data.items() if k != "cropType"},
                                      crop_type=data.get("cropType", "Wheat"))
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/predict/yield", methods=["POST"])
def predict_yield_only():
    """Single prediction: Yield."""
    try:
        data = request.get_json()
        result = predict_yield(**{k: v for k, v in data.items() if k != "cropType"},
                               crop_type=data.get("cropType", "Wheat"))
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/predict/price", methods=["POST"])
def predict_price_only():
    """Single prediction: Market Price."""
    try:
        data = request.get_json()
        result = predict_market_price(crop_type=data.get("cropType", "Wheat"))
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/predict/image", methods=["POST"])
def predict_from_image():
    """
    Scan a crop leaf image for disease using the TFLite model from HuggingFace.
    Accepts: multipart form with 'image' file field (JPG/PNG).
    Returns: disease name, confidence, health score, recommendations.
    """
    try:
        if not HF_MODELS_AVAILABLE:
            return jsonify({
                "success": False,
                "error": "HuggingFace models not available. Install tensorflow-cpu."
            }), 503

        image_file = request.files.get("image")
        if not image_file:
            return jsonify({"success": False, "error": "No image file provided"}), 400

        image_bytes = image_file.read()
        if len(image_bytes) == 0:
            return jsonify({"success": False, "error": "Empty image file"}), 400

        # Run TFLite classification
        result = classify_leaf_image(image_bytes)

        # Also run disease risk model using detected health score
        temperature = float(request.form.get("temperature", 28))
        humidity = float(request.form.get("humidity", 70))
        rainfall = float(request.form.get("rainfall", 100))

        risk_result = predict_risk_hf(
            health_score=result["health_score"],
            temperature=temperature,
            humidity=humidity,
            rainfall=rainfall,
        )

        result["disease_risk"] = risk_result

        return jsonify({
            "success": True,
            "data": result,
            "analyzedAt": datetime.now().isoformat(),
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    print("=" * 55)
    print("  [ML] AgriChain ML Service")
    print("  [>>] Running on http://localhost:8000")
    print("  [OK] Health: http://localhost:8000/api/health")
    print("  [AI] Models: RandomForest, RidgeRegression, TimeSeries")
    print("=" * 55)
    app.run(host="0.0.0.0", port=8000, debug=True)
