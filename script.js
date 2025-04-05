let isFetching = false;
let currentCourse = null;
let allFilteredData = [];

const courses = [
    { label: "All Subjects", value: "ALL" },
    { label: "IOT", value: "IOT" },
    { label: "Oops With Java", value: "Java" }
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

async function searchByBatch() {
    const tablesContainer = document.getElementById("tablesContainer");
    tablesContainer.innerHTML = "";
    document.getElementById("enrollSearchContainer").style.display = "none";
    allFilteredData = [];

    const batch = document.getElementById("batchSelector").value;

    const loadingDiv = document.createElement("div");
    loadingDiv.style.textAlign = "center";
    loadingDiv.style.padding = "20px";
    loadingDiv.style.color = "var(--text-light)";
    loadingDiv.textContent = "Fetching data...";
    tablesContainer.appendChild(loadingDiv);

    if (currentCourse === "ALL") {
        for (let course of courses.slice(1)) {
            await fetchAttendance(course.value, batch);
        }
    } else {
        await fetchAttendance(currentCourse, batch);
    }

    loadingDiv.remove();
    if (allFilteredData.length > 0) {
        document.getElementById("enrollSearchContainer").style.display = "flex";
    }
}

function getBatchRange(batch) {
    if (batch === "B1") {
        const baseRange = Array.from({ length: 65 }, (_, i) => i + 1); // 1 to 65
        const extras = [604, 607, 610, 611, 612]; // additional roll numbers
        return [...baseRange, ...extras];
    }
    if (batch === "B2") {
        const baseRange = Array.from({ length: 137 }, (_, i) => i + 66); // 1 to 65
        const extras = [601, 602, 603, 605, 606,608,609]; // additional roll numbers
        return [...baseRange, ...extras];
    }
    return Array.from({ length: 999 }, (_, i) => i + 1); // default all
}

async function fetchAttendance(course, batch) {
    if (isFetching) return;

    isFetching = true;
    const tablesContainer = document.getElementById("tablesContainer");
    const rollList = getBatchRange(batch); // updated logic

    try {
        const response = await fetch(`https://script.google.com/macros/s/AKfycbwgHq6afWZdxx_TP3OPEOHspCt0udn1jayl_XZn-T4oVmvg8YxeOkrWJkIesqVxZxzV/exec?sheet=${course}`);
        const { headers, data, error } = await response.json();

        if (error) throw new Error(error);

        const filteredData = data.filter(row => {
            const enroll = parseInt(row[1]);
            return !isNaN(enroll) && rollList.includes(enroll);
        });

        allFilteredData.push({ course, headers, data: filteredData });
        if (filteredData.length > 0) {
            createFilteredTable(course, headers, filteredData, tablesContainer);
        }
    } catch (error) {
        console.error(`Error fetching data for ${course}:`, error);
        alert(`An error occurred while fetching data for ${course}: ${error.message}`);
    } finally {
        isFetching = false;
    }
}

document.getElementById("searchBox").addEventListener("input", filterByEnrollment);

function filterByEnrollment() {
    const input = document.getElementById("searchBox").value.trim().toLowerCase();
    const tablesContainer = document.getElementById("tablesContainer");
    tablesContainer.innerHTML = "";

    let targets = [];

    if (input.includes(",")) {
        targets = input.split(",").map(v => parseInt(v.trim())).filter(n => !isNaN(n));
    } else if (input.includes("-")) {
        const parts = input.split("-").map(p => parseInt(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            for (let i = parts[0]; i <= parts[1]; i++) targets.push(i);
        }
    } else {
        const val = parseInt(input);
        if (!isNaN(val)) {
            targets.push(val);
        }
    }

    if (targets.length === 0) {
        allFilteredData.forEach(({ course, headers, data }) => {
            createFilteredTable(course, headers, data, tablesContainer);
        });
        return;
    }

    allFilteredData.forEach(({ course, headers, data }) => {
        const filtered = data.filter(row => {
            const enroll = parseInt(row[1]);
            return targets.includes(enroll);
        });

        if (filtered.length > 0) {
            createFilteredTable(course, headers, filtered, tablesContainer);
        }
    });
}

function createFilteredTable(title, headers, data, container) {
    const nonEmptyColumns = headers.map((_, colIndex) =>
        data.some(row => row[colIndex] && row[colIndex] !== "-")
    );

    const filteredHeaders = headers.filter((_, colIndex) => nonEmptyColumns[colIndex]);

    const subjectLabel = document.createElement("div");
    subjectLabel.className = "subject-label";
    subjectLabel.innerHTML = `<strong>${title}</strong> <small>(${getProfessorName(title)})</small>`;
    container.appendChild(subjectLabel);

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

    let totalHeld = 0, required = 0, canSkip = 0, totalLectures = 0;

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

    const table = document.createElement("table");
    table.className = "subject-table";
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const headerRow = document.createElement("tr");
    filteredHeaders.forEach(header => {
        const th = document.createElement("th");
        th.innerText = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    data.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach((cell, index) => {
            if (nonEmptyColumns[index]) {
                const td = document.createElement("td");
                td.innerText = cell || "-";
                tr.appendChild(td);
            }
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

function getProfessorName(subject) {
    const professors = {
        "IOT": "Dr. Khyati Chopra",
        "Java": "Dr. Neeta Singh"
    };
    return professors[subject] || "Faculty";
}

document.addEventListener("DOMContentLoaded", () => {
    showLandingPage();
});
