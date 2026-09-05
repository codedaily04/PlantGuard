require("dotenv").config();

console.log("MONGO_URI exists:", !!process.env.MONGO_URI);

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5001;

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});