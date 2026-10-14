const {OAuth2Client} = require("google-auth-library") ;

//init Connection :
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

module.exports = googleClient ;