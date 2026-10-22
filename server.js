require("dotenv").config() ;

const express = require("express") ;
const app = express() ;
const PORT = process.env.PORT || 5000 ;
const cookieParser = require("cookie-parser");
const query = require("./config/dbConnection") ;
const client = require("./config/rdConnection") ; 

//Stander middlewares :
app.use(cookieParser());
app.use(express.json());

//feed route :
app.use("/api/v1/search" , require("./routes/posts"));
app.use("/api/v1/auth", require("./routes/main"));

// 404 handler (must be registered after all routes) :
app.use((req, res) => {
      res.status(404).json({
            success: false,
            message: "Route not found"
      });
});

app.listen( PORT  , () => {
      console.log(`Server is up and listening on port: ${PORT}`);
})