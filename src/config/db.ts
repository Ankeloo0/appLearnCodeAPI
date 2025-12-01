import mongoose, { connection } from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URLlinea);
        const url = `${mongoose.connection.host}: ${mongoose.connection.port}`
        console.log('MongoDB conectado en: ' + url);
        
        
    } catch (error: any) {
        console.log(error.message)
        process.exit(1);
    }
}
