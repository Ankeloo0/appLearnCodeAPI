import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUserProgress extends Document {
  user: Types.ObjectId;
  subtopic: Types.ObjectId;
  score?: number;
  completedExercises?: Types.ObjectId[];
  answeredQuestions?: Types.ObjectId[];
  lastAccessed?: Date;
  completed: Boolean
}

const userProgressSchema = new Schema({
  user: { type: Types.ObjectId, ref: "User", required: true },
  subtopic: { type: Types.ObjectId, ref: "Subtopic", required: true },
  score: { type: Number, default: 0 },
  completedExercises: [{ type: Types.ObjectId, ref: "Exercise" }],
  answeredQuestions: [{ type: Types.ObjectId, ref: "Question" }],
  lastAccessed: { type: Date, default: Date.now },
  completed: {type: Boolean, default:false}
});

export default mongoose.model<IUserProgress>("UserProgress", userProgressSchema);
