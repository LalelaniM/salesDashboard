
const todayDate = document.getElementById("todayDate");
const showReportBtn = document.getElementById("showReportBtn");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const reportContainer = document.getElementById("reportContainer");

// Display today's date
const today = new Date();

todayDate.textContent = today.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric"
});

// Button click
showReportBtn.addEventListener("click", loadReport);

async function loadReport() {

    loading.classList.remove("hidden");
    error.classList.add("hidden");

    showReportBtn.disabled = true;

    reportContainer.innerHTML = "";

    try {

        const response = await fetch("/api/report");

if (!response.ok) {
    throw new Error("Unable to generate report.");
}

const reports = await response.json();

buildReports(
    reports.productReport,
    reports.cashierReport
);

// Update the dashboard after the tables are built
updateDashboard(
    reports.productReport,
    reports.cashierReport
);

    }
    catch (err) {

        error.textContent = err.message;
        error.classList.remove("hidden");

    }
    finally {

        loading.classList.add("hidden");
        showReportBtn.disabled = false;

    }

}

/*
-------------------------------------
    CSV PARSER

    Handles quoted fields correctly.
-------------------------------------
*/

function parseCSV(text) {

    const rows = [];

    let row = [];

    let value = "";

    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const c = text[i];

        if (c === '"') {

            if (inQuotes && text[i + 1] === '"') {

                value += '"';

                i++;

            }
            else {

                inQuotes = !inQuotes;

            }

        }

        else if (c === "," && !inQuotes) {

            row.push(value);

            value = "";

        }

        else if ((c === "\n" || c === "\r") && !inQuotes) {

            if (value !== "" || row.length > 0) {

                row.push(value);

                rows.push(row);

            }

            row = [];

            value = "";

            if (c === "\r" && text[i + 1] === "\n") {
                i++;
            }

        }

        else {

            value += c;

        }

    }

    if (value !== "" || row.length > 0) {

        row.push(value);

        rows.push(row);

    }

    return rows;

}

/*
-------------------------------------
    BUILD HTML TABLE
-------------------------------------
*/

function buildReports(productCSV, cashierCSV) {

    reportContainer.innerHTML = "";

    reportContainer.appendChild(

        createTableSection(
            "Sales By Product",
            productCSV,
            [
                "PRODUCT_ID",
                "SERVICE_ID",
                "EAN_CODE",
                "UNIT",
                "NET_SALES_TOTAL",
                "DISCOUNT_TOTAL",
                "DISCOUNT_PERCENTAGE"
            ]
        )

    );

    reportContainer.appendChild(

        createTableSection(
            "Sales By Cashier",
            cashierCSV,
            [
                "PRODUCT_ID",
                "SERVICE_ID",
                "EAN_CODE",
                "UNIT",
                "NET_SALES_TOTAL",
                "DISCOUNT_TOTAL",
                "DISCOUNT_PERCENTAGE"
            ]
        )

    );

}

function createTableSection(title, csv, hiddenColumns) {

    const section = document.createElement("div");

    section.style.marginTop = "40px";

    const heading = document.createElement("h2");

    heading.textContent = title;

    heading.style.marginBottom = "15px";

    heading.style.color = "#0066cc";

    section.appendChild(heading);

    const rows = parseCSV(csv);

    if (rows.length === 0) {

        section.innerHTML += "<p>No data available.</p>";

        return section;

    }

    const headers = rows[0];

    const data = rows.slice(1);

    const visibleColumns = headers
        .map((header, index) => ({
            header: header.replace(/"/g, "").trim(),
            index
        }))
        .filter(col => !hiddenColumns.includes(col.header));

    let html = '<div class="table-wrapper">';

    html += "<table>";

    html += "<thead><tr>";

    visibleColumns.forEach(col => {

        html += `<th>${col.header}</th>`;

    });

    html += "</tr></thead>";

    html += "<tbody>";

    data.forEach(row => {
        if (row.some(cell => cell.trim().toUpperCase() === "TOTAL")) {
    return;
}

        if (row.length === 1 && row[0] === "") return;

        html += "<tr>";

        visibleColumns.forEach(col => {

            const value = row[col.index] || "";

            html += `<td>${value.replace(/"/g, "")}</td>`;

        });

        html += "</tr>";

    });

    html += "</tbody>";

    html += "</table>";

    html += "</div>";

    section.innerHTML += html;

    return section;

}

function updateDashboard(productCSV, cashierCSV) {

    const dashboard = document.getElementById("dashboard");
    dashboard.classList.remove("hidden");

    // -------------------------
    // PRODUCT REPORT
    // -------------------------

    const productRows = parseCSV(productCSV);
    const productHeaders = productRows[0].map(h => h.replace(/"/g, "").trim());

    const qtyIndex = productHeaders.indexOf("SOLD_QUANTITY");
    const salesIndex = productHeaders.indexOf("SALES_WITH_VAT_TOTAL");

    const productTotal = productRows.find(row =>
        row.some(cell => cell.trim().toUpperCase() === "TOTAL")
    );

    let totalQty = 0;
    let totalSales = 0;

    if (productTotal) {
        totalQty = parseFloat(productTotal[qtyIndex]) || 0;
        totalSales = parseFloat(productTotal[salesIndex]) || 0;
    }

    // -------------------------
    // CASHIER REPORT
    // -------------------------

    const cashierRows = parseCSV(cashierCSV);
    const cashierHeaders = cashierRows[0].map(h => h.replace(/"/g, "").trim());

    const salesCountIndex = cashierHeaders.indexOf("NUMBER_OF_SALES");

    const cashierTotal = cashierRows.find(row =>
        row.some(cell => cell.trim().toUpperCase() === "TOTAL")
    );

    let totalTransactions = 0;

    if (cashierTotal) {
        totalTransactions = parseFloat(cashierTotal[salesCountIndex]) || 0;
    }

    const averageSale =
        totalTransactions > 0
            ? totalSales / totalTransactions
            : 0;

    document.getElementById("totalSales").textContent =
        "R " + totalSales.toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    document.getElementById("totalQty").textContent =
        totalQty.toLocaleString("en-ZA");

    document.getElementById("totalTransactions").textContent =
        totalTransactions.toLocaleString("en-ZA");

    document.getElementById("averageSale").textContent =
        "R " + averageSale.toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

}