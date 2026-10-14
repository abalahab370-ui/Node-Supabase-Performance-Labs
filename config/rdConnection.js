const createClient = require("redis").createClient ;

//init the connection :
const client =  createClient ( {
      password : process.env.REDIS_PASSWORD ,
      socket : {
            host : process.env.REDIS_HOST,
            port : Number(process.env.REDIS_PORT)
      }
} ) ;

client.on ('error' , (err) => console.error('Redis Client Error:', err) ) ;

const initRedis = async () => {
      if (!client.isOpen) {
            await client.connect() ;
            console.log('Redis Client Connected!');
      }
}

initRedis() ;

module.exports = client ;
