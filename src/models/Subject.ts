import mongoose, { Schema, Document } from "mongoose";

export interface ISubject extends Document {
  name: string;              
  description: string;   
  order: number;      
}

const subjectSchema = new Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
  },

  description: 
  { 
    type: String, 
    required: true 
  },

  order: { type: Number, required: true, default: 0 } 
});

export default mongoose.model<ISubject>("Subject", subjectSchema);
