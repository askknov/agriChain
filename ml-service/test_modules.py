"""Quick test to verify all ML modules load and produce results."""
from crop_health import analyze_image_health, get_health_label
from disease_detection import predict_disease_risk
from yield_prediction import predict_yield
from price_prediction import predict_market_price
from recommendations import generate_recommendations

print("=" * 50)
print("  ML Module Test")
print("=" * 50)

# 1. Crop Health
h = analyze_image_health()
print(f"\n1. Crop Health: {h['health_score']}% ({get_health_label(h['health_score'])})")
print(f"   Method: {h['analysis_method']}")

# 2. Disease Risk
d = predict_disease_risk("Wheat", temperature=30, humidity=75)
print(f"\n2. Disease Risk: {d['risk_label']} (score: {d['risk_score']})")
print(f"   Primary: {d['primary_risk']}")
print(f"   Model: {d['model']}")

# 3. Yield Prediction
y = predict_yield("Wheat")
print(f"\n3. Yield: {y['predicted_yield']} {y['unit']}")
print(f"   vs Avg: {y['vs_average_percent']:+.1f}%")
print(f"   Model: {y['model']}")

# 4. Market Price
p = predict_market_price("Tomato")
print(f"\n4. Price: Rs.{p['current_price']} -> Rs.{p['predicted_price_30d']} ({p['trend']})")
print(f"   Model: {p['model']}")

# 5. Recommendations
r = generate_recommendations("Rice", health_score=60, disease_risk_score=45)
print(f"\n5. Recommendations: {r['total_recommendations']} generated")
print(f"   Priority actions: {len(r['priority_actions'])}")
for action in r['priority_actions']:
    print(f"   - {action}")

print("\n" + "=" * 50)
print("  ALL TESTS PASSED ✅")
print("=" * 50)
