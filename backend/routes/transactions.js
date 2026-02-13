const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");
const Groq = require("groq-sdk");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/* -------------------- Groq Setup -------------------- */
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* -------------------- AI CATEGORIZATION -------------------- */
async function categorize(description, amount) {
  try {
    const prompt = `Categorize this expense into one category: 
Food, Transport, Utilities, Shopping, Entertainment, Healthcare, Education, Bills, Other.

Description: ${description}
Amount: ₹${amount}

Reply ONLY with the category name.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 10,
    });

    const cat = completion.choices?.[0]?.message?.content?.trim();
    const allowed = [
      "Food",
      "Transport",
      "Utilities",
      "Shopping",
      "Entertainment",
      "Healthcare",
      "Education",
      "Bills",
      "Other",
    ];

    return allowed.includes(cat) ? cat : "Other";
  } catch {
    return "Other";
  }
}

/* -------------------- HELPERS -------------------- */

// Remove ₹, commas, whitespace
function cleanAmount(value) {
  if (!value) return 0;
  const num = Number(String(value).replace(/[₹,]/g, "").trim());
  return isNaN(num) ? 0 : num;
}

// Parse Excel date / text date
function parseDate(value) {
  if (!value) return null;

  // Excel serial number
  if (!isNaN(value) && Number(value) > 40000) {
    return new Date((value - 25569) * 86400000);
  }

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

// Read Excel rows
function readExcelRows(path) {
  const workbook = XLSX.readFile(path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
}

/* -------------------- MAIN PARSER -------------------- */

async function convertRowsToTransactions(rows, userId) {
  const transactions = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row || row.length < 6) continue;

    const date = parseDate(row[0]);
    const description = row[1] ? String(row[1]).trim() : "";
    const withdrawal = cleanAmount(row[3]); // Debit
    const deposit = cleanAmount(row[4]);    // Credit

    // Ignore balance column row[5]

    if (!date || !description) continue;

    let amount = 0;
    let type = "debit";

    /* -------- PRIMARY LOGIC: Withdrawal / Deposit -------- */
    if (withdrawal > 0) {
      amount = withdrawal;
      type = "debit";
    } else if (deposit > 0) {
      amount = deposit;
      type = "credit";
    }

    const descLower = description.toLowerCase();

    /* ----------------- UPI / GPAY PAYMENTS = ALWAYS DEBIT ----------------- */
    const debitKeywords = [
      "upi",
      "gpay",
      "googlepay",
      "phonepe",
      "paytm",
      "pos",
      "merchant",
      "qr",
      "scan",
      "payu",
      "bill",
      "fastag"
    ];

    const creditKeywords = [
      "refund",
      "reversal",
      "credited",
      "salary",
      "interest",
      "int",
      "reimb"
    ];

    if (debitKeywords.some((k) => descLower.includes(k))) {
      type = "debit";
    }

    if (creditKeywords.some((k) => descLower.includes(k))) {
      type = "credit";
    }

    // HDFC sometimes places UPI payments under "deposit" column → force debit
    if (deposit > 0 && withdrawal === 0 && descLower.includes("upi")) {
      type = "debit";
    }

    if (amount <= 0) continue;

    const category = await categorize(description, amount);

    transactions.push({
      userId,
      date,
      description,
      amount,
      category,
      type,
    });
  }

  return transactions;
}

/* -------------------- ROUTES -------------------- */

// UPLOAD FILE
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded" });

    const rows = readExcelRows(req.file.path);

    // Find header row
    let headerIndex = rows.findIndex(
      (r) => r && typeof r[0] === "string" && r[0].toLowerCase().includes("date")
    );

    if (headerIndex === -1) headerIndex = 0;

    const dataRows = rows.slice(headerIndex + 1);

    const transactions = await convertRowsToTransactions(
      dataRows,
      req.userId
    );

    if (transactions.length > 0) {
      await Transaction.insertMany(transactions);
    }

    fs.unlinkSync(req.file.path);

    return res.json({
      message: "Upload successful",
      saved: transactions.length,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET ALL
router.get("/", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const q = { userId: req.userId };

    if (startDate && endDate) {
      q.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const data = await Transaction.find(q).sort({ date: -1 });
    res.json(data);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

// SUMMARY
router.get("/summary", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { userId: req.userId };

    if (startDate && endDate) {
      match.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const summary = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json(summary);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

// DELETE ALL
router.delete("/all", auth, async (req, res) => {
  try {
    await Transaction.deleteMany({ userId: req.userId });
    res.json({ message: "All transactions deleted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
