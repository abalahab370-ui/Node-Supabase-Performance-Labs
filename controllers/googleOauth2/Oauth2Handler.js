const googleClient = require("../config/Oauth2Connection") ;
const jwt = require("jsonwebtoken") ;

const Oauth2Handler = async ( req , res ) => {
      try {
            //So basicly this function will be used to handle the Oauth2 and dealing with the req that the Google Sent to us After login using the user email 
            //So first we will recive a Token !

            const {token} = req.body ;

            if (!token) {
                  return res.status(404).json({'message' : 'Bas Request'}) ;
            } ;

            //here we have to get a ticket !
            const ticket = googleClient.verifyIdToken({
                  idToken : token ,
                  audience : process.env.GOOGLE_CLIENT_ID
            }) ;
            
            if (!ticket) {
                  return res.status(401).json({'message' : 'Unauthorized'}) ;
            }
            //else we fetch the payload using the ticket !
            const payload = await ticket.getPayload() ;

            //and here we will deal with CRUD operations for user and manage JWT using the payload infos ! (we have to choice we do them here or we build separate functions for each and import them here i prefer second one ! )

      } catch (err) {
            console.error(`Sir we have an error in Handling Google Oauth2 : ${err}`) ;
      }
}