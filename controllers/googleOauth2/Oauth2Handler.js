const googleClient = require("../../config/Oauth2Connection") ;
const jwt = require("jsonwebtoken") ;

const Oauth2Handler = async ( req , res ) => {
      try {
           const { token } = req.body;

            if (!token) {
            return res.status(400).json({
                  message: 'Bad Request'
            });
            }

            let payload;

            try {
            const ticket = await googleClient.verifyIdToken({
                  idToken: token,
                  audience: process.env.GOOGLE_CLIENT_ID
            });

            payload = ticket.getPayload();

            } catch (error) {
            console.error('Google token verification failed:', error.message);

            return res.status(401).json({
                  error: 'Invalid or expired Google ID token.'
            });
            }

            if (!payload.email_verified) {
            return res.status(403).json({
                  error: 'Unverified Google email address.'
            });
            }

            const googleId = payload.sub;

            // Continue with your user lookup or account creation logic.



      } catch (err) {
            console.error(`Sir we have an error in Handling Google Oauth2 : ${err}`) ;
      }
}