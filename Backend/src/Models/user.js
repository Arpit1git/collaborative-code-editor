import mongoose from "mongoose"

const userSchema = mongoose.Schema({


      userName:{
        type:String,
        trim:true,
        required:true, 
        unique: true
      },
         

      email:{
         type:String,
         required:true,
         unique: true
      },

      password:{
         type:Number,
         required:true
      },

      refreshToken:{
        type:String,
        unique:true,
      }

},{timestamps:true});

export const User =  new mongoose.model("User",userSchema);