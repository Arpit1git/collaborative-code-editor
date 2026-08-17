import mongoose  from "mongoose";
//  we have to implement a unique file feature for paricular user
const fileSchema = mongoose.Schema({
           
       fileName:{
        type:String,
        required:true,
        trim:true,
       },

       content:{
         type:String,
         default:""
       },

       language:{
         type:String,
         required:true,
         default:"javaString"
       }


}, { timestamps: true });

export const File = new mongoose.model("File",fileSchema);