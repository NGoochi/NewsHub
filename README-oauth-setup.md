# Google OAuth2 Setup Guide

Since service accounts don't have Google Drive storage, we're using OAuth2 with your personal Google account.

## 🔧 **Step 1: Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Google Drive API**
   - **Google Sheets API**

## 🔑 **Step 2: Create OAuth2 Credentials**

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Add authorized redirect URI: `http://localhost:3000`
5. Download the JSON file or copy the credentials

## 🎯 **Step 3: Get Refresh Token**

You need to get a refresh token. Here's a quick script to help:

```bash
# Install the Google APIs client library
npm install googleapis

# Run this script to get your refresh token
node -e "
const { google } = require('googleapis');
const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3000'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
});

console.log('Visit this URL to get your refresh token:');
console.log(authUrl);
console.log('After authorization, you\'ll get a code. Use that code in the next step.');
"
```

## 📝 **Step 4: Update .env File**

Replace the placeholder values in your `.env` file:

```bash
GOOGLE_CLIENT_ID=your_actual_client_id
GOOGLE_CLIENT_SECRET=your_actual_client_secret
GOOGLE_REFRESH_TOKEN=your_actual_refresh_token
MASTER_SHEET_ID=1QWMXDpRQ5upnuLXRLFs78APGT2uqmC6pyY8VQj4sfsU
```

## ✅ **Step 5: Test**

1. Start the development server: `npm run dev`
2. Go to `http://localhost:3000`
3. Try creating a new project

## 🔒 **Security Notes**

- Keep your `.env` file private (it's in `.gitignore`)
- Don't commit OAuth credentials to version control
- The refresh token allows long-term access to your Google account
