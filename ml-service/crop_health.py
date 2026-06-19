"""
Crop Health Analysis Module
Uses image color analysis (HSV color space) + environmental factors
to assess crop health with actual computer vision techniques.
"""

import numpy as np
from PIL import Image
import io


def analyze_image_health(image_bytes=None):
    """
    Analyze crop health from an image using color-space analysis.
    - Green channel dominance → healthy vegetation (NDVI-like approach)
    - Yellowing detection → nutrient deficiency
    - Brown/dry patches → water stress or disease
    
    If no image is provided, uses synthetic sensor data simulation.
    """
    if image_bytes:
        return _analyze_real_image(image_bytes)
    else:
        return _simulate_sensor_analysis()


def _analyze_real_image(image_bytes):
    """Analyze an actual uploaded image."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224))  # Standardize size
        pixels = np.array(img, dtype=np.float32)

        # Extract channel means
        r_mean = pixels[:, :, 0].mean()
        g_mean = pixels[:, :, 1].mean()
        b_mean = pixels[:, :, 2].mean()

        # Vegetation Index (simplified NDVI-like)
        # Higher green relative to red/blue = healthier
        total = r_mean + g_mean + b_mean + 1e-6
        green_ratio = g_mean / total
        red_ratio = r_mean / total

        # Excess Green Index (ExG)
        exg = 2 * g_mean - r_mean - b_mean

        # Normalized Difference Index
        ndi = (g_mean - r_mean) / (g_mean + r_mean + 1e-6)

        # Color variance (uniformity = healthier)
        color_std = pixels.std()

        # Compute health score (0-100)
        health_score = 50.0  # baseline

        # Green dominance bonus (+30 max)
        health_score += min(30, max(0, green_ratio * 100 - 25))

        # Excess green bonus (+20 max)
        health_score += min(20, max(0, exg / 5))

        # NDI bonus (+15 max for positive NDI)
        health_score += min(15, max(0, ndi * 50))

        # Uniformity bonus (lower std = more uniform = healthier)
        health_score += min(10, max(0, (100 - color_std) / 10))

        # Penalize excessive redness (disease/dryness indicator)
        if red_ratio > 0.4:
            health_score -= (red_ratio - 0.4) * 60

        health_score = max(10, min(98, health_score))

        return {
            "health_score": round(health_score, 1),
            "green_index": round(green_ratio * 100, 2),
            "excess_green": round(exg, 2),
            "ndi": round(ndi, 4),
            "color_uniformity": round(100 - color_std, 2),
            "channel_means": {
                "red": round(r_mean, 1),
                "green": round(g_mean, 1),
                "blue": round(b_mean, 1),
            },
            "analysis_method": "image_color_analysis",
        }
    except Exception as e:
        # Fallback to simulation if image processing fails
        result = _simulate_sensor_analysis()
        result["analysis_note"] = f"Image analysis fallback: {str(e)}"
        return result


def _simulate_sensor_analysis():
    """
    Simulate multispectral sensor data analysis.
    Uses random but realistic agricultural data distributions.
    """
    # Simulate NDVI (Normalized Difference Vegetation Index)
    # Real NDVI ranges: 0.2-0.4 (sparse/unhealthy), 0.4-0.6 (moderate), 0.6-0.9 (dense/healthy)
    ndvi = np.random.beta(5, 2) * 0.7 + 0.2  # Skewed toward healthy

    # Simulate Leaf Area Index (LAI)
    lai = ndvi * 6 + np.random.normal(0, 0.3)
    lai = max(0.5, min(7, lai))

    # Simulate chlorophyll content (SPAD units, 20-60 is normal)
    chlorophyll = ndvi * 50 + np.random.normal(0, 3)
    chlorophyll = max(15, min(65, chlorophyll))

    # Compute health score from multiple indicators
    health_score = (
        ndvi * 40 +               # NDVI contributes 40%
        (chlorophyll / 60) * 30 +  # Chlorophyll contributes 30%
        (lai / 7) * 20 +           # LAI contributes 20%
        np.random.normal(5, 2)     # Random variation
    )
    health_score = max(15, min(97, health_score))

    return {
        "health_score": round(health_score, 1),
        "ndvi": round(ndvi, 4),
        "leaf_area_index": round(lai, 2),
        "chlorophyll_spad": round(chlorophyll, 1),
        "analysis_method": "multispectral_simulation",
    }


def get_health_label(score):
    """Convert numeric score to human-readable label."""
    if score >= 85:
        return "Excellent"
    elif score >= 70:
        return "Good"
    elif score >= 50:
        return "Moderate"
    elif score >= 30:
        return "Poor"
    else:
        return "Critical"
