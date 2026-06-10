// Background Service Worker for Campus Drive Tracker Chrome Extension
// Manages application alarms and schedules local push notifications

import { STORAGE_KEYS } from '../utils/constants.js';

// Alarm name prefix: "reminder_[driveId]_[type]"
const ALARM_PREFIX = 'reminder_';

// Listen to messages from popup or storage services
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCHEDULE_ALARMS') {
    const drive = request.drive;
    if (drive && drive.id) {
      scheduleAlarmsForDrive(drive);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Invalid drive data' });
    }
  } else if (request.action === 'CANCEL_ALARMS') {
    const id = request.id;
    if (id) {
      cancelAlarmsForDrive(id);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Invalid drive id' });
    }
  }
  return true; // Keep message channel open
});

/**
 * Schedules alarms for a single drive (1 Day before, 1 Hour before, and at Deadline)
 * @param {Object} drive 
 */
function scheduleAlarmsForDrive(drive) {
  // Clear any existing alarms for this drive first to avoid duplicates
  cancelAlarmsForDrive(drive.id);

  if (!drive.deadline) return;

  const deadlineTime = new Date(drive.deadline).getTime();
  const now = Date.now();

  if (isNaN(deadlineTime) || deadlineTime <= now) return;

  // 1. Alarm: 1 Day (24 hours) Before Deadline
  const oneDayBefore = deadlineTime - (24 * 60 * 60 * 1000);
  if (oneDayBefore > now) {
    chrome.alarms.create(`${ALARM_PREFIX}${drive.id}_1day`, { when: oneDayBefore });
    console.log(`Scheduled 1-day alarm for ${drive.company} at:`, new Date(oneDayBefore).toString());
  }

  // 2. Alarm: 1 Hour Before Deadline
  const oneHourBefore = deadlineTime - (60 * 60 * 1000);
  if (oneHourBefore > now) {
    chrome.alarms.create(`${ALARM_PREFIX}${drive.id}_1hour`, { when: oneHourBefore });
    console.log(`Scheduled 1-hour alarm for ${drive.company} at:`, new Date(oneHourBefore).toString());
  }

  // 3. Alarm: At Deadline
  chrome.alarms.create(`${ALARM_PREFIX}${drive.id}_deadline`, { when: deadlineTime });
  console.log(`Scheduled deadline alarm for ${drive.company} at:`, new Date(deadlineTime).toString());
}

/**
 * Cancels all scheduled alarms for a given drive
 * @param {string} driveId 
 */
function cancelAlarmsForDrive(driveId) {
  chrome.alarms.clear(`${ALARM_PREFIX}${driveId}_1day`);
  chrome.alarms.clear(`${ALARM_PREFIX}${driveId}_1hour`);
  chrome.alarms.clear(`${ALARM_PREFIX}${driveId}_deadline`);
  console.log(`Cleared all alarms for drive: ${driveId}`);
}

// Listen for alarms firing
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith(ALARM_PREFIX)) {
    const parts = alarm.name.replace(ALARM_PREFIX, '').split('_');
    
    // Structure of parts: [driveId, type] or potentially parts containing multiple underscores if driveId has them
    // Our generateUUID format: "drive_abc123_timestamp" -> driveId has underscores.
    // Let's re-assemble the driveId safely.
    // The type is always the last element: '1day', '1hour', or 'deadline'
    const type = parts.pop();
    const driveId = 'drive_' + parts.join('_'); // Rebuild using prefix if we chopped it, or let's be simpler:
    // Wait, the alarm name has structure: "reminder_" + driveId + "_" + type.
    // So driveId is alarm.name.substring(ALARM_PREFIX.length, alarm.name.lastIndexOf('_'));
    const actualDriveId = alarm.name.substring(ALARM_PREFIX.length, alarm.name.lastIndexOf('_'));
    const actualType = alarm.name.substring(alarm.name.lastIndexOf('_') + 1);

    triggerNotification(actualDriveId, actualType);
  }
});

/**
 * Triggers a desktop notification for a placement drive reminder
 * @param {string} driveId 
 * @param {string} type - '1day' | '1hour' | 'deadline'
 */
function triggerNotification(driveId, type) {
  chrome.storage.local.get([STORAGE_KEYS.DRIVES], (result) => {
    const drives = result[STORAGE_KEYS.DRIVES] || {};
    const drive = drives[driveId];

    if (!drive) {
      console.warn(`Alarm fired for drive ${driveId} but it was not found in storage.`);
      return;
    }

    // Skip notifications if the drive is already marked as Applied
    if (drive.status === 'Applied' && type !== 'deadline') {
      console.log(`Skipping reminder for ${drive.company} since status is Applied`);
      return;
    }

    let title = '';
    let message = '';

    if (type === '1day') {
      title = `Deadline Tomorrow: ${drive.company}`;
      message = `The registration deadline for ${drive.role} is in 24 hours. Don't forget to apply!`;
    } else if (type === '1hour') {
      title = `Urgent: Deadline in 1 Hour - ${drive.company}`;
      message = `Only 1 hour left to complete your registration for the ${drive.role} drive!`;
    } else if (type === 'deadline') {
      title = `Registration Closed: ${drive.company}`;
      message = `The registration window for ${drive.role} has now closed.`;
    }

    const buttons = [];
    if (drive.registrationLink) {
      buttons.push({ title: 'Apply Now' });
    }
    buttons.push({ title: 'Open Tracker Dashboard' });

    chrome.notifications.create(`notify_${driveId}_${type}`, {
      type: 'basic',
      iconUrl: '/assets/icon128.png',
      title: title,
      message: message,
      contextMessage: 'Campus Drive Tracker',
      priority: 2, // Max priority
      requireInteraction: type === '1hour' || type === 'deadline', // Keep visible for urgent alarms
      buttons: buttons
    });
  });
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith('notify_')) {
    const parts = notificationId.replace('notify_', '').split('_');
    const type = parts.pop();
    const driveId = 'drive_' + parts.join('_');
    const actualDriveId = notificationId.substring('notify_'.length, notificationId.lastIndexOf('_'));

    chrome.storage.local.get([STORAGE_KEYS.DRIVES], (result) => {
      const drives = result[STORAGE_KEYS.DRIVES] || {};
      const drive = drives[actualDriveId];

      if (drive) {
        // If button index 0 is clicked and we have a registration link, open it
        // Note: if registrationLink is empty, the only button is "Open Tracker Dashboard" (index 0)
        if (buttonIndex === 0 && drive.registrationLink) {
          chrome.tabs.create({ url: drive.registrationLink });
        } else {
          // Open dashboard
          chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
        }
      }
    });
  }
});

// Handle clicking the notification body itself
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('notify_')) {
    // Open the dashboard on main body click
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  }
});
