#!/bin/bash

# Google API Key Removal Script
# This script removes hardcoded Google API keys from the codebase

echo "🔧 Removing hardcoded Google API keys..."

# Files to clean up
FILES=(
    "src/pages/HomePage.tsx"
    "src/pages/RealTimeTracking.tsx"
    "src/pages/TrackingPage.tsx"
    "src/pages/DeliveryStoreManagement.tsx"
    "ml-express-mobile-app/app.json"
    "courier-app/app.json"
)

# Replace hardcoded API keys with environment variable references
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📝 Processing $file..."
        
        # Replace hardcoded API keys with environment variable
        sed -i 's/AIzaSy[^"]*/process.env.REACT_APP_GOOGLE_MAPS_API_KEY/g' "$file"
        
        echo "✅ Updated $file"
    else
        echo "⚠️  File not found: $file"
    fi
done

echo "🎉 API key cleanup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Create a .env file with your actual API key:"
echo "   REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here"
echo ""
echo "2. Add .env to .gitignore (already done)"
echo ""
echo "3. Update Netlify environment variables:"
echo "   - Go to Netlify dashboard"
echo "   - Site settings > Environment variables"
echo "   - Add REACT_APP_GOOGLE_MAPS_API_KEY"
echo ""
echo "4. Redeploy your site"
