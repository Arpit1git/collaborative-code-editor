import dotenv from "dotenv"
import mongoose from "mongoose"

dotenv.config();

const connectMongoDb = async ()=>{
      try {
          const conn  = await  mongoose.connect(process.env.URI) ;
          console.log("MongoDb connected Successfully:");
          console.log(`Connected to Database: ${conn.connection.name}`);
      } catch (dberror) {
          console.error("ERROR FROM CONFIG/MONGO_DB.JS WHILE CONNECTING",dberror);
          process.exit(1);
      }
}
export default connectMongoDb;

