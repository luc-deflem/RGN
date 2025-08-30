# 🤖 Local AI Recipe Analysis Setup Guide

## ✅ **System Complete & Secure**

Your local-only AI recipe analysis system is now fully implemented with maximum security:

- ✅ **Environment Detection**: Automatically detects local vs Firebase hosting
- ✅ **API Key Protection**: Never deployed to Firebase - local Mac only  
- ✅ **Multi-Service Support**: OpenAI, Google Vision, Azure Computer Vision
- ✅ **Auto-Export**: JSON files for easy Firebase upload
- ✅ **Dutch Localization**: All prompts and parsing in Dutch
- ✅ **Security**: .gitignore + firebase.json protection

---

## 🔧 **Setup Instructions**

### 1. Configure Your API Credentials

Edit the file `local-ai-config.js` and replace the placeholder API keys:

```javascript
const LOCAL_AI_CONFIG = {
    // Choose your preferred service
    openai: {
        apiKey: 'sk-your-actual-openai-api-key-here', // ← Replace this
        model: 'gpt-4-vision-preview',
        enabled: true
    },
    
    // Set your preferred service
    preferredService: 'openai', // or 'googleVision' or 'azure'
};
```

### 2. Get API Keys

**OpenAI (Recommended):**
- Visit: https://platform.openai.com/api-keys
- Create new API key
- Copy to `local-ai-config.js`

**Google Vision (Alternative):**
- Visit: https://console.cloud.google.com/apis/credentials
- Enable Vision API
- Create API key

**Azure Computer Vision (Alternative):**
- Visit: https://portal.azure.com/
- Create Computer Vision resource
- Copy endpoint and subscription key

### 3. Test Your Setup

1. **Run Locally**: `npx serve -s . -l 8080` (not Firebase hosting)
2. **Check Console**: Look for "🏠 [LOCAL-AI] Local AI configuration loaded"
3. **Import Recipe Image**: Use "Add Recipe" button → select image → "Extract from Image"
4. **Verify Export**: After analysis, you'll be prompted to download JSON

---

## 🚀 **Workflow: Local Analysis → Firebase Upload**

### Step 1: Local Analysis (Your Mac)
```bash
cd deploy/public
npx serve -s . -l 8080  # Local server ONLY
```

1. Open `http://localhost:8080`
2. Click "Add Recipe" 
3. Select recipe image
4. Click "Extract from Image" 
5. AI analyzes image (using your API keys)
6. Download JSON file when prompted

### Step 2: Firebase Upload
```bash
# Upload cleaned JSON (no API keys)
firebase deploy
```

1. Copy JSON files to Firebase version
2. Use "📤 Import AI Recipes (JSON)" button
3. Recipes appear in Firebase without any API exposure

---

## 🔒 **Security Features**

### What's Protected:
- ✅ **API Keys**: Never leave your Mac
- ✅ **Git Protection**: `.gitignore` prevents commits
- ✅ **Firebase Protection**: `firebase.json` excludes from deployment
- ✅ **Environment Detection**: Only loads locally

### What Gets Deployed:
- ✅ **Recipe Data**: Clean JSON without API metadata
- ✅ **UI Components**: Recipe display and management
- ✅ **Firebase Sync**: Shopping lists, pantry, products
- ❌ **NO API Keys**: Zero exposure risk

---

## 🛠️ **Available Services**

### OpenAI GPT-4 Vision (Recommended)
- **Best Results**: Advanced recipe understanding
- **Dutch Support**: Excellent localization
- **Cost**: ~$0.01-0.05 per image

### Google Vision API
- **OCR Focus**: Text extraction first, then formatting
- **Fast**: Quick processing
- **Cost**: ~$1.50 per 1000 images

### Azure Computer Vision
- **Enterprise**: Microsoft cloud service
- **Good OCR**: Reliable text detection
- **Cost**: Variable pricing

---

## 🎯 **Features in Action**

### Local Mode (localhost:8080):
- 🏠 "Local AI Mode" indicator
- 🤖 Real image analysis with your APIs
- 📥 Auto-download JSON after analysis
- 📤 Import/export controls visible

### Firebase Mode (Production):
- ☁️ Clean production interface
- 📝 Manual recipe entry only
- 🚫 No AI controls (secure)
- 🔗 All other features work normally

---

## 🔍 **Testing Your Configuration**

1. **Environment Test**: Check console for "🏠 [LOCAL-AI]" messages
2. **API Test**: Try image analysis - should see service name in console
3. **Export Test**: Verify JSON download after analysis
4. **Firebase Test**: Deploy and confirm no AI controls visible

---

## ⚠️ **Troubleshooting**

### "AI analysis only available locally"
- ✅ Running on localhost:8080?
- ✅ `local-ai-config.js` file exists?
- ✅ API key configured correctly?

### "OpenAI API not configured"
- ✅ Replaced 'YOUR_OPENAI_API_KEY' with real key?
- ✅ API key has GPT-4 Vision access?
- ✅ Sufficient API credits?

### No export prompt after analysis
- ✅ Check console for errors
- ✅ `recipe-ai-exporter.js` loaded?
- ✅ Pop-up blocker disabled?

---

## 🎉 **You're All Set!**

Your secure, local-only AI recipe analysis system is ready! 

**Next Steps:**
1. Add your API key to `local-ai-config.js`
2. Test with a recipe image
3. Upload the resulting JSON to Firebase

**Security Guarantee:** Your API keys will NEVER be exposed to Firebase or committed to git. The system is designed for maximum security with zero compromise.