# Campus Drive Tracker Chrome Extension

A premium Chrome Extension designed for college students to avoid missing placement drive registration deadlines. It extracts details directly from Gmail placement emails, schedules desktop notifications (1 day before, 1 hour before, and at deadline), and syncs events to Google Calendar.

---

## Features

1. **Gmail Extractor**: Parses recruitment emails in Gmail for Company, Job Roles, Deadline, Registration Link, Eligibility, and CTC.
2. **Review Panel**: View and edit the extracted details before saving.
3. **Application Tracker Dashboard**: Manage placement drives in one place. Sort, search, filter, and manually add drives.
4. **Alarms & Push Notifications**: Automatic scheduling of desktop notifications (1 day before, 1 hour before, and at the deadline time).
5. **Google Calendar Integration**: Direct syncing of placement drives to your calendar.
6. **Graceful Local Fallback**: Full local operability (storage, status updates, alarms, and notifications) even if Google Calendar sync is not configured.

---

## Installation

1. Clone or download this project folder (`campus-drive-tracker`) to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner and select the `campus-drive-tracker` folder.
5. The extension is now installed! Pin it to your toolbar for easy access.

---

## Google Calendar API & OAuth 2.0 Setup Guide

Google OAuth in Chrome Extensions requires registering a Client ID in the Google Cloud Console. To set up Calendar sync, follow these steps:

### Step 1: Find your Extension ID
1. Go to `chrome://extensions` in your browser.
2. Find **Campus Drive Tracker** and copy the 32-character ID string (e.g. `pjjkibmnjphdopclfljpdcfofhmdlkhi`).

### Step 2: Register a Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. "Campus Drive Tracker").
3. In the sidebar, navigate to **APIs & Services** > **Library**.
4. Search for **Google Calendar API** and click **Enable**.

### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select User Type **External** and click **Create**.
3. Fill in the required App Information (App name, support email, developer email) and click **Save and Continue**.
4. Under **Scopes**, click **Add or Remove Scopes**, paste `https://www.googleapis.com/auth/calendar.events` in the search box, check the box next to it, click **Add to table**, and save.
5. Under **Test users**, click **Add Users** and enter your personal Gmail address (the one you will log in with). Save and continue.

### Step 4: Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** at the top and select **OAuth client ID**.
3. Set the **Application type** dropdown to **Chrome app**.
4. In the **Application ID** field, paste your 32-character Extension ID copied in Step 1.
5. Click **Create**. Copy the generated **Client ID** (ends with `.apps.googleusercontent.com`).

### Step 5: Update the Extension Configuration
1. Open [manifest.json](file:///e:/campus-drive-tracker/manifest.json) in your project.
2. Scroll to the bottom and locate the `"oauth2"` block:
   ```json
   "oauth2": {
     "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
     "scopes": [
       "https://www.googleapis.com/auth/calendar.events"
     ]
   }
   ```
3. Replace `"YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"` with the Client ID you copied in Step 4.
4. Save the file.
5. Go back to `chrome://extensions` and click the **Reload** (circular arrow) icon on the Campus Drive Tracker card.
6. The setup is complete! You can now click "Connect Calendar" on the dashboard or toggle "Sync Calendar" inside the popup.

---

## Directory Structure

```
campus-drive-tracker/
├── manifest.json       # Manifest V3 Extension Config
├── assets/             # Icon Assets
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── background/
│   └── background.js   # Alarm Monitor & Notifications Worker
├── content/
│   └── content.js      # Gmail Scraper Script
├── popup/
│   ├── popup.html      # Popup view
│   ├── popup.css       # Glassmorphism Popup Styles
│   └── popup.js        # Popup logical controller
├── services/
│   ├── auth.js         # OAuth Login Flows
│   ├── calendar.js     # Google Calendar REST API
│   ├── extractor.js    # Regex Information Parser
│   └── storage.js      # Local Storage & Alarm Triggers
├── utils/
│   ├── constants.js    # Shared keys, config, & regexes
│   └── helpers.js      # Custom date parses & formats
└── README.md           # Product Information & Setup Documentation
```

---

## Verification & Testing

To test that everything is working:
1. Open Gmail and click on any placement email (e.g. following the sample email format in the workspace instructions).
2. Click the extension icon to open the popup.
3. Click **Extract Drive Details**. The fields will populate automatically.
4. Verify the details, toggle **Google Calendar Sync** (if configured), and click **Save Campus Drive**.
5. You will be redirected to the **Dashboard** where you can view total drives, toggle applied/pending statuses, manually create new drives, or delete them.
