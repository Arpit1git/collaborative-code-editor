import dotenv from "dotenv"
import mongoose from "mongoose"

dotenv.config();

const connectMongoDb = async ()=>{
      try {
          const conn  = await  mongoose.connect(process.env.URI) ;
          console.log("MongoDb connected Successfully:");
          console.log(`Connected to Database: ${conn.connection.name}`);

          // Safely drop old non-sparse unique index on refreshToken if exists
          try {
              await mongoose.connection.collection('users').dropIndex('refreshToken_1');
              console.log("[MongoDB] Dropped legacy refreshToken_1 unique index successfully.");
          } catch (e) {
              // Index was already dropped or doesn't exist, ignore
          }
      } catch (dberror) {
          console.error("ERROR FROM CONFIG/MONGO_DB.JS WHILE CONNECTING",dberror);
          process.exit(1);
      }
}
export default connectMongoDb;

