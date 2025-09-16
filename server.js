const express = require("express");
const cors = require("cors");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Carica i dati dal file summary2.0.json
const rawData = fs.readFileSync("summary2.0.json");
const summaryData = JSON.parse(rawData);

// Endpoint API
app.get("/api/reports", (req, res) => {
  res.json(summaryData);
});

app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
