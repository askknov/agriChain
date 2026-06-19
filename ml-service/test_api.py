"""Test the Flask API endpoint directly."""
import requests
import json

# Test /api/predict
response = requests.post("http://localhost:8000/api/predict", json={
    "cropType": "Wheat",
    "temperature": 30,
    "humidity": 75,
    "rainfall": 120,
    "soilPh": 6.5,
    "soilMoisture": 50,
    "cropAgeDays": 60,
})

data = response.json()
print(f"Success: {data['success']}")
print(f"Crop: {data['cropType']}")
print(f"Image analyzed: {data['imageAnalyzed']}")
print()

for p in data["predictions"]:
    print(f"  {p['predictionType']}:")
    print(f"    Label: {p['result']['label']}")
    print(f"    Score: {p['result']['score']}")
    print(f"    Confidence: {p['confidence']}%")
    print(f"    Details: {p['result']['details'][:100]}...")
    print()

print("API TEST PASSED!")
