import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    email: string,
    password: string,
    username: string,
    confirm: boolean
    level: number,
    role: "user" | "admin"
}

const userSchema: Schema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    username: {
        type: String,
        required: true
    },

    confirm: {
        type: Boolean,
        default: true
    },
    level: {
        type: Number,
        default: 1
    },
    role: {
        type: String,
        enum: ["user", "admin"], 
        default: "user" 
    }
}, {timestamps: true})

const User = mongoose.model<IUser>('User', userSchema)

export default User