// Helpers for Campus Drive Tracker Chrome Extension

/**
 * Parses a variety of date formats into a standard Date object
 * Handles:
 * - "06-Jun-2026, 03:00 P.M." / "06-Jun-2026, 03:00 PM"
 * - "06-Jun-2026 15:00"
 * - "06/06/2026 3:00 PM"
 * - "2026-06-06T15:00:00"
 * @param {string} dateStr 
 * @returns {Date|null}
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  
  let clean = dateStr.trim();
  
  // Normalize P.M. / A.M.
  clean = clean.replace(/p\.m\./i, 'PM')
               .replace(/a\.m\./i, 'AM')
               .replace(/p\.m/i, 'PM')
               .replace(/a\.m/i, 'AM');
               
  // Remove commas, semicolons
  clean = clean.replace(/[,;]/g, ' ');
  // Replace multiple spaces with a single space
  clean = clean.replace(/\s+/g, ' ');
  
  // Try standard parsing
  let parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Try custom regex parsing for: DD-MMM-YYYY or DD/MM/YYYY formats
  // Capture: Day, Month (name or number), Year, Hour, Minute, Second, AM/PM
  const pattern = /^(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?$/i;
  const match = clean.match(pattern);
  
  if (match) {
    const day = parseInt(match[1], 10);
    const monthVal = match[2];
    const year = parseInt(match[3], 10);
    let hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    const ampm = match[7];
    
    let month = 0;
    if (isNaN(monthVal)) {
      const months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      month = months[monthVal.toLowerCase().substring(0, 3)];
      if (month === undefined) month = 0;
    } else {
      month = parseInt(monthVal, 10) - 1;
    }
    
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours < 12) {
        hours += 12;
      } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
    }
    
    const date = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Fallback: Check for other patterns or return null
  return null;
}

/**
 * Formats a Date object to a human-readable display string
 * e.g., "06-Jun-2026 03:00 PM"
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatDate(dateInput) {
  if (!dateInput) return 'N/A';
  const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const formattedHours = String(hours).padStart(2, '0');
  
  return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Formats a Date object to YYYY-MM-DDTHH:MM (for datetime-local input fields)
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatDateForInput(dateInput) {
  if (!dateInput) return '';
  const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Generates a standard UUID v4
 * @returns {string}
 */
export function generateUUID() {
  return 'drive_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

/**
 * Trims text and removes excess inner white space
 * @param {string} text 
 * @returns {string}
 */
export function sanitizeText(text) {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Extracts the first URL found in a text string
 * @param {string} text 
 * @returns {string}
 */
export function extractFirstURL(text) {
  if (!text) return '';
  const match = text.match(/https?:\/\/[^\s\)\>]+/i);
  return match ? match[0] : '';
}
