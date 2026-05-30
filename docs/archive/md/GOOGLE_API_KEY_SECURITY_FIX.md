# Google API Key Security Fix
# This file contains sensitive API keys that should not be committed to public repositories

# Files containing Google API keys that should be excluded from public repos:
# - src/pages/HomePage.tsx
# - src/pages/RealTimeTracking.tsx  
# - src/pages/TrackingPage.tsx
# - src/pages/DeliveryStoreManagement.tsx
# - ml-express-mobile-app/app.json
# - courier-app/app.json

# Solution: Move API keys to environment variables
# Create a .env file with:
# REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here

# Then update the code to use:
# const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

# For mobile apps, use Expo environment variables:
# EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
