require (dotenv).config() ;

const express = require("express") ;
const app = express() ;
const PORT = process.env.PORT || 5000 ;
const cookieParser = require("cookie-parser");
const {pool , query} = require("./config/dbConnection") ;
const client = require("./config/rdConnection") ; 

//Stander middlewares :
app.use(cookieParser());
app.use(express.json());

//feed route :
app.use("api/v1/posts/search" , require("./controllers/"))