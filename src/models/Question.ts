import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQuestion extends Document {
  subtopic: Types.ObjectId;
  user: Types.ObjectId; // 👈 nuevo campo
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  generatedByLLM?: boolean;
  difficulty: string;
}

const questionSchema = new Schema({
  subtopic: { 
    type: Types.ObjectId, 
    ref: "Subtopic", 
    required: true 
  },

  user: { 
    type: Types.ObjectId, 
    ref: "User", 
    required: true // 👈 necesario
  },

  question: { type: String, required: true },

  options: [{ type: String, required: true }],

  correctAnswer: { type: String, required: true },

  explanation: { type: String },

  generatedByLLM: { 
    type: Boolean, 
    default: false 
  },

  difficulty: { 
    type: String,
    default: 'easy'
  }
});

export default mongoose.model<IQuestion>("Question", questionSchema);
