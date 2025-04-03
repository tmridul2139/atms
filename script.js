// Global variables
let attendanceData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 10;
let sections = ['A', 'B', 'C', 'D'];
let dates = [];
let totalClasses = 0;

// DOM elements
const batchFilter = document.getElementById('batch-filter');
const sectionFilter = document.getElementById('subject-filter');
const enrollmentSearch = document.getElementById('enrollment-search');
const dateFilter = document.getElementById('date-filter');
const filterBtn = document.getElementById('filter-btn');
const resetBtn = document.getElementById('reset-btn');
const searchBtn = document.getElementById('search-btn');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const attendanceTable = document.getElementById('attendance-table');
const dateGrid = document.getElementById('date-grid');
const loadingOverlay = document.getElementById('loading-overlay');

// Stats elements
const totalStudentsEl = document.getElementById('total-students');
const avgAttendanceEl = document.getElementById('avg-attendance');
const lowAttendanceEl = document.getElementById('low-attendance');
const totalClassesEl = document.getElementById('total-classes');

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Fetch initial data
    fetchAttendanceData();
    
    // Add event listeners
    filterBtn.addEventListener('click', applyFilters);
    resetBtn.addEventListener('click', resetFilters);
    searchBtn.addEventListener('click', () => {
        applyFilters();
    });
    enrollmentSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
    prevPageBtn.addEventListener('click', () => navigatePage(-1));
    nextPageBtn.addEventListener('click', () => navigatePage(1));
});

// Format date for display
function formatDate(dateStr) {
    // Convert from DD/MM/YY to readable format
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = '20' + parts[2].padStart(2, '0');
    
    return `${day}/${month}/${year}`;
}

// Fetch attendance data from Google Sheets
function fetchAttendanceData() {
    showLoading(true);
    
    // Call the Google Apps Script function to get data
    google.script.run
        .withSuccessHandler(processAttendanceData)
        .withFailureHandler(handleError)
        .getAttendanceData();
}

// Handle errors from Google Apps Script
function handleError(error) {
    console.error('Error:', error);
    showLoading(false);
    alert('Failed to load attendance data. Please try again later.');
}

// Process attendance data from Google Sheets
function processAttendanceData(data) {
    console.log("Raw data received:", data);
    
    // Check if data has the expected structure
    if (!data || !data.headers || !data.rows) {
        console.error('Invalid data format received:', data);
        showLoading(false);
        alert('Invalid data format received from the server.');
        return;
    }
    
    const { headers, rows, batches, totalClassCount } = data;
    
    // Extract date columns (which start from index 2 in your sheet)
    dates = headers.slice(2, -3); // Exclude non-date columns
    totalClasses = totalClassCount || 25; // Default to 25 if not provided
    
    // Transform sheet data into our format
    attendanceData = rows.map(row => {
        const student = {
            name: row[0],
            enrollmentNo: row[1],
            section: row[2].charAt(0), // Assuming section is the first character
            currentPercentage: parseInt(row[headers.indexOf('Current (%)')]) || 0,
            requiredClasses: parseInt(row[headers.indexOf('Required(75%)')]) || 0,
            canSkip: parseInt(row[headers.indexOf('Can Skip')]) || 0,
            attendanceByDate: {}
        };
        
        // Extract attendance for each date
        dates.forEach((date, index) => {
            student.attendanceByDate[date] = row[index + 2]; // +2 because first 2 columns are name and enrollment
        });
        
        return student;
    });
    
    // Populate date filter dropdown
    populateDateDropdown(dates);
    
    // Populate batch filter dropdown if batches were provided
    if (batches && batches.length) {
        populateDropdown(batchFilter, batches);
    }
    
    // Set total classes in the UI
    totalClassesEl.textContent = totalClasses;
    
    // Apply initial filters
    applyFilters();
    
    showLoading(false);
}

// Populate dropdown with options
function populateDropdown(selectElement, options) {
    // Keep the first option (All) and remove others
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    
    // Add new options
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        selectElement.appendChild(optionElement);
    });
}

// Populate date dropdown
function populateDateDropdown(dates) {
    const dateSelect = document.getElementById('date-filter');
    
    // Keep the first option (All) and remove others
    while (dateSelect.options.length > 1) {
        dateSelect.remove(1);
    }
    
    // Add new date options
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDate(date);
        dateSelect.appendChild(option);
    });
}

// Apply filters to data
function applyFilters() {
    const batchValue = batchFilter.value;
    const sectionValue = sectionFilter.value;
    const enrollmentValue = enrollmentSearch.value.trim().toLowerCase();
    const dateValue = dateFilter.value;
    
    // Filter data based on selected criteria
    filteredData = attendanceData.filter(student => {
        // Check batch filter if applicable
        if (batchValue !== 'all' && student.batch !== batchValue) return false;
        
        // Check section filter
        if (sectionValue !== 'all' && student.section !== sectionValue) return false;
        
        // Check enrollment search
        if (enrollmentValue && !student.enrollmentNo.toString().toLowerCase().includes(enrollmentValue) && 
            !student.name.toLowerCase().includes(enrollmentValue)) return false;
        
        return true;
    });
    
    // Reset to first page and update UI
    currentPage = 1;
    updateDashboard();
    
    // If a specific date is selected, show detailed view for that date
    if (dateValue !== 'all') {
        updateDateDetails(dateValue);
    } else {
        // Show all dates in the date grid
        updateDateGrid();
    }
}

// Reset all filters
function resetFilters() {
    batchFilter.value = 'all';
    sectionFilter.value = 'all';
    enrollmentSearch.value = '';
    dateFilter.value = 'all';
    
    // Reset to unfiltered data
    applyFilters();
}

// Navigate between pages
function navigatePage(direction) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    currentPage += direction;
    
    // Ensure page is within valid range
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    updateTable();
    updatePagination();
}

// Update the entire dashboard
function updateDashboard() {
    updateStats();
    updateChart();
    updateTable();
    updatePagination();
    updateDateGrid();
}

// Update stats section
function updateStats() {
    const totalStudents = filteredData.length;
    
    // Calculate average attendance
    const attendanceSum = filteredData.reduce((sum, student) => sum + student.currentPercentage, 0);
    const avgAttendance = totalStudents > 0 ? Math.round(attendanceSum / totalStudents) : 0;
    
    // Count students with low attendance (below 75%)
    const lowAttendanceCount = filteredData.filter(student => student.currentPercentage < 75).length;
    
    // Update UI
    totalStudentsEl.textContent = totalStudents;
    avgAttendanceEl.textContent = `${avgAttendance}%`;
    lowAttendanceEl.textContent = lowAttendanceCount;
}

// Update attendance chart
function updateChart() {
    const ctx = document.getElementById('attendance-chart').getContext('2d');
    
    // Group data by attendance percentage ranges
    const ranges = [
        { min: 0, max: 50, label: '0-50%' },
        { min: 50, max: 75, label: '50-75%' },
        { min: 75, max: 90, label: '75-90%' },
        { min: 90, max: 100, label: '90-100%' }
    ];
    
    const counts = ranges.map(range => {
        return filteredData.filter(student => 
            student.currentPercentage >= range.min && 
            student.currentPercentage <= range.max
        ).length;
    });
    
    // Define colors for the chart
    const colors = [
        'rgba(220, 53, 69, 0.7)', // red - danger
        'rgba(255, 193, 7, 0.7)', // yellow - warning
        'rgba(40, 167, 69, 0.7)', // green - success
        'rgba(0, 123, 255, 0.7)'  // blue - primary
    ];
    
    // Destroy existing chart if it exists
    if (window.attendanceChart) {
        window.attendanceChart.destroy();
    }
    
    // Create new chart
    window.attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ranges.map(r => r.label),
            datasets: [{
                label: 'Number of Students',
                data: counts,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Students'
                    },
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Attendance Percentage'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw} students`;
                        }
                    }
                }
            }
        }
    });
}

// Update attendance table
function updateTable() {
    const tbody = attendanceTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.textContent = 'No attendance data found';
        cell.colSpan = 7;
        cell.style.textAlign = 'center';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }
    
    pageData.forEach(student => {
        const row = document.createElement('tr');
        
        // Determine status based on attendance percentage
        let status = '';
        let statusClass = '';
        
        if (student.currentPercentage >= 90) {
            status = 'Excellent';
            statusClass = 'status-good';
        } else if (student.currentPercentage >= 75) {
            status = 'Good';
            statusClass = 'status-good';
        } else if (student.currentPercentage >= 60) {
            status = 'At Risk';
            statusClass = 'status-warning';
        } else {
            status = 'Critical';
            statusClass = 'status-danger';
        }
        
        // Add cells
        const cells = [
            student.name,
            student.enrollmentNo,
            student.section,
            `${student.currentPercentage}%`,
            student.requiredClasses,
            student.canSkip,
            status
        ];
        
        cells.forEach((cellData, index) => {
            const cell = document.createElement('td');
            
            if (index === 6) { // Status column
                const statusSpan = document.createElement('span');
                statusSpan.className = `status ${statusClass}`;
                statusSpan.textContent = cellData;
                cell.appendChild(statusSpan);
            } else {
                cell.textContent = cellData;
                
                // Highlight attendance percentage
                if (index === 3) { // Current percentage column
                    const percentage = parseInt(cellData);
                    if (percentage < 75) {
                        cell.style.color = 'var(--danger-color)';
                        cell.style.fontWeight = 'bold';
                    } else if (percentage >= 90) {
                        cell.style.color = 'var(--success-color)';
                        cell.style.fontWeight = 'bold';
                    }
                }
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// Update date grid with attendance information
function updateDateGrid() {
    dateGrid.innerHTML = '';
    
    if (dates.length === 0) {
        const message = document.createElement('p');
        message.textContent = 'No date information available';
        message.style.textAlign = 'center';
        message.style.gridColumn = '1 / -1';
        dateGrid.appendChild(message);
        return;
    }
    
    // For each date, create a card with attendance info
    dates.forEach(date => {
        const presentCount = filteredData.filter(student => 
            student.attendanceByDate[date] === 'P' || 
            student.attendanceByDate[date] === 'p'
        ).length;
        
        const absentCount = filteredData.filter(student => 
            student.attendanceByDate[date] === 'A' || 
            student.attendanceByDate[date] === 'a'
        ).length;
        
        const totalCount = filteredData.length;
        const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        
        const dateCard = document.createElement('div');
        dateCard.className = 'date-card';
        
        dateCard.innerHTML = `
            <div class="date-label">${formatDate(date)}</div>
            <div class="date-value">${percentage}%</div>
            <div class="date-details">
                <small>Present: ${presentCount} | Absent: ${absentCount}</small>
            </div>
        `;
        
        // Add color indicator based on attendance percentage
        if (percentage < 60) {
            dateCard.style.borderLeft = '4px solid var(--danger-color)';
        } else if (percentage < 75) {
            dateCard.style.borderLeft = '4px solid var(--warning-color)';
        } else {
            dateCard.style.borderLeft = '4px solid var(--success-color)';
        }
        
        // Add click event to show details for this date
        dateCard.addEventListener('click', () => {
            dateFilter.value = date;
            applyFilters();
        });
        
        dateGrid.appendChild(dateCard);
    });
}

// Show detailed information for a specific date
function updateDateDetails(date) {
    dateGrid.innerHTML = '';
    
    // Create header for the detail view
    const header = document.createElement('div');
    header.className = 'date-detail-header';
    header.style.gridColumn = '1 / -1';
    header.style.marginBottom = '15px';
    header.innerHTML = `
        <h3>Attendance for ${formatDate(date)}</h3>
        <button id="back-to-all" class="btn secondary">
            <i class="fas fa-arrow-left"></i> Back to All Dates
        </button>
    `;
    
    // Add event listener to back button
    header.querySelector('#back-to-all').addEventListener('click', () => {
        dateFilter.value = 'all';
        applyFilters();