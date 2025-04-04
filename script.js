let isFetching = false;
let currentCourse = null;
const courses = [
    { label: "All Subjects", value: "ALL" },
    { label: "IOT", value: "IOT" },
    { label: "DS", value: "DS" }
];

function showDashboard() {
    document.getElementById("landingPage").style.display = "none";
    document.getElementById("dashboardPage").style.display = "block";
    
    if (!currentCourse) {
        initializeCourseTabs();
    }
}

function showLandingPage() {
    document.getElementById("landingPage").style.display = "flex";
    document.getElementById("dashboardPage").style.display = "none";
}

function initializeCourseTabs() {
    const courseTabs = document.getElementById("courseTabs");
    courseTabs.innerHTML = "";

    courses.forEach(course => {
        const tab = document.createElement("div");
        tab.className = "course-tab";
        tab.textContent = course.label;
        tab.onclick = () => {
            document.querySelectorAll(".course-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            currentCourse = course.value;
        };
        courseTabs.appendChild(tab);
    });

    courseTabs.firstChild?.classList.add("active");
    currentCourse = courses[0].value;
}

async function searchByEnrollment() {
    if (!currentCourse) return;

    const tablesContainer = document.getElementById("tablesContainer");
    tablesContainer.innerHTML = "";

    const loadingDiv = document.createElement("div");
    loadingDiv.style.textAlign = "center";
    loadingDiv.style.padding = "20px";
    loadingDiv.style.color = "var(--text-light)";
    loadingDiv.textContent = "Fetching data...";
    tablesContainer.appendChild(loadingDiv);

    if (currentCourse === "ALL") {
        try {
            for (let course of courses.slice(1)) {
                await fetchAttendance(course.value);
            }
        } catch (error) {
            console.error("Error fetching all subjects:", error);
            alert("An error occurred while fetching data for all subjects.");
        }
    } else {
        await fetchAttendance(currentCourse);
    }

    loadingDiv.remove();
}

async function fetchAttendance(course) {
    if (isFetching) return;

    isFetching = true;
    const tablesContainer = document.getElementById("tablesContainer");

    try {
        const searchValue = document.getElementById("searchBox").value.trim().toLowerCase();

        const response = await fetch(`https://script.google.com/macros/s/AKfycbwgHq6afWZdxx_TP3OPEOHspCt0udn1jayl_XZn-T4oVmvg8YxeOkrWJkIesqVxZxzV/exec?sheet=${course}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { headers, data, error } = await response.json();

        if (error) throw new Error(error);
        if (!Array.isArray(data) || !Array.isArray(headers)) throw new Error("Invalid data format received from server");

        const filteredData = data.filter(row => {
            if (!row || !Array.isArray(row)) return false;
            const name = row[0]?.toString().trim();
            const enrollmentNumber = row[1]?.toString().toLowerCase() || '';
            return name && enrollmentNumber && (!searchValue || enrollmentNumber.includes(searchValue));
        });

        if (filteredData.length > 0) {
            createFilteredTable(course, headers, filteredData, tablesContainer);
        } else if (currentCourse !== "ALL") {
            alert(`No matching records found for ${course}.`);
        }
    } catch (error) {
        console.error(`Error fetching data for ${course}:`, error);
        alert(`An error occurred while fetching data for ${course}: ${error.message}`);
    } finally {
        isFetching = false;
    }
}

function createFilteredTable(title, headers, data, container) {
    const nonEmptyColumns = headers.map((_, colIndex) =>
        data.some(row => row[colIndex] && row[colIndex] !== "-")
    );

    const filteredHeaders = headers.filter((_, colIndex) => nonEmptyColumns[colIndex]);

    const subjectLabel = document.createElement("div");
    subjectLabel.className = "subject-label";
    subjectLabel.innerHTML = `<strong>${title}</strong>`;
    container.appendChild(subjectLabel);

    // ✅ Find the valid row with proper required & canSkip values
    let validRow = null;
    const requiredIndex = headers.length - 2;
    const canSkipIndex = headers.length - 1;

    for (let row of data) {
        const req = parseInt(row[requiredIndex]);
        const skip = parseInt(row[canSkipIndex]);
        if (!isNaN(req) && req !== -1 && !isNaN(skip)) {
            validRow = row;
            break;
        }
    }

    let totalHeld = 0;
    let required = 0;
    let canSkip = 0;
    let totalLectures = 0;

    if (validRow) {
        required = parseInt(validRow[requiredIndex]) || 0;
        canSkip = parseInt(validRow[canSkipIndex]) || 0;

        for (let i = 2; i < requiredIndex; i++) {
            const val = (validRow[i] || "").toString().trim().toUpperCase();
            if (val === "P" || val === "A") totalHeld++;
        }

        totalLectures = totalHeld + required + canSkip;
    }

    const lectureInfo = document.createElement("div");
    lectureInfo.className = "lecture-info";
    lectureInfo.innerHTML = `
        <span>✅ <strong>Lectures Held:</strong> ${totalHeld}</span> |
        <span>📊 <strong>Total Lectures:</strong> ${totalLectures}</span>
    `;
    container.appendChild(lectureInfo);

    // Create the actual table
    const table = document.createElement("table");
    table.className = "subject-table";
    const tableHead = document.createElement("thead");
    const tableBody = document.createElement("tbody");

    const headerRow = document.createElement("tr");
    filteredHeaders.forEach(header => {
        const th = document.createElement("th");
        th.innerText = header;
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);
    table.appendChild(tableHead);

    data.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach((cell, colIndex) => {
            if (nonEmptyColumns[colIndex]) {
                const td = document.createElement("td");
                td.innerText = cell || "-";
                tr.appendChild(td);
            }
        });
        tableBody.appendChild(tr);
    });

    table.appendChild(tableBody);
    container.appendChild(table);
}





document.addEventListener("DOMContentLoaded", () => {
    showLandingPage();
});
