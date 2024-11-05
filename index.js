const express = require("express");
const path = require('path');

const pgp = require("pg-promise")(); // Call pg-promise as a function
const axios = require("axios"); // Import axios for making HTTP requests
require("dotenv").config();



const app = express();
const port = 3000; // Define the port variable
app.use(express.static(path.join(__dirname, 'public')));

const db = pgp(process.env.DATABASE_URL);


const createTableQuery = `
  CREATE TABLE IF NOT EXISTS cryptocurrencies (
      id SERIAL PRIMARY KEY,
      base_unit VARCHAR(10) NOT NULL,
      volume DECIMAL(15, 2) NOT NULL,
      sell DECIMAL(15, 4) NOT NULL,
      buy DECIMAL(15, 4) NOT NULL,
      name VARCHAR(50) NOT NULL
  );
`;

db.none(createTableQuery)
  .then(() => {
    console.log("Table created successfully");
  })
  .catch((error) => {
    console.error("Error creating table:", error);
  });

const Addrow = async () => {
  try {
    
    const result = await axios.get("https://api.wazirx.com/api/v2/tickers");
    const resultarr = Object.values(result.data).slice(0, 10); // Take first 10 entries

    
    for (const obj of resultarr) {
      const checkQuery = `
        SELECT 1 FROM cryptocurrencies WHERE base_unit = $1 LIMIT 1;
      `;

      
      const existingRecord = await db.oneOrNone(checkQuery, [obj.base_unit]);

      if (existingRecord) {
        console.log(
          `Record for ${obj.base_unit} already exists, skipping insert.`
        );
      } else {
        const insertQuery = `
          INSERT INTO cryptocurrencies (
              base_unit, volume, sell, buy, name
          ) VALUES (
              $(base_unit), $(volume), $(sell), $(buy), $(name)
          );
        `;

        // Prepare the data for insertion
        const data = {
          base_unit: obj.base_unit,
          volume: parseFloat(obj.volume), // Ensure volume is treated as a number
          sell: parseFloat(obj.sell),
          buy: parseFloat(obj.buy),
          name: obj.name,
        };

        // Insert data into the table
        try {
          await db.none(insertQuery, data);
          console.log(`Added Row for ${obj.name}`);
        } catch (error) {
          console.error("Error inserting Row", error);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching data from WazirX API:", error);
  }
};

Addrow();

app.get("/" , (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
})

app.get("/api/cryptocurrencies", async (req, res) => {
  try {
    const data = await db.any("SELECT * FROM cryptocurrencies;");
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
