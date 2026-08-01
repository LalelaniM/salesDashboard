const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static("public"));

/*
====================================================
    VERIFY USER
    Replace this function with your existing
    verifyUser() code.
====================================================
*/
const CLIENT_CODE = "538868";
const USERNAME = "Gift";
const PASSWORD = "Gift9663";

const ERPLY_URL = `https://538868.erply.com/api/`;

let sessionKey = null;
let sessionExpiry = 0;

/*************************************************
 * VERIFY USER
 *************************************************/

async function verifyUser() {

    // Use cached session if still valid

    if (sessionKey && Date.now() < sessionExpiry) {

        return sessionKey;

    }

    try {

        const formData = new URLSearchParams();

        formData.append("clientCode", CLIENT_CODE);
        formData.append("username", USERNAME);
        formData.append("password", PASSWORD);
        formData.append("request", "verifyUser");

        const response = await axios.post(

            ERPLY_URL,

            formData,

            {

                headers: {

                    "Content-Type":
                        "application/x-www-form-urlencoded"

                }

            }

        );

        const data = response.data;

        if (

            !data.status ||

            data.status.responseStatus !== "ok"

        ) {

            throw new Error(

                "ERPLY Login Failed"

            );

        }

        sessionKey = data.records[0].sessionKey;

        // Cache for 55 minutes

        sessionExpiry = Date.now() + (55 * 60 * 1000);

        console.log("ERPLY Login Successful");

        return sessionKey;

    }

    catch (err) {

        console.error(err.response?.data || err.message);

        throw err;

    }

}

/*
====================================================
    TODAY'S DATE
====================================================
*/

function today() {

    const d = new Date();

    const year = d.getFullYear();

    const month = String(d.getMonth() + 1).padStart(2, "0");

    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}

/*
====================================================
    DOWNLOAD CSV
====================================================
*/

async function downloadCSV(url) {

    const response = await axios.get(url, {

        responseType: "text"

    });

    return response.data;

}

/*
====================================================
    GET SALES REPORT
====================================================
*/

async function getSalesReport(reportType) {

const sessionKey = await verifyUser();

const reportDate = today();

const params = new URLSearchParams();

params.append("clientCode", CLIENT_CODE);
params.append("sessionKey", sessionKey);

params.append("request", "getSalesReport");

params.append("dateStart", reportDate);
params.append("dateEnd", reportDate);

params.append("warehouseID", "1");
params.append("byStockOfficeID", "1");

params.append("reportType", reportType);
params.append("responseType", "json");

const response = await axios.post(
    ERPLY_URL,
    params,
    {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    }
);

    const data = response.data;
    //console.log(JSON.stringify(data, null, 2));

    if (

        !data.records ||

        data.records.length === 0 ||

        !data.records[0].reportLink

    ) {

        throw new Error("No report returned.");

    }

    const reportLink = data.records[0].reportLink;

    const csv = await downloadCSV(reportLink);

    return csv;

}

/*
====================================================
    API
====================================================
*/

app.get("/api/report", async (req, res) => {

    try {

        const productCSV = await getSalesReport("SALES_BY_PRODUCT");

const cashierCSV = await getSalesReport("SALES_BY_CASHIER");

res.json({
    productReport: productCSV,
    cashierReport: cashierCSV
});

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

});

/*
====================================================
    START SERVER
====================================================
*/

app.listen(PORT, () => {

    console.log("");

    console.log("--------------------------------");

    console.log("ERPLY Sales Report");

    console.log(`http://localhost:${PORT}`);

    console.log("--------------------------------");

});