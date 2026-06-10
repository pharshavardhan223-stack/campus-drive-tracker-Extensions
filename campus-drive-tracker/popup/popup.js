// Popup Controller for Campus Drive Tracker Chrome Extension (Local Only)

import { extractDriveInfo } from '../services/extractor.js';
import { saveDrive } from '../services/storage.js';
import { formatDateForInput } from '../utils/helpers.js';

// DOM Elements
const statusNotice = document.getElementById('statusNotice');
const statusMessage = document.getElementById('statusMessage');
const extractBtn = document.getElementById('extractBtn');
const viewDashboardBtn = document.getElementById('viewDashboardBtn');
const driveForm = document.getElementById('driveForm');

// Form Fields
const companyInput = document.getElementById('company');
const roleInput = document.getElementById('role');
const deadlineInput = document.getElementById('deadline');
const linkInput = document.getElementById('registrationLink');
const eligibilityInput = document.getElementById('eligibility');
const ctcInput = document.getElementById('ctc');

// Current extracted drive info (in memory before saving)
let currentDrive = null;

// Initialize Popup
document.addEventListener('DOMContentLoaded', async () => {
  // Check if active tab is Gmail
  const isGmail = await checkActiveTabUrl();
  if (!isGmail) {
    updateStatus('warning', 'Please open a Gmail placement email to extract drive details.');
    extractBtn.disabled = true;
    extractBtn.style.opacity = '0.5';
    extractBtn.style.cursor = 'not-allowed';
  } else {
    updateStatus('info', 'Gmail email detected. Click Extract to parse details.');
  }
});

// Event Listeners
extractBtn.addEventListener('click', handleExtraction);
viewDashboardBtn.addEventListener('click', openDashboard);
driveForm.addEventListener('submit', handleFormSubmit);

/**
 * Checks if the current tab is Gmail
 * @returns {Promise<boolean>}
 */
async function checkActiveTabUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const url = tabs[0].url;
        resolve(url && url.includes('mail.google.com'));
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * Extracts placement drive info from the active Gmail page
 */
async function handleExtraction() {
  updateStatus('loading', 'Reading email content from Gmail...');
  
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (!tabs || !tabs[0]) {
      updateStatus('danger', 'Could not locate active browser tab.');
      return;
    }

    const tabId = tabs[0].id;

    // Helper to send message and parse response
    const sendGetEmailText = () => {
      chrome.tabs.sendMessage(tabId, { action: "GET_EMAIL_TEXT" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          updateStatus('danger', 'Failed to read Gmail page. Try refreshing the Gmail page and opening the email again.');
          console.error("Content script communication error:", chrome.runtime.lastError);
          return;
        }
        processExtractionResponse(response);
      });
    };

    // First attempt to send message directly (standard scenario)
    chrome.tabs.sendMessage(tabId, { action: "GET_EMAIL_TEXT" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        console.log("Direct connection failed. Attempting on-demand content script injection...");
        
        // Dynamically inject the content script if it is missing (e.g. tab was open before extension install)
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content/content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            updateStatus('danger', 'Failed to connect to Gmail tab. Please refresh the Gmail tab and try again.');
            console.error("Script injection failed:", chrome.runtime.lastError);
            return;
          }
          // Retry sending the message after successful injection
          sendGetEmailText();
        });
      } else {
        processExtractionResponse(response);
      }
    });
  });
}

/**
 * Processes the response from the content script and pre-fills the form
 * @param {Object} response - Response containing subject, body, and selected text
 */
function processExtractionResponse(response) {
  if (!response.success) {
    updateStatus('danger', `Extraction failed: ${response.error}`);
    return;
  }

  try {
    currentDrive = extractDriveInfo({
      subject: response.subject,
      body: response.body,
      selectedText: response.selectedText
    });

    // Pre-fill Form Fields
    companyInput.value = currentDrive.company;
    roleInput.value = currentDrive.role;
    deadlineInput.value = currentDrive.deadline ? formatDateForInput(currentDrive.deadline) : '';
    linkInput.value = currentDrive.registrationLink;
    eligibilityInput.value = currentDrive.eligibility;
    ctcInput.value = currentDrive.ctc;

    // Show Form
    driveForm.classList.remove('hidden');
    updateStatus('success', 'Details extracted successfully! Please verify.');
  } catch (err) {
    updateStatus('danger', `Parsing error: ${err.message}`);
    console.error("Extractor error:", err);
  }
}

/**
 * Saves placement drive details locally
 * @param {Event} e 
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!companyInput.value.trim() || !roleInput.value.trim() || !deadlineInput.value) {
    updateStatus('danger', 'Please fill in all required fields marked with *');
    return;
  }

  // Construct drive data from form fields
  const updatedDrive = {
    ...currentDrive,
    company: companyInput.value.trim(),
    role: roleInput.value.trim(),
    deadline: new Date(deadlineInput.value).toISOString(), // Convert local picker back to ISO
    registrationLink: linkInput.value.trim(),
    eligibility: eligibilityInput.value.trim(),
    ctc: ctcInput.value.trim(),
    status: 'Pending'
  };

  updateStatus('loading', 'Saving drive details...');

  try {
    // Save to local storage (which also schedules local alarms in background.js)
    await saveDrive(updatedDrive);
    updateStatus('success', 'Drive saved successfully!');

    // Wait 1.2 seconds and redirect to dashboard
    setTimeout(() => {
      openDashboard();
      window.close(); // Close popup
    }, 1200);

  } catch (err) {
    updateStatus('danger', `Failed to save: ${err.message}`);
  }
}

/**
 * Opens the dashboard in a new tab
 */
function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
}

/**
 * Updates the UI status notification card
 * @param {string} type - 'info' | 'success' | 'warning' | 'danger' | 'loading'
 * @param {string} message 
 */
function updateStatus(type, message) {
  // Clear previous states
  statusNotice.className = 'status-card';
  
  if (type === 'loading') {
    statusNotice.classList.add('info', 'loading');
  } else {
    statusNotice.classList.add(type);
  }
  
  statusMessage.textContent = message;
}