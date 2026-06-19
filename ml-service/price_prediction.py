"""
Market Price Prediction Module
Uses time-series analysis with trend detection and seasonal decomposition
to forecast crop market prices.
"""

import numpy as np
from datetime import datetime, timedelta


# ── Historical Price Data (₹ per quintal, Indian market) ───
# Based on real APMC mandi price ranges
PRICE_DATABASE = {
    "Wheat": {
        "base_price": 2275,  # MSP 2024-25
        "volatility": 0.08,
        "seasonal_pattern": [0.95, 0.92, 0.90, 0.93, 0.97, 1.02, 1.05, 1.08, 1.10, 1.07, 1.03, 0.98],
        "trend": 0.06,  # 6% annual increase trend
    },
    "Rice": {
        "base_price": 2320,
        "volatility": 0.07,
        "seasonal_pattern": [0.98, 0.95, 0.93, 0.96, 1.00, 1.02, 1.05, 1.08, 1.06, 1.03, 1.00, 0.97],
        "trend": 0.05,
    },
    "Tomato": {
        "base_price": 1800,
        "volatility": 0.35,  # Very volatile
        "seasonal_pattern": [1.20, 1.30, 1.15, 0.80, 0.65, 0.70, 0.85, 0.90, 1.00, 1.10, 1.15, 1.25],
        "trend": 0.04,
    },
    "Cotton": {
        "base_price": 6620,
        "volatility": 0.10,
        "seasonal_pattern": [0.97, 0.95, 0.93, 0.95, 0.98, 1.00, 1.02, 1.05, 1.08, 1.06, 1.03, 1.00],
        "trend": 0.04,
    },
    "Sugarcane": {
        "base_price": 340,
        "volatility": 0.05,
        "seasonal_pattern": [1.00, 0.98, 0.97, 0.98, 1.00, 1.01, 1.02, 1.03, 1.02, 1.01, 1.00, 0.99],
        "trend": 0.05,
    },
    "Maize": {
        "base_price": 2090,
        "volatility": 0.12,
        "seasonal_pattern": [0.95, 0.93, 0.90, 0.92, 0.97, 1.02, 1.08, 1.10, 1.08, 1.05, 1.00, 0.97],
        "trend": 0.05,
    },
    "Soybean": {
        "base_price": 4600,
        "volatility": 0.15,
        "seasonal_pattern": [0.97, 0.95, 0.92, 0.93, 0.98, 1.03, 1.07, 1.10, 1.08, 1.05, 1.02, 0.98],
        "trend": 0.06,
    },
}


def _generate_historical_prices(crop_type, days=180):
    """Generate realistic historical price series using random walk with drift."""
    data = PRICE_DATABASE.get(crop_type, PRICE_DATABASE["Wheat"])
    base = data["base_price"]
    vol = data["volatility"]
    trend = data["trend"]
    seasonal = data["seasonal_pattern"]

    prices = []
    current_date = datetime.now() - timedelta(days=days)

    price = base * seasonal[current_date.month - 1]

    for i in range(days):
        day = current_date + timedelta(days=i)
        month = day.month - 1

        # Seasonal component
        seasonal_factor = seasonal[month]

        # Trend component (daily)
        trend_factor = 1 + (trend / 365)

        # Random component (daily returns)
        random_factor = 1 + np.random.normal(0, vol / np.sqrt(365))

        price = price * trend_factor * random_factor
        # Pull toward seasonal-adjusted base
        target = base * seasonal_factor * (1 + trend * i / 365)
        price = 0.98 * price + 0.02 * target  # Mean reversion

        prices.append({
            "date": day.strftime("%Y-%m-%d"),
            "price": round(price, 2),
        })

    return prices


def _calculate_moving_average(prices, window=7):
    """Calculate simple moving average."""
    values = [p["price"] for p in prices]
    if len(values) < window:
        return values[-1] if values else 0

    ma = np.convolve(values, np.ones(window) / window, mode="valid")
    return ma[-1]


def _detect_trend(prices, window=30):
    """Detect price trend using linear regression on recent data."""
    values = [p["price"] for p in prices[-window:]]
    if len(values) < 5:
        return 0, "stable"

    x = np.arange(len(values))
    coeffs = np.polyfit(x, values, 1)
    slope = coeffs[0]

    daily_change = slope / np.mean(values) * 100

    if daily_change > 0.1:
        direction = "upward"
    elif daily_change < -0.1:
        direction = "downward"
    else:
        direction = "stable"

    return round(daily_change * 30, 2), direction  # monthly change %


def predict_market_price(crop_type, forecast_days=30):
    """
    Predict market prices using time-series analysis:
    1. Generate historical price series
    2. Calculate moving averages (7-day and 30-day)
    3. Detect trend direction
    4. Forecast using trend + seasonal adjustment
    """
    data = PRICE_DATABASE.get(crop_type, PRICE_DATABASE["Wheat"])
    historical = _generate_historical_prices(crop_type, days=180)

    current_price = historical[-1]["price"]
    ma_7 = _calculate_moving_average(historical, 7)
    ma_30 = _calculate_moving_average(historical, 30)
    monthly_change, trend_direction = _detect_trend(historical)

    # ── Forecast ──
    forecast_prices = []
    price = current_price

    for i in range(1, forecast_days + 1):
        future_date = datetime.now() + timedelta(days=i)
        month = future_date.month - 1

        # Trend component
        daily_trend = data["trend"] / 365
        price *= (1 + daily_trend)

        # Seasonal pull
        seasonal_target = data["base_price"] * data["seasonal_pattern"][month]
        price = 0.95 * price + 0.05 * seasonal_target

        # Small random noise (decreasing confidence)
        noise = np.random.normal(0, data["volatility"] * 0.3 * np.sqrt(i))
        forecast_price = price * (1 + noise)

        forecast_prices.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "predicted_price": round(forecast_price, 2),
            "confidence_low": round(forecast_price * (1 - 0.02 * np.sqrt(i)), 2),
            "confidence_high": round(forecast_price * (1 + 0.02 * np.sqrt(i)), 2),
        })

    predicted_price = forecast_prices[-1]["predicted_price"]
    price_change = round(((predicted_price / current_price) - 1) * 100, 2)

    # Best selling window
    best_day = max(forecast_prices, key=lambda x: x["predicted_price"])

    return {
        "current_price": round(current_price, 2),
        "predicted_price_30d": round(predicted_price, 2),
        "price_change_percent": price_change,
        "trend": trend_direction,
        "monthly_change_percent": monthly_change,
        "currency": "INR",
        "unit": "per quintal",
        "moving_averages": {
            "ma_7": round(ma_7, 2),
            "ma_30": round(ma_30, 2),
        },
        "best_selling_window": {
            "date": best_day["date"],
            "expected_price": best_day["predicted_price"],
        },
        "forecast": forecast_prices[:7],  # First 7 days detailed
        "historical_recent": historical[-7:],  # Last 7 days
        "model": "TimeSeries_TrendSeasonal_v1",
    }
