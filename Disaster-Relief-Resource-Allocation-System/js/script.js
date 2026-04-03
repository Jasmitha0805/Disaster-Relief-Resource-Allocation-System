const STORAGE_KEYS = {
    reports: "reports",
    requests: "requests",
    theme: "relief-theme",
    users: "relief-users",
    session: "relief-session"
};

const appState = {
    requestChart: null,
    reportChart: null
};

function getStoredData(key) {
    try {
        const rawValue = localStorage.getItem(key);
        const parsed = rawValue ? JSON.parse(rawValue) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn(`Invalid JSON found in localStorage for key: ${key}. Resetting to empty array.`, error);
        localStorage.setItem(key, JSON.stringify([]));
        return [];
    }
}

function setStoredData(key, payload) {
    localStorage.setItem(key, JSON.stringify(payload));
}

function getUsers() {
    return getStoredData(STORAGE_KEYS.users);
}

function setSession(user) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({
        name: user.name,
        email: user.email
    }));
}

function getSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.session);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function setAppAccess(isAuthenticated) {
    const authGate = document.getElementById("authGate");
    const appShell = document.getElementById("appShell");

    if (isAuthenticated) {
        authGate.classList.add("hidden");
        appShell.classList.remove("hidden");
        return;
    }

    appShell.classList.add("hidden");
    authGate.classList.remove("hidden");
}

function parseLocalList(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
        console.warn(`Failed to parse localStorage key: ${key}. Falling back to empty array.`, error);
        return [];
    }
}

function safeText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));

    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add("active");
    }

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.page === pageId);
    });

    if (pageId === "dashboard") {
        loadDashboard();
    }
}

function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2600);
}

function showSuccessMessage(id) {
    const el = document.getElementById(id);
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1800);
}

function clearErrors(errorIds) {
    errorIds.forEach(id => {
        const errorEl = document.getElementById(id);
        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function validateRequired(value, errorId, label) {
    const errorEl = document.getElementById(errorId);
    if (!value.trim()) {
        errorEl.textContent = `${label} is required.`;
        return false;
    }

    errorEl.textContent = "";
    return true;
}

function renderStats(reports, requests) {
    document.getElementById("totalReports").textContent = reports.length;
    document.getElementById("totalRequests").textContent = requests.length;
    document.getElementById("activeCases").textContent = reports.length + requests.length;
}

function renderCharts(reports, requests) {
    const requestCanvas = document.getElementById("requestChart");
    const reportCanvas = document.getElementById("reportChart");

    if (!requestCanvas || !reportCanvas) {
        return;
    }

    requestCanvas.style.height = "180px";
    requestCanvas.style.width = "100%";
    reportCanvas.style.height = "180px";
    reportCanvas.style.width = "100%";

    const labels = ["Food", "Water", "Medical", "Shelter"];
    const data = labels.map(label => requests.filter(item => item.resourceType === label).length);

    if (appState.requestChart) {
        appState.requestChart.destroy();
    }

    appState.requestChart = new Chart(requestCanvas, {
        type: "pie",
        data: {
            labels,
            datasets: [{
                label: "Resource Requests",
                data,
                borderRadius: 8,
                backgroundColor: ["#1e4f86", "#3772b5", "#1f8470", "#4ca897"]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || "";
                            const value = context.raw || 0;
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        }
    });

    const reportTypeCounts = reports.reduce((acc, report) => {
        const type = (report.type || "Unspecified").trim() || "Unspecified";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    const reportLabels = Object.keys(reportTypeCounts).length
        ? Object.keys(reportTypeCounts)
        : ["No Reports"];

    const reportData = Object.keys(reportTypeCounts).length
        ? Object.values(reportTypeCounts)
        : [1];

    if (appState.reportChart) {
        appState.reportChart.destroy();
    }

    appState.reportChart = new Chart(reportCanvas, {
        type: "pie",
        data: {
            labels: reportLabels,
            datasets: [{
                label: "Disaster Reports",
                data: reportData,
                backgroundColor: [
                    "#1e4f86",
                    "#2f8de0",
                    "#1f8470",
                    "#4ca897",
                    "#7aa9d8",
                    "#88c7bc"
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || "";
                            const value = context.raw || 0;
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
}

function createReportCard(report) {
    return `
        <article class="data-card">
            <strong><i class="fa-solid fa-triangle-exclamation"></i> Incident Report</strong><br>
            <strong>Location:</strong> ${safeText(report.location)}<br>
            <strong>Type:</strong> ${safeText(report.type)}<br>
            <strong>Details:</strong> ${safeText(report.details)}
        </article>
    `;
}

function createRequestCard(request) {
    const priorityClass = request.priority ? request.priority.toLowerCase() : "low";
    return `
        <article class="data-card">
            <strong><i class="fa-solid fa-hand-holding-medical"></i> Help Request</strong><br>
            <strong>Name:</strong> ${safeText(request.name)}<br>
            <strong>Need:</strong> ${safeText(request.need)}<br>
            <strong>Resource:</strong> ${safeText(request.resourceType)}<br>
            <strong>Location:</strong> ${safeText(request.area)}<br>
            <span class="tag ${priorityClass}">${safeText(request.priority || "Low")}</span>
        </article>
    `;
}

function loadDashboard() {
    const container = document.getElementById("dataContainer");
    const emptyState = document.getElementById("emptyState");
    const priorityFilter = document.getElementById("dashboardFilter").value;

    const reports = parseLocalList("reports");
    const requests = parseLocalList("requests");

    console.log("Dashboard reports retrieved:", reports);
    console.log("Dashboard requests retrieved:", requests);

    renderStats(reports, requests);
    renderCharts(reports, requests);

    const filteredRequests = priorityFilter === "all"
        ? requests
        : requests.filter(item => item.priority === priorityFilter);

    const reportCards = reports.map(createReportCard).join("");
    const requestCards = filteredRequests.map(createRequestCard).join("");

    const reportSection = reportCards
        ? `
            <section>
                <h4 class="feed-title"><i class="fa-solid fa-triangle-exclamation"></i> Disaster Reports</h4>
                ${reportCards}
            </section>
        `
        : "";

    const requestSection = requestCards
        ? `
            <section>
                <h4 class="feed-title"><i class="fa-solid fa-hand-holding-medical"></i> Help Requests</h4>
                ${requestCards}
            </section>
        `
        : "";

    if (!reportCards && !requestCards) {
        emptyState.classList.remove("hidden");
        container.innerHTML = "";
        return;
    }

    emptyState.classList.add("hidden");
    container.innerHTML = `${reportSection}${requestSection}`;
}

function attachNavigation() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => showPage(btn.dataset.page));
    });

    document.querySelectorAll("[data-page-target]").forEach(btn => {
        btn.addEventListener("click", () => showPage(btn.dataset.pageTarget));
    });
}

function attachThemeToggle() {
    const themeToggle = document.getElementById("themeToggle");
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "light";

    document.body.classList.toggle("dark", savedTheme === "dark");
    themeToggle.innerHTML = savedTheme === "dark"
        ? '<i class="fa-solid fa-sun"></i><span>Light Mode</span>'
        : '<i class="fa-solid fa-moon"></i><span>Dark Mode</span>';

    themeToggle.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark");
        localStorage.setItem(STORAGE_KEYS.theme, isDark ? "dark" : "light");
        themeToggle.innerHTML = isDark
            ? '<i class="fa-solid fa-sun"></i><span>Light Mode</span>'
            : '<i class="fa-solid fa-moon"></i><span>Dark Mode</span>';
    });
}

function attachReportForm() {
    const reportForm = document.getElementById("reportForm");

    reportForm.addEventListener("submit", event => {
        event.preventDefault();

        clearErrors(["locationError", "typeError", "detailsError"]);

        const location = document.getElementById("location").value;
        const type = document.getElementById("type").value;
        const details = document.getElementById("details").value;

        const isValid = [
            validateRequired(location, "locationError", "Location"),
            validateRequired(type, "typeError", "Disaster type"),
            validateRequired(details, "detailsError", "Incident details")
        ].every(Boolean);

        if (!isValid) {
            showToast("Please correct the highlighted fields.", "error");
            return;
        }

        const reports = getStoredData(STORAGE_KEYS.reports);
        const newReport = {
            location: location.trim(),
            type: type.trim(),
            details: details.trim()
        };

        reports.push(newReport);
        setStoredData(STORAGE_KEYS.reports, reports);

        console.log("Report saved to localStorage:", newReport);
        console.log("Updated reports array:", reports);

        reportForm.reset();
        showSuccessMessage("reportSuccess");
        showToast("Disaster report submitted.", "success");

        // Keep stats and feed in sync if user is currently on dashboard.
        if (document.getElementById("dashboard").classList.contains("active")) {
            loadDashboard();
        }
    });
}

function attachHelpForm() {
    const helpForm = document.getElementById("helpForm");

    helpForm.addEventListener("submit", event => {
        event.preventDefault();

        clearErrors(["nameError", "resourceTypeError", "priorityError", "needError", "areaError"]);

        const name = document.getElementById("name").value;
        const resourceType = document.getElementById("resourceType").value;
        const priority = document.getElementById("priority").value;
        const need = document.getElementById("need").value;
        const area = document.getElementById("area").value;

        const isValid = [
            validateRequired(name, "nameError", "Contact name"),
            validateRequired(resourceType, "resourceTypeError", "Resource type"),
            validateRequired(priority, "priorityError", "Priority"),
            validateRequired(need, "needError", "Specific need"),
            validateRequired(area, "areaError", "Affected area")
        ].every(Boolean);

        if (!isValid) {
            showToast("Please complete all required request fields.", "error");
            return;
        }

        const requests = getStoredData(STORAGE_KEYS.requests);
        requests.push({
            name: name.trim(),
            resourceType,
            priority,
            need: need.trim(),
            area: area.trim()
        });
        setStoredData(STORAGE_KEYS.requests, requests);

        helpForm.reset();
        showSuccessMessage("helpSuccess");
        showToast("Help request submitted.", "success");
    });
}

function attachDashboardFilter() {
    const filterSelect = document.getElementById("dashboardFilter");
    filterSelect.addEventListener("change", loadDashboard);
}

function attachLoader() {
    const loader = document.getElementById("loader");
    window.addEventListener("load", () => {
        setTimeout(() => {
            loader.classList.add("hide");
        }, 650);
    });
}

function attachAuth() {
    const loginTab = document.getElementById("loginTab");
    const signupTab = document.getElementById("signupTab");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const loginError = document.getElementById("loginError");
    const signupError = document.getElementById("signupError");
    const logoutBtn = document.getElementById("logoutBtn");

    function showLoginTab() {
        loginTab.classList.add("active");
        signupTab.classList.remove("active");
        loginForm.classList.remove("hidden");
        signupForm.classList.add("hidden");
        loginError.textContent = "";
        signupError.textContent = "";
    }

    function showSignupTab() {
        signupTab.classList.add("active");
        loginTab.classList.remove("active");
        signupForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
        loginError.textContent = "";
        signupError.textContent = "";
    }

    loginTab.addEventListener("click", showLoginTab);
    signupTab.addEventListener("click", showSignupTab);

    signupForm.addEventListener("submit", event => {
        event.preventDefault();

        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim().toLowerCase();
        const password = document.getElementById("signupPassword").value;

        if (!name || !email || !password) {
            signupError.textContent = "All fields are required.";
            return;
        }

        if (password.length < 6) {
            signupError.textContent = "Password must be at least 6 characters.";
            return;
        }

        const users = getUsers();
        const alreadyExists = users.some(user => user.email === email);

        if (alreadyExists) {
            signupError.textContent = "An account already exists with this email.";
            return;
        }

        const newUser = { name, email, password };
        users.push(newUser);
        setStoredData(STORAGE_KEYS.users, users);

        showToast("Account created. Please login.", "success");
        signupForm.reset();
        showLoginTab();
    });

    loginForm.addEventListener("submit", event => {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim().toLowerCase();
        const password = document.getElementById("loginPassword").value;

        if (!email || !password) {
            loginError.textContent = "Email and password are required.";
            return;
        }

        const users = getUsers();
        const user = users.find(entry => entry.email === email && entry.password === password);

        if (!user) {
            loginError.textContent = "Invalid email or password.";
            return;
        }

        setSession(user);
        setAppAccess(true);
        showToast("Login successful.", "success");
    });

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEYS.session);
        setAppAccess(false);
        showLoginTab();
        showPage("home");
        showToast("Logged out successfully.", "success");
    });

    const session = getSession();
    setAppAccess(Boolean(session));
}

function init() {
    attachAuth();
    attachNavigation();
    attachThemeToggle();
    attachReportForm();
    attachHelpForm();
    attachDashboardFilter();
    attachLoader();

    // Expose for compatibility with any inline calls.
    window.showPage = showPage;
}

init();
