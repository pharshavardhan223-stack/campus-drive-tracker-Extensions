// Storage Service for Campus Drive Tracker Chrome Extension
// Wraps chrome.storage.local API in Promises for clean async/await usage

import { STORAGE_KEYS } from '../utils/constants.js';
import { generateUUID } from '../utils/helpers.js';

/**
 * Retrieves the raw drives map from storage
 * @returns {Promise<Object>} Map of driveId -> drive details
 */
export function getDrivesMap() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEYS.DRIVES], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[STORAGE_KEYS.DRIVES] || {});
      }
    });
  });
}

/**
 * Retrieves drives as a sorted array
 * @param {string} sortBy - Field to sort by ('deadline', 'createdAt')
 * @returns {Promise<Array>} List of drive objects
 */
export async function getDrivesList(sortBy = 'deadline') {
  try {
    const drivesMap = await getDrivesMap();
    const list = Object.values(drivesMap);
    
    // Sort logic
    list.sort((a, b) => {
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      } else {
        // default: createdAt descending
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    
    return list;
  } catch (error) {
    console.error("Error fetching drives list:", error);
    return [];
  }
}

/**
 * Saves or updates a campus drive
 * @param {Object} driveData 
 * @returns {Promise<Object>} The saved drive object
 */
export async function saveDrive(driveData) {
  try {
    const drives = await getDrivesMap();
    
    const id = driveData.id || generateUUID();
    const drive = {
      ...driveData,
      id: id,
      status: driveData.status || 'Pending',
      createdAt: driveData.createdAt || new Date().toISOString()
    };
    
    drives[id] = drive;
    
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEYS.DRIVES]: drives }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    // Notify background script to schedule local alarms for this drive
    chrome.runtime.sendMessage({ action: 'SCHEDULE_ALARMS', drive: drive }, (response) => {
      // Ignore if no listener active
      if (chrome.runtime.lastError) {
        // Safe fail
      }
    });
    
    return drive;
  } catch (error) {
    console.error("Error saving drive:", error);
    throw error;
  }
}

/**
 * Deletes a drive from storage
 * @param {string} id 
 * @returns {Promise<boolean>} Success status
 */
export async function deleteDrive(id) {
  try {
    const drives = await getDrivesMap();
    if (!drives[id]) return false;
    
    delete drives[id];
    
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEYS.DRIVES]: drives }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    // Notify background script to cancel local alarms for this drive
    chrome.runtime.sendMessage({ action: 'CANCEL_ALARMS', id: id }, (response) => {
      if (chrome.runtime.lastError) {
        // Safe fail
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error deleting drive:", error);
    throw error;
  }
}

/**
 * Updates application status of a drive
 * @param {string} id 
 * @param {string} status ('Pending' | 'Applied')
 * @returns {Promise<Object>} The updated drive object
 */
export async function updateDriveStatus(id, status) {
  try {
    const drives = await getDrivesMap();
    if (!drives[id]) throw new Error(`Drive ${id} not found.`);
    
    drives[id].status = status;
    
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEYS.DRIVES]: drives }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    return drives[id];
  } catch (error) {
    console.error("Error updating drive status:", error);
    throw error;
  }
}
