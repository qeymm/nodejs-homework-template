const app = require("./app");

const mongoose = require("mongoose");
require("dotenv").config();

const { DB_HOST, PORT = 3000 } = process.env;

async function start() {
  try {
    await mongoose.connect(DB_HOST);
    console.log("Database connection successful");

    app.listen(PORT, () => {
      console.log(`Server is running. Use our API on port: ${PORT}`);
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

start();
