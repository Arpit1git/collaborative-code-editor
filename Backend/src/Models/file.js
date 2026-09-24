import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
    {


        name: {
            type: String,
            required: true,
            trim: true
        },

        isFolder: {
            type: Boolean,
            default: false,
            required: true
        },

        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "File",
            default: null 
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", 
            required: true
        },

        content: {
            type: String,
            default: ""
        },

        language: {
            type: String,
            default: "" 
        },

        collabration:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:"User",
            }
        ],

        rootId:{
             type:mongoose.Schema.Types.ObjectId,
             ref:"File",
             default: null 
        }
        

    },
    { timestamps: true }
);
fileSchema.index({owner:1,parentId:1,name:1},{unique:true});
export const File = mongoose.model("File", fileSchema);