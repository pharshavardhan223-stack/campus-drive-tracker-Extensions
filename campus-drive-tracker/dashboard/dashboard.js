// Dashboard Controller for Campus Drive Tracker Chrome Extension (Local Only)

import { getDrivesList, saveDrive, deleteDrive, updateDriveStatus } from '../services/storage.js';
import { formatDate, formatDateForInput } from '../utils/helpers.js';

// DOM Elements - Metrics
const countTotal = document.getElementById('countTotal');
const countPending = document.getElementById('countPending');
const countApplied = document.getElementById('countApplied');

// DOM Elements - Controls
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const addDriveBtn = document.getElementById('addDriveBtn');

// View Toggle buttons & Sections
const tableViewBtn = document.getElementById('tableViewBtn');
const calendarViewBtn = document.getElementById('calendarViewBtn');
const tableViewSection = document.getElementById('tableViewSection');
const calendarViewSection = document.getElementById('calendarViewSection');

// DOM Elements - Table
const drivesTableBody = document.getElementById('drivesTableBody');

// DOM Elements - Calendar Left Pane
const calendarGrid = document.getElementById('calendarGrid');
const calendarMonthYearLabel = document.getElementById('calendarMonthYear');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');

// DOM Elements - Calendar Right Details Pane
const selectedDateLabel = document.getElementById('selectedDateLabel');
const selectedDrivesCount = document.getElementById('selectedDrivesCount');
const selectedDateDetailsBody = document.getElementById('selectedDateDetailsBody');

// Modal Elements
const driveModal = document.getElementById('driveModal');
const modalTitle = document.getElementById('modalTitle');
const modalForm = document.getElementById('modalForm');
const modalDriveId = document.getElementById('modalDriveId');
const modalCompany = document.getElementById('modalCompany');
const modalRole = document.getElementById('modalRole');
const modalDeadline = document.getElementById('modalDeadline');
const modalStatus = document.getElementById('modalStatus');
const modalLink = document.getElementById('modalLink');
const modalEligibility = document.getElementById('modalEligibility');
const modalCtc = document.getElementById('modalCtc');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');

// State Variables
let allDrives = [];
let currentView = 'list'; // 'list' | 'calendar'
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth(); // 0-indexed
let selectedDateString = getTodayDateString(); // Default selection

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load data from local storage
  await loadAndRenderDrives();

  // 2. Setup Filter Event Listeners
  searchInput.addEventListener('input', renderActiveView);
  statusFilter.addEventListener('change', renderActiveView);
  
  // 3. Setup View Toggle Event Listeners
  tableViewBtn.addEventListener('click', () => switchView('list'));
  calendarViewBtn.addEventListener('click', () => switchView('calendar'));
  
  // 4. Setup Month Navigation Event Listeners
  prevMonthBtn.addEventListener('click', navigatePreviousMonth);
  nextMonthBtn.addEventListener('click', navigateNextMonth);
  
  // 5. Setup Modal Event Listeners
  addDriveBtn.addEventListener('click', () => {
    // Open modal with the currently selected date in the calendar as a starting default
    const prefilledDate = `${selectedDateString}T09:00`;
    openModalWithDate(prefilledDate);
  });
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);
  modalForm.addEventListener('submit', handleModalSubmit);
  
  // Close modal when clicking outside contents
  driveModal.addEventListener('click', (e) => {
    if (e.target === driveModal) closeModal();
  });
});

/**
 * Loads campus drives from storage, calculates statistics, and updates the active view
 */
async function loadAndRenderDrives() {
  allDrives = await getDrivesList('deadline');
  
  // Update Metrics
  const total = allDrives.length;
  const pending = allDrives.filter(d => d.status === 'Pending').length;
  const applied = allDrives.filter(d => d.status === 'Applied').length;
  
  countTotal.textContent = total;
  countPending.textContent = pending;
  countApplied.textContent = applied;
  
  // Render
  renderActiveView();
}

/**
 * Renders the view that is currently selected (Table or Calendar)
 */
function renderActiveView() {
  const filtered = getFilteredDrives();
  
  if (currentView === 'list') {
    renderDrivesTable(filtered);
  } else {
    renderCalendarGrid(filtered);
    renderSelectedDateDetails(selectedDateString, filtered);
  }
}

/**
 * Switches between list and calendar views
 * @param {string} view - 'list' | 'calendar'
 */
function switchView(view) {
  if (currentView === view) return;
  
  currentView = view;
  
  if (view === 'list') {
    tableViewBtn.classList.add('active');
    calendarViewBtn.classList.remove('active');
    tableViewSection.classList.remove('hidden');
    calendarViewSection.classList.add('hidden');
  } else {
    tableViewBtn.classList.remove('active');
    calendarViewBtn.classList.add('active');
    tableViewSection.classList.add('hidden');
    calendarViewSection.classList.remove('hidden');
  }
  
  renderActiveView();
}

/**
 * Filters the master drives list based on search and status inputs
 * @returns {Array} Filtered drive objects
 */
function getFilteredDrives() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const filterVal = statusFilter.value;
  
  return allDrives.filter(drive => {
    // 1. Apply status filter
    if (filterVal !== 'All' && drive.status !== filterVal) {
      return false;
    }
    
    // 2. Apply search filter
    if (searchTerm) {
      const matchCompany = drive.company.toLowerCase().includes(searchTerm);
      const matchRole = drive.role.toLowerCase().includes(searchTerm);
      const matchEligibility = drive.eligibility.toLowerCase().includes(searchTerm);
      return matchCompany || matchRole || matchEligibility;
    }
    
    return true;
  });
}

/**
 * Renders the drive list inside the table viewport
 * @param {Array} filteredDrives 
 */
function renderDrivesTable(filteredDrives) {
  drivesTableBody.innerHTML = '';
  
  if (filteredDrives.length === 0) {
    drivesTableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="8">
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <h4>No campus drives found</h4>
            <p>Adjust your search query, change the status filter, or add a drive manually.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  filteredDrives.forEach(drive => {
    const tr = document.createElement('tr');
    
    const formattedDeadline = drive.deadline ? formatDate(drive.deadline) : 'No Deadline';
    const cleanLink = drive.registrationLink ? `<a href="${drive.registrationLink}" target="_blank" class="link-btn" title="Open Link"><span>Open</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>` : 'N/A';
    const statusClass = drive.status === 'Applied' ? 'applied' : 'pending';
    
    tr.innerHTML = `
      <td class="company-name" data-label="Company">${escapeHtml(drive.company)}</td>
      <td class="job-role" data-label="Job Role">${escapeHtml(drive.role)}</td>
      <td class="deadline-time" data-label="Deadline">${formattedDeadline}</td>
      <td data-label="Eligibility">${escapeHtml(drive.eligibility) || 'N/A'}</td>
      <td class="ctc-value" data-label="CTC/Stipend">${escapeHtml(drive.ctc) || 'N/A'}</td>
      <td data-label="Reg. Link">${cleanLink}</td>
      <td data-label="Status">
        <span class="status-badge ${statusClass}" data-id="${drive.id}">${drive.status}</span>
      </td>
      <td class="actions-cell" data-label="Actions">
        <button class="btn outline-btn sm-btn edit-action-btn" data-id="${drive.id}" title="Edit details">Edit</button>
        <button class="btn outline-btn sm-btn danger-btn delete-action-btn" data-id="${drive.id}" title="Delete drive">Delete</button>
      </td>
    `;
    
    drivesTableBody.appendChild(tr);
  });
  
  attachRowEventListeners();
}

/**
 * Attaches row listeners (edit, delete, status toggle) to table elements
 */
function attachRowEventListeners() {
  // 1. Status badge click
  document.querySelectorAll('.status-badge').forEach(badge => {
    badge.addEventListener('click', async (e) => {
      const driveId = e.target.getAttribute('data-id');
      const currentStatus = e.target.textContent;
      const nextStatus = currentStatus === 'Pending' ? 'Applied' : 'Pending';
      
      try {
        await updateDriveStatus(driveId, nextStatus);
        await loadAndRenderDrives();
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    });
  });

  // 2. Edit button click
  document.querySelectorAll('.edit-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const driveId = e.target.getAttribute('data-id');
      const drive = allDrives.find(d => d.id === driveId);
      if (drive) openModal(drive);
    });
  });

  // 3. Delete button click
  document.querySelectorAll('.delete-action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const driveId = e.target.getAttribute('data-id');
      
      if (confirm(`Are you sure you want to delete this drive? This will clear its alarms.`)) {
        try {
          await deleteDrive(driveId);
          await loadAndRenderDrives();
        } catch (err) {
          console.error("Failed to delete drive:", err);
        }
      }
    });
  });
}

/**
 * Calculates monthly calendar cells and renders the compact grid
 * @param {Array} filteredDrives 
 */
function renderCalendarGrid(filteredDrives) {
  calendarGrid.innerHTML = '';
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  calendarMonthYearLabel.textContent = `${months[calendarMonth]} ${calendarYear}`;
  
  // Boundary calculations
  const firstDayOfWeekIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // Day of week index for the 1st
  const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate(); // Total days in active month
  const totalDaysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate(); // Total days in previous month
  
  const today = new Date();
  
  // 1. Fill previous month tail cells
  for (let i = firstDayOfWeekIndex; i > 0; i--) {
    const prevDay = totalDaysInPrevMonth - i + 1;
    const cell = createCalendarCell(prevDay, 'prev-month');
    calendarGrid.appendChild(cell);
  }
  
  // 2. Fill active month cells
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const isToday = today.getDate() === day && today.getMonth() === calendarMonth && today.getFullYear() === calendarYear;
    const dateString = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = dateString === selectedDateString;
    
    let cellClass = 'current-month';
    if (isToday) cellClass += ' today';
    if (isSelected) cellClass += ' selected';
    
    const cell = createCalendarCell(day, cellClass);
    cell.setAttribute('data-date', dateString);
    
    // Check if any drives are due on this date (Local check)
    const drivesOnDay = filteredDrives.filter(drive => {
      if (!drive.deadline) return false;
      const deadlineDate = new Date(drive.deadline);
      const deadString = `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth() + 1).padStart(2, '0')}-${String(deadlineDate.getDate()).padStart(2, '0')}`;
      return deadString === dateString;
    });
    
    // If drives exist, show a small star (★) indicator instead of pills
    if (drivesOnDay.length > 0) {
      const star = document.createElement('span');
      star.className = 'calendar-star-indicator';
      star.innerHTML = '★';
      star.title = `${drivesOnDay.length} drive(s) due on this day`;
      cell.appendChild(star);
    }
    
    // Clicking a day cell selects it and renders its details in the right pane
    cell.addEventListener('click', (e) => {
      // Remove selected highlight from other cells
      document.querySelectorAll('.calendar-day-cell.selected').forEach(c => {
        c.classList.remove('selected');
      });
      // Add selected highlight to current cell
      cell.classList.add('selected');
      
      selectedDateString = dateString;
      renderSelectedDateDetails(selectedDateString, filteredDrives);
    });
    
    calendarGrid.appendChild(cell);
  }
  
  // 3. Fill next month head cells to complete 42 cell grid
  const cellsRendered = calendarGrid.children.length;
  const remainingCells = 42 - cellsRendered;
  for (let day = 1; day <= remainingCells; day++) {
    const cell = createCalendarCell(day, 'next-month');
    calendarGrid.appendChild(cell);
  }
}

/**
 * Creates a calendar day cell DOM element
 * @param {number} dayNumber 
 * @param {string} className 
 * @returns {HTMLElement} Cell element
 */
function createCalendarCell(dayNumber, className) {
  const cell = document.createElement('div');
  cell.className = `calendar-day-cell ${className}`;
  
  const span = document.createElement('span');
  span.className = 'day-number';
  span.textContent = dayNumber;
  
  cell.appendChild(span);
  return cell;
}

/**
 * Renders the right details panel for the selected date
 * @param {string} dateString 
 * @param {Array} filteredDrives 
 */
function renderSelectedDateDetails(dateString, filteredDrives) {
  // 1. Format date label
  const parsedDate = new Date(dateString);
  const formattedDate = parsedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  selectedDateLabel.textContent = `Deadlines for ${formattedDate}`;
  
  // 2. Filter drives for this date
  const drivesOnDay = filteredDrives.filter(drive => {
    if (!drive.deadline) return false;
    const deadlineDate = new Date(drive.deadline);
    const deadString = `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth() + 1).padStart(2, '0')}-${String(deadlineDate.getDate()).padStart(2, '0')}`;
    return deadString === dateString;
  });
  
  // 3. Update count badge
  selectedDrivesCount.textContent = `${drivesOnDay.length} due`;
  
  // 4. Render details
  selectedDateDetailsBody.innerHTML = '';
  
  if (drivesOnDay.length === 0) {
    selectedDateDetailsBody.innerHTML = `
      <div class="details-empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>No deadlines scheduled for this date. Click "+ Add Drive" to schedule a manual drive on this date.</p>
      </div>
    `;
    return;
  }
  
  drivesOnDay.forEach(drive => {
    const card = document.createElement('div');
    card.className = 'calendar-drive-detail-card';
    
    const statusClass = drive.status === 'Applied' ? 'applied' : 'pending';
    const cleanLinkButton = drive.registrationLink ? `
      <a href="${drive.registrationLink}" target="_blank" class="btn success-btn sm-btn" title="Open Google Form / Application Link">
        <span>Apply Now</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>` : '<span class="sync-subtitle">No Link Extracted</span>';

    const deadlineTimeStr = drive.deadline ? new Date(drive.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
    
    card.innerHTML = `
      <div class="drive-detail-title-row">
        <div>
          <h4>${escapeHtml(drive.company)}</h4>
          <span class="drive-detail-role">${escapeHtml(drive.role)}</span>
        </div>
        <span class="status-badge ${statusClass} inline-toggle" data-id="${drive.id}">${drive.status}</span>
      </div>
      
      <div class="drive-detail-meta-grid">
        <div class="drive-detail-meta-item">
          <span>Eligibility</span>
          <span title="${escapeHtml(drive.eligibility) || 'N/A'}">${escapeHtml(drive.eligibility) || 'N/A'}</span>
        </div>
        <div class="drive-detail-meta-item">
          <span>CTC / Stipend</span>
          <span title="${escapeHtml(drive.ctc) || 'N/A'}">${escapeHtml(drive.ctc) || 'N/A'}</span>
        </div>
        <div class="drive-detail-meta-item">
          <span>Deadline Time</span>
          <span>${deadlineTimeStr}</span>
        </div>
        <div class="drive-detail-meta-item">
          <span>Created On</span>
          <span>${new Date(drive.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div class="drive-detail-actions">
        <div class="drive-detail-links">
          ${cleanLinkButton}
        </div>
        <div class="drive-detail-buttons">
          <button class="btn outline-btn sm-btn edit-detail-btn" data-id="${drive.id}">Edit</button>
          <button class="btn outline-btn sm-btn danger-btn delete-detail-btn" data-id="${drive.id}">Delete</button>
        </div>
      </div>
    `;
    
    selectedDateDetailsBody.appendChild(card);
  });
  
  attachDetailsEventListeners();
}

/**
 * Attaches click event handlers to elements inside the details card (edit, delete, status toggle)
 */
function attachDetailsEventListeners() {
  // 1. Status toggle in details card
  document.querySelectorAll('.status-badge.inline-toggle').forEach(badge => {
    badge.addEventListener('click', async (e) => {
      const driveId = e.target.getAttribute('data-id');
      const currentStatus = e.target.textContent;
      const nextStatus = currentStatus === 'Pending' ? 'Applied' : 'Pending';
      
      try {
        await updateDriveStatus(driveId, nextStatus);
        await loadAndRenderDrives();
      } catch (err) {
        console.error("Failed to toggle status:", err);
      }
    });
  });

  // 2. Edit button click in details card
  document.querySelectorAll('.edit-detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const driveId = e.target.getAttribute('data-id');
      const drive = allDrives.find(d => d.id === driveId);
      if (drive) openModal(drive);
    });
  });

  // 3. Delete button click in details card
  document.querySelectorAll('.delete-detail-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const driveId = e.target.getAttribute('data-id');
      const drive = allDrives.find(d => d.id === driveId);
      
      if (confirm(`Are you sure you want to delete the drive for "${drive.company}"? This will clear its alarms.`)) {
        try {
          await deleteDrive(driveId);
          await loadAndRenderDrives();
        } catch (err) {
          console.error("Failed to delete drive:", err);
        }
      }
    });
  });
}

// Navigation Controls
function navigatePreviousMonth() {
  calendarMonth--;
  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }
  renderActiveView();
}

function navigateNextMonth() {
  calendarMonth++;
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }
  renderActiveView();
}

/**
 * Returns today's date formatted as a date string YYYY-MM-DD
 * @returns {string}
 */
function getTodayDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Opens modal pre-filled with a specific date
 * @param {string} datetimeString - Format: YYYY-MM-DDTHH:MM
 */
function openModalWithDate(datetimeString) {
  openModal();
  modalDeadline.value = datetimeString;
}

/**
 * Opens manual creation / editing modal popup
 * @param {Object|null} drive - If editing, details are populated
 */
function openModal(drive = null) {
  driveModal.classList.remove('hidden');
  
  if (drive) {
    // Edit mode
    modalTitle.textContent = 'Edit Campus Drive';
    modalDriveId.value = drive.id;
    modalCompany.value = drive.company;
    modalRole.value = drive.role;
    modalDeadline.value = drive.deadline ? formatDateForInput(drive.deadline) : '';
    modalStatus.value = drive.status;
    modalLink.value = drive.registrationLink || '';
    modalEligibility.value = drive.eligibility || '';
    modalCtc.value = drive.ctc || '';
  } else {
    // Create mode
    modalTitle.textContent = 'Add Campus Drive';
    modalDriveId.value = '';
    modalForm.reset();
    modalStatus.value = 'Pending';
  }
}

/**
 * Closes modal
 */
function closeModal() {
  driveModal.classList.add('hidden');
  modalForm.reset();
}

/**
 * Handles modal save click
 * @param {Event} e 
 */
async function handleModalSubmit(e) {
  e.preventDefault();

  const driveId = modalDriveId.value;
  const isEditing = !!driveId;

  const company = modalCompany.value.trim();
  const role = modalRole.value.trim();
  const deadline = modalDeadline.value;
  const status = modalStatus.value;
  const link = modalLink.value.trim();
  const eligibility = modalEligibility.value.trim();
  const ctc = modalCtc.value.trim();

  if (!company || !role || !deadline) {
    alert("Please fill in all required fields marked with *");
    return;
  }

  const existingDrive = isEditing ? allDrives.find(d => d.id === driveId) : {};
  
  const driveData = {
    ...existingDrive,
    id: driveId || undefined,
    company: company,
    role: role,
    deadline: new Date(deadline).toISOString(),
    status: status,
    registrationLink: link,
    eligibility: eligibility,
    ctc: ctc
  };

  try {
    // Save to local storage (schedules alarms automatically in background.js)
    await saveDrive(driveData);
    closeModal();
    
    // Set selected date string to this saved drive's deadline date so the calendar shows it immediately!
    const savedDeadline = new Date(driveData.deadline);
    const year = savedDeadline.getFullYear();
    const month = String(savedDeadline.getMonth() + 1).padStart(2, '0');
    const day = String(savedDeadline.getDate()).padStart(2, '0');
    selectedDateString = `${year}-${month}-${day}`;
    
    // Also shift active calendar view month if the saved deadline is in a different month
    calendarMonth = savedDeadline.getMonth();
    calendarYear = savedDeadline.getFullYear();

    await loadAndRenderDrives();
  } catch (err) {
    console.error("Failed to save drive:", err);
    alert(`Failed to save drive: ${err.message}`);
  }
}

/**
 * HTML Escaper to avoid XSS injections
 * @param {string} text 
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
