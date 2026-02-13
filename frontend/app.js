const API_URL = "http://localhost:5000/api";
let token = localStorage.getItem("token");
let currentUser = JSON.parse(localStorage.getItem("user") || "null");
let categoryChart = null;
let timeChart = null;
let selectedFile = null;

// Initialize
if (token && currentUser) {
  showDashboard();
}

// ========== AUTH FUNCTIONS ==========
function showLogin() {
  document.getElementById("login-form").style.display = "block";
  document.getElementById("register-form").style.display = "none";
  document.getElementById("auth-error").textContent = "";
}

function showRegister() {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "block";
  document.getElementById("auth-error").textContent = "";
}

async function login() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    document.getElementById("auth-error").textContent =
      "Please fill all fields";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(currentUser));
    showDashboard();
  } catch (error) {
    document.getElementById("auth-error").textContent = error.message;
  }
}

async function register() {
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  if (!name || !email || !password) {
    document.getElementById("auth-error").textContent =
      "Please fill all fields";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(currentUser));
    showDashboard();
  } catch (error) {
    document.getElementById("auth-error").textContent = error.message;
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  document.getElementById("auth-screen").style.display = "block";
  document.getElementById("dashboard-screen").style.display = "none";
  showLogin();
}

function showDashboard() {
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("dashboard-screen").style.display = "block";
  document.getElementById("user-name").textContent =
    currentUser?.name || "User";
  loadTransactions();
  setupUpload();
}

// ========== FILE UPLOAD ==========
function setupUpload() {
  const uploadArea = document.getElementById("upload-area");
  const fileInput = document.getElementById("file-input");

  uploadArea.addEventListener("click", () => fileInput.click());

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];

    if (file) {
      const allowedExtensions = [".csv", ".xlsx", ".xls"];
      const fileExt = file.name
        .substring(file.name.lastIndexOf("."))
        .toLowerCase();

      if (allowedExtensions.includes(fileExt)) {
        handleFileSelect(file);
      } else {
        alert("Please upload a CSV or Excel file");
      }
    }
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  });
}

// Find the handleFileSelect function
function handleFileSelect(file) {
  selectedFile = file;

  // Check file type
  const allowedExtensions = [".csv", ".xlsx", ".xls"];
  const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  if (!allowedExtensions.includes(fileExt)) {
    alert("Please upload a CSV or Excel file");
    return;
  }

  // Display file info
  let fileType = fileExt === ".csv" ? "CSV" : "Excel";

  document.getElementById("upload-area").innerHTML = `
    <div class="upload-icon">✅</div>
    <p><strong>${file.name}</strong></p>
    <p class="file-info">Size: ${(file.size / 1024).toFixed(
      2
    )} KB | Type: ${fileType}</p>
  `;
  document.getElementById("upload-btn").style.display = "block";
}

async function uploadCSV() {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append("file", selectedFile);

  showLoading();
  document.getElementById("upload-status").innerHTML =
    '<p class="loading">⏳ Uploading and categorizing with AI...</p>';
  document.getElementById("upload-btn").disabled = true;

  try {
    const response = await fetch(`${API_URL}/transactions/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    hideLoading();
    document.getElementById(
      "upload-status"
    ).innerHTML = `<p style="color: green;">✅ ${data.count} transactions uploaded and categorized successfully!</p>`;
    selectedFile = null;
    document.getElementById("upload-area").innerHTML = `
      <div class="upload-icon">📁</div>
      <p>Drag & Drop CSV file here or click to browse</p>
      <p class="file-info">Maximum file size: 10MB</p>
    `;
    document.getElementById("upload-btn").style.display = "none";

    loadTransactions();
  } catch (error) {
    hideLoading();
    document.getElementById(
      "upload-status"
    ).innerHTML = `<p style="color: red;">❌ ${error.message}</p>`;
  } finally {
    document.getElementById("upload-btn").disabled = false;
  }
}

// ========== TRANSACTIONS ==========
async function loadTransactions(startDate = null, endDate = null) {
  try {
    let url = `${API_URL}/transactions`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const transactions = await response.json();
    displayTransactions(transactions);
    loadSummary(startDate, endDate);
  } catch (error) {
    console.error("Error loading transactions:", error);
  }
}

function displayTransactions(transactions) {
  const tbody = document.getElementById("transactions-body");

  if (transactions.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="no-data">No transactions found. Upload a CSV to get started!</td></tr>';
    return;
  }

  tbody.innerHTML = transactions
    .map(
      (t) => `
    <tr>
      <td>${new Date(t.date).toLocaleDateString("en-IN")}</td>
      <td>${t.description}</td>
      <td><span style="background: #e0e0e0; padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">${
        t.category
      }</span></td>
      <td class="amount-${t.type}">₹${t.amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</td>
      <td><span style="background: ${
        t.type === "credit" ? "#4caf50" : "#f44336"
      }; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${t.type.toUpperCase()}</span></td>
    </tr>
  `
    )
    .join("");
}

// ========== SUMMARY & CHARTS ==========
async function loadSummary(startDate = null, endDate = null) {
  try {
    let url = `${API_URL}/transactions/summary`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const summary = await response.json();
    displaySummary(summary);
    displayCharts(summary);
  } catch (error) {
    console.error("Error loading summary:", error);
  }
}

function displaySummary(summary) {
  const container = document.getElementById("summary-cards");
  const totalSpent = summary.reduce((sum, item) => sum + item.total, 0);
  const totalTransactions = summary.reduce((sum, item) => sum + item.count, 0);

  container.innerHTML = `
    <div class="summary-card">
      <h3>Total Spent</h3>
      <p>₹${totalSpent.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}</p>
    </div>
    <div class="summary-card">
      <h3>Categories</h3>
      <p>${summary.length}</p>
    </div>
    <div class="summary-card">
      <h3>Transactions</h3>
      <p>${totalTransactions}</p>
    </div>
    <div class="summary-card">
      <h3>Top Category</h3>
      <p>${summary[0]?._id || "N/A"}</p>
    </div>
  `;
}

function displayCharts(summary) {
  if (summary.length === 0) return;

  // Category Pie Chart
  const categoryCtx = document
    .getElementById("category-chart")
    .getContext("2d");

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(categoryCtx, {
    type: "pie",
    data: {
      labels: summary.map((s) => s._id),
      datasets: [
        {
          data: summary.map((s) => s.total),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#FF6384",
            "#C9CBCF",
            "#4BC0C0",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 15,
            font: { size: 12 },
          },
        },
      },
    },
  });

  // Category Bar Chart
  const timeCtx = document.getElementById("time-chart").getContext("2d");

  if (timeChart) timeChart.destroy();

  timeChart = new Chart(timeCtx, {
    type: "bar",
    data: {
      labels: summary.map((s) => s._id),
      datasets: [
        {
          label: "Amount Spent (₹)",
          data: summary.map((s) => s.total),
          backgroundColor: "#667eea",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "₹" + value.toLocaleString("en-IN");
            },
          },
        },
      },
    },
  });
}

// ========== FILTERS ==========
function filterTransactions() {
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;

  if (startDate && endDate) {
    loadTransactions(startDate, endDate);
  } else {
    alert("Please select both start and end dates");
  }
}

function clearFilter() {
  document.getElementById("start-date").value = "";
  document.getElementById("end-date").value = "";
  loadTransactions();
}

// ========== EXPORT ==========
async function exportCSV() {
  try {
    const response = await fetch(`${API_URL}/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const transactions = await response.json();

    if (transactions.length === 0) {
      alert("No transactions to export");
      return;
    }
    const csv = [
      ["Date", "Description", "Category", "Amount", "Type"],
      ...transactions.map((t) => [
        new Date(t.date).toLocaleDateString("en-IN"),
        t.description,
        t.category,
        t.amount,
        t.type,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense_report_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert("Error exporting CSV: " + error.message);
  }
}

async function exportPDF() {
  try {
    const response = await fetch(`${API_URL}/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const transactions = await response.json();

    if (transactions.length === 0) {
      alert("No transactions to export");
      return;
    }

    // Simple HTML to PDF conversion
    const printWindow = window.open("", "", "width=800,height=600");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #667eea; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #667eea; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>💰 Expense Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString("en-IN")}</p>
        <p><strong>User:</strong> ${currentUser.name}</p>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map(
                (t) => `
              <tr>
                <td>${new Date(t.date).toLocaleDateString("en-IN")}</td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td>₹${t.amount.toFixed(2)}</td>
                <td>${t.type.toUpperCase()}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <div class="total">
          Total Transactions: ${transactions.length}<br>
          Total Amount: ₹${transactions
            .reduce((sum, t) => sum + t.amount, 0)
            .toFixed(2)}
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  } catch (error) {
    alert("Error exporting PDF: " + error.message);
  }
}

// ========== DELETE ==========
async function deleteAllTransactions() {
  if (
    !confirm(
      "⚠️ Are you sure you want to delete ALL transactions? This cannot be undone!"
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/transactions/all`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    alert(data.message);
    loadTransactions();
  } catch (error) {
    alert("Error deleting transactions: " + error.message);
  }
}

// ========== LOADING OVERLAY ==========
function showLoading() {
  document.getElementById("loading-overlay").style.display = "flex";
}

function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
}

// Allow Enter key to submit forms
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("login-email")
    ?.addEventListener("keypress", function (e) {
      if (e.key === "Enter") login();
    });
  document
    .getElementById("login-password")
    ?.addEventListener("keypress", function (e) {
      if (e.key === "Enter") login();
    });
  document
    .getElementById("register-password")
    ?.addEventListener("keypress", function (e) {
      if (e.key === "Enter") register();
    });
});
