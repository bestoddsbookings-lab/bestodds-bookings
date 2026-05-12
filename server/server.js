const express = require("express");
const cors = require("cors");
require("dotenv").config();

const routes = require("./src/routes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use("/api", routes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
