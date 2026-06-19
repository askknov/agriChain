"""
Farming Recommendations Engine
Rule-based expert system enhanced with ML-derived insights
to generate actionable farming recommendations.
"""

import numpy as np
from datetime import datetime


# ── Crop Knowledge Base ────────────────────────────────────
CROP_REQUIREMENTS = {
    "Wheat": {
        "optimal_temp": (15, 25),
        "water_mm_per_week": 30,
        "optimal_ph": (6.0, 7.5),
        "fertilizers": {"N": 120, "P": 60, "K": 40},  # kg/hectare
        "growth_days": 120,
        "season": "Rabi (October-March)",
    },
    "Rice": {
        "optimal_temp": (20, 35),
        "water_mm_per_week": 50,
        "optimal_ph": (5.5, 6.5),
        "fertilizers": {"N": 100, "P": 50, "K": 50},
        "growth_days": 130,
        "season": "Kharif (June-October)",
    },
    "Tomato": {
        "optimal_temp": (20, 30),
        "water_mm_per_week": 25,
        "optimal_ph": (6.0, 7.0),
        "fertilizers": {"N": 150, "P": 75, "K": 75},
        "growth_days": 90,
        "season": "Year-round",
    },
    "Cotton": {
        "optimal_temp": (25, 35),
        "water_mm_per_week": 35,
        "optimal_ph": (6.0, 8.0),
        "fertilizers": {"N": 80, "P": 40, "K": 40},
        "growth_days": 180,
        "season": "Kharif (April-October)",
    },
    "Sugarcane": {
        "optimal_temp": (25, 38),
        "water_mm_per_week": 40,
        "optimal_ph": (6.0, 7.5),
        "fertilizers": {"N": 250, "P": 80, "K": 80},
        "growth_days": 365,
        "season": "Year-round (plant: Feb-Mar)",
    },
    "Maize": {
        "optimal_temp": (20, 30),
        "water_mm_per_week": 30,
        "optimal_ph": (5.5, 7.0),
        "fertilizers": {"N": 120, "P": 60, "K": 40},
        "growth_days": 100,
        "season": "Kharif/Rabi",
    },
    "Soybean": {
        "optimal_temp": (20, 30),
        "water_mm_per_week": 25,
        "optimal_ph": (6.0, 7.0),
        "fertilizers": {"N": 20, "P": 60, "K": 40},
        "growth_days": 100,
        "season": "Kharif (June-October)",
    },
}


def generate_recommendations(crop_type, temperature=28, humidity=60,
                              soil_ph=6.5, soil_moisture=45,
                              crop_age_days=60, health_score=75,
                              disease_risk_score=30, irrigation_type="Drip"):
    """
    Generate comprehensive farming recommendations based on
    current conditions and ML analysis results.
    """
    crop = CROP_REQUIREMENTS.get(crop_type, CROP_REQUIREMENTS["Wheat"])
    recommendations = []
    priority_actions = []

    # ── Temperature Analysis ──
    opt_min, opt_max = crop["optimal_temp"]
    if temperature < opt_min:
        recommendations.append({
            "category": "Temperature",
            "action": f"Temperature ({temperature}°C) is below optimal ({opt_min}-{opt_max}°C). Consider mulching to retain soil warmth.",
            "priority": "high" if temperature < opt_min - 5 else "medium",
            "icon": "🌡️",
        })
    elif temperature > opt_max:
        recommendations.append({
            "category": "Temperature",
            "action": f"Temperature ({temperature}°C) exceeds optimal range. Increase irrigation frequency and consider shade nets.",
            "priority": "high" if temperature > opt_max + 5 else "medium",
            "icon": "🌡️",
        })
    else:
        recommendations.append({
            "category": "Temperature",
            "action": f"Temperature ({temperature}°C) is within optimal range ({opt_min}-{opt_max}°C). Conditions are favorable.",
            "priority": "info",
            "icon": "✅",
        })

    # ── Soil pH Analysis ──
    ph_min, ph_max = crop["optimal_ph"]
    if soil_ph < ph_min:
        lime_needed = round((ph_min - soil_ph) * 2, 1)  # quintals/hectare
        recommendations.append({
            "category": "Soil pH",
            "action": f"Soil pH ({soil_ph}) is acidic. Apply lime at {lime_needed} quintals/hectare to raise pH to optimal range ({ph_min}-{ph_max}).",
            "priority": "high",
            "icon": "🧪",
        })
        priority_actions.append(f"Apply lime: {lime_needed} quintals/hectare")
    elif soil_ph > ph_max:
        recommendations.append({
            "category": "Soil pH",
            "action": f"Soil pH ({soil_ph}) is alkaline. Apply gypsum or sulfur to lower pH. Target range: {ph_min}-{ph_max}.",
            "priority": "high",
            "icon": "🧪",
        })
        priority_actions.append("Apply gypsum to reduce soil alkalinity")

    # ── Irrigation Recommendations ──
    weekly_water = crop["water_mm_per_week"]
    if soil_moisture < 30:
        recommendations.append({
            "category": "Irrigation",
            "action": f"Soil moisture ({soil_moisture}%) is critically low. Immediate irrigation needed — apply {weekly_water}mm water.",
            "priority": "high",
            "icon": "💧",
        })
        priority_actions.append(f"Urgent: irrigate with {weekly_water}mm water")
    elif soil_moisture < 50:
        recommendations.append({
            "category": "Irrigation",
            "action": f"Soil moisture ({soil_moisture}%) is adequate. Schedule next irrigation in 2-3 days with {round(weekly_water * 0.7)}mm water.",
            "priority": "medium",
            "icon": "💧",
        })
    else:
        if soil_moisture > 80:
            recommendations.append({
                "category": "Irrigation",
                "action": f"Soil moisture ({soil_moisture}%) is high. Hold irrigation and ensure proper drainage to prevent root rot.",
                "priority": "medium",
                "icon": "⚠️",
            })
        else:
            recommendations.append({
                "category": "Irrigation",
                "action": f"Soil moisture ({soil_moisture}%) is optimal. Continue current {irrigation_type} irrigation schedule.",
                "priority": "info",
                "icon": "✅",
            })

    # ── Fertilizer Schedule ──
    fert = crop["fertilizers"]
    growth_stage = "early" if crop_age_days < 30 else "mid" if crop_age_days < 90 else "late"

    if growth_stage == "early":
        recommendations.append({
            "category": "Fertilizer",
            "action": f"Early growth stage ({crop_age_days} days). Apply basal dose: N={fert['N']//3}kg, P={fert['P']}kg, K={fert['K']//2}kg per hectare.",
            "priority": "medium",
            "icon": "🌱",
        })
    elif growth_stage == "mid":
        recommendations.append({
            "category": "Fertilizer",
            "action": f"Active growth stage ({crop_age_days} days). Apply top dressing: N={fert['N']//3}kg per hectare. Foliar spray of micronutrients recommended.",
            "priority": "medium",
            "icon": "🌿",
        })
    else:
        recommendations.append({
            "category": "Fertilizer",
            "action": f"Maturation stage ({crop_age_days} days). Reduce nitrogen. Apply K={fert['K']//2}kg per hectare for grain/fruit development.",
            "priority": "low",
            "icon": "🌾",
        })

    # ── Disease Management ──
    if disease_risk_score > 60:
        recommendations.append({
            "category": "Disease Management",
            "action": "High disease risk detected. Apply preventive fungicide spray immediately. Inspect crops daily for symptoms.",
            "priority": "high",
            "icon": "🦠",
        })
        priority_actions.append("Apply preventive fungicide spray")
    elif disease_risk_score > 35:
        recommendations.append({
            "category": "Disease Management",
            "action": "Moderate disease risk. Monitor closely for early symptoms. Ensure proper spacing for air circulation.",
            "priority": "medium",
            "icon": "👁️",
        })

    # ── Health-Based Recommendations ──
    if health_score and health_score < 50:
        recommendations.append({
            "category": "Crop Health",
            "action": "Crop health is below average. Check for nutrient deficiency (yellowing = N deficit, purple = P deficit). Consider soil testing.",
            "priority": "high",
            "icon": "📉",
        })
        priority_actions.append("Conduct soil nutrient test")
    elif health_score and health_score > 80:
        recommendations.append({
            "category": "Crop Health",
            "action": "Crop health is excellent. Maintain current practices. Consider organic mulching to sustain soil health.",
            "priority": "info",
            "icon": "🌟",
        })

    # ── Harvest Planning ──
    days_to_harvest = max(0, crop["growth_days"] - crop_age_days)
    if days_to_harvest <= 14:
        recommendations.append({
            "category": "Harvest",
            "action": f"Harvest window approaching in ~{days_to_harvest} days. Prepare storage facilities and arrange labor/machinery.",
            "priority": "high",
            "icon": "🏆",
        })
        priority_actions.append(f"Prepare for harvest in {days_to_harvest} days")
    elif days_to_harvest <= 30:
        recommendations.append({
            "category": "Harvest",
            "action": f"Approximately {days_to_harvest} days until harvest. Reduce irrigation and stop fertilizer application.",
            "priority": "medium",
            "icon": "📅",
        })

    return {
        "total_recommendations": len(recommendations),
        "priority_actions": priority_actions,
        "recommendations": recommendations,
        "crop_info": {
            "crop_type": crop_type,
            "growth_stage": growth_stage,
            "crop_age_days": crop_age_days,
            "days_to_harvest": days_to_harvest,
            "season": crop["season"],
        },
        "generated_at": datetime.now().isoformat(),
    }
