require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const cookieParser = require("cookie-parser");
const rateLimiter = require("./controllers/rateLimiter.Js");
const verifyJWT = require("./middleware/verifyJWT");
const cors = require("./middleware/cors");
const path = require("path");

app.set("trust proxy", 1);
app.use(cors);
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/api/v1", rateLimiter);

app.use("/api/v1/auth", require("./routes/main"));
app.use("/api/v1/search", verifyJWT, require("./routes/posts"));
app.use("/api/v1/concurrency", verifyJWT, require("./routes/concurrency"));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.listen(PORT, () => {
  console.log(`Server is up and listening on port: ${PORT}`);
});