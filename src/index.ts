import dotenv from 'dotenv';
dotenv.config();
import server from './server'


const port = Number(process.env.PORT) || 4000

server.listen(port, "0.0.0.0", () => {
  console.log("Server running on port 4000");
});
