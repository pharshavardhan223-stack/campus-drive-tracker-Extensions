// Extraction Service for Campus Drive Tracker Chrome Extension
// Parses email content to pull out company details, roles, deadlines, eligibility, CTC, and links

import { EXTRACT_PATTERNS } from '../utils/constants.js';
import { parseDate, extractFirstURL, sanitizeText } from '../utils/helpers.js';

/**
 * Extracts recruitment drive details from the provided Gmail metadata
 * @param {Object} emailData 
 * @param {string} emailData.subject 
 * @param {string} emailData.body 
 * @param {string} emailData.selectedText 
 * @returns {Object} Extracted data matching the data model
 */
export function extractDriveInfo({ subject = '', body = '', selectedText = '' }) {
  // Use selected text as priority, fall back to email body
  const scanText = selectedText ? selectedText : body;
  
  // 1. Extract Company Name
  let company = '';
  
  // Try matching against Subject line first
  for (const pattern of EXTRACT_PATTERNS.COMPANY) {
    const match = subject.match(pattern);
    if (match && match[1]) {
      company = sanitizeText(match[1]);
      break;
    }
  }
  
  // If not found in Subject, search in the body text
  if (!company) {
    for (const pattern of EXTRACT_PATTERNS.COMPANY) {
      const match = scanText.match(pattern);
      if (match && match[1]) {
        company = sanitizeText(match[1]);
        break;
      }
    }
  }
  
  // If still not found, check the first line of the body
  if (!company && body) {
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      // Use the first 4 words of the first line as a fallback company name
      const words = lines[0].split(/\s+/).slice(0, 4).join(' ');
      company = words.replace(/[:\-]/g, '').trim();
    }
  }
  
  // 2. Extract Job Role
  let role = '';
  for (const pattern of EXTRACT_PATTERNS.ROLE) {
    const match = scanText.match(pattern);
    if (match && match[1]) {
      const rolesList = match[1]
        .split('\n')
        .map(r => r.trim().replace(/^[\-\*•\d\.\s]+/g, '')) // Strip bullets/numbers
        .filter(Boolean);
      
      if (rolesList.length > 0) {
        role = rolesList.join(', ');
        break;
      }
    }
  }

  // Fallback: If no role match is found, search for common role names like "Software Developer", "Intern", "Engineer"
  if (!role && scanText) {
    const commonRoles = ['software engineer', 'software developer', 'systems engineer', 'analyst', 'intern', 'graduate engineer trainee', 'get', 'qa engineer', 'product manager'];
    for (const r of commonRoles) {
      const regex = new RegExp(`\\b${r}\\b`, 'i');
      if (regex.test(scanText)) {
        role = r.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        break;
      }
    }
  }

  // 3. Extract Registration Deadline
  let deadline = '';
  let deadlineRaw = '';
  for (const pattern of EXTRACT_PATTERNS.DEADLINE) {
    const match = scanText.match(pattern);
    if (match && match[1]) {
      deadlineRaw = match[1].trim();
      const parsedDate = parseDate(deadlineRaw);
      if (parsedDate) {
        deadline = parsedDate.toISOString();
        break;
      }
    }
  }

  // If Date constructor failed, try parsing raw deadline string with other patterns
  if (!deadline && deadlineRaw) {
    const parsedDate = parseDate(deadlineRaw);
    if (parsedDate) {
      deadline = parsedDate.toISOString();
    } else {
      // Keep the raw parsed string for review if it's a short text, else leave empty
      deadline = deadlineRaw.length < 50 ? deadlineRaw : '';
    }
  }

  // 4. Extract Registration Link
  let registrationLink = '';
  
  // Look for labeled links first
  for (const pattern of EXTRACT_PATTERNS.REGISTRATION_LINK_LABEL) {
    const match = scanText.match(pattern);
    if (match && match[1]) {
      const urlMatch = match[1].match(EXTRACT_PATTERNS.URL);
      if (urlMatch) {
        registrationLink = urlMatch[0];
        break;
      }
    }
  }

  // Fallback 1: Look for Google Forms URLs (extremely common for campus placements)
  if (!registrationLink) {
    const googleFormMatch = scanText.match(/https?:\/\/(?:docs\.google\.com\/forms|forms\.gle)[^\s\)\>]+/i);
    if (googleFormMatch) {
      registrationLink = googleFormMatch[0];
    }
  }

  // Fallback 2: Extract the first general URL
  if (!registrationLink) {
    registrationLink = extractFirstURL(scanText);
  }

  // 5. Extract Eligibility Criteria
  let eligibility = '';
  for (const pattern of EXTRACT_PATTERNS.ELIGIBILITY) {
    const match = scanText.match(pattern);
    if (match && match[1]) {
      eligibility = match[1]
        .split('\n')
        .map(l => l.trim().replace(/^[\-\*•\d\.\s]+/g, ''))
        .filter(Boolean)
        .join(', ');
      break;
    }
  }

  // 6. Extract CTC/Stipend
  let ctc = '';
  for (const pattern of EXTRACT_PATTERNS.CTC) {
    const match = scanText.match(pattern);
    if (match && match[1]) {
      ctc = sanitizeText(match[1]);
      break;
    }
  }

  return {
    company: company || 'Unknown Company',
    role: role || 'Software Developer',
    deadline: deadline || '',
    registrationLink: registrationLink || '',
    eligibility: eligibility || '',
    ctc: ctc || '',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };
}
