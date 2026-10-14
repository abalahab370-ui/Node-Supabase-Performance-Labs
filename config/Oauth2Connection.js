const {OAuth2Client} = require("google-auth-library") ;

//init Connection :
const googleClient = new OAuth2Client();

module.exports = googleClient ;