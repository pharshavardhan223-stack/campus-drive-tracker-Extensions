// Constants for Campus Drive Tracker Chrome Extension

export const STORAGE_KEYS = {
  DRIVES: 'campus_drives',
  GOOGLE_TOKEN: 'google_oauth_token',
  SETTINGS: 'extension_settings'
};

export const STATUS = {
  PENDING: 'Pending',
  APPLIED: 'Applied'
};

// Regex patterns for placement information extraction
export const EXTRACT_PATTERNS = {
  // Regexes for company extraction
  COMPANY: [
    /(?:placement|campus)\s+drive\s+(?:at|for|by|of)?\s*[:\-]?\s*([A-Za-z0-9\s&.\-_]+?)(?=\s+is\s+offering|\s+hiring|\s+recruiting|\s+announces|\s+drive|$)/i,
    /([A-Za-z0-9\s&.\-_]+?)\s+(?:is\s+offering|is\s+hiring|hiring|recruiting|announces|offering|campus\s+drive)/i,
    /Greetings\s+from\s+([A-Za-z0-9\s&.\-_]+)/i,
    /Company\s*:\s*([A-Za-z0-9\s&.\-_]+)/i
  ],

  // Regexes for role extraction
  ROLE: [
    /(?:Job\s+)?Role[s]?\s*:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|\n[A-Z]{2,}:|$)/i,
    /(?:Job\s+)?Profile[s]?\s*:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|\n[A-Z]{2,}:|$)/i,
    /Designation[s]?\s*:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|\n[A-Z]{2,}:|$)/i,
    /Position[s]?\s*:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|\n[A-Z]{2,}:|$)/i
  ],

  // Regexes for deadline extraction
  DEADLINE: [
    /(?:Registration\s+)?Deadline\s*[:\-]?\s*(.*)/i,
    /Last\s+(?:date|day)\s+(?:to\s+apply|for\s+registration|of\s+apply)?\s*[:\-]?\s*(.*)/i,
    /Apply\s+before\s*[:\-]?\s*(.*)/i,
    /Register\s+before\s*[:\-]?\s*(.*)/i
  ],

  // Regexes for eligibility extraction
  ELIGIBILITY: [
    /Eligibility\s*[:\-]?\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|\n[A-Z]{2,}:|$)/i,
    /Criteria\s*[:\-]?\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|\n[A-Z]{2,}:|$)/i,
    /Eligible\s+(?:branches|courses|degrees)\s*[:\-]?\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|\n[A-Z]{2,}:|$)/i
  ],

  // Regexes for CTC / Stipend extraction
  CTC: [
    /CTC\s*[:\-]?\s*(.*)/i,
    /Salary\s*[:\-]?\s*(.*)/i,
    /Package\s*[:\-]?\s*(.*)/i,
    /Stipend\s*[:\-]?\s*(.*)/i,
    /Compensation\s*[:\-]?\s*(.*)/i
  ],

  // General URL pattern
  URL: /https?:\/\/[^\s\)\>]+/i,
  
  // Specific Registration link patterns
  REGISTRATION_LINK_LABEL: [
    /(?:Registration|Apply|Form|Google\s+Form)\s+Link\s*[:\-]?\s*(.*)/i,
    /Link\s+to\s+apply\s*[:\-]?\s*(.*)/i,
    /Apply\s+Here\s*[:\-]?\s*(.*)/i
  ]
};

export const CALENDAR = {
  DEFAULT_COLOR_ID: '5', // Yellow/banana color in Google Calendar
  REMINDER_MINUTES: {
    ONE_DAY: 1440,
    ONE_HOUR: 60,
    AT_DEADLINE: 0
  }
};
