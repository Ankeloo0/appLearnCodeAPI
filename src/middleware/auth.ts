import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User';

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

export const authenticate = async(req: Request, res: Response, next:NextFunction) => {
    const bearer = req.headers.authorization;

    if (!bearer) {
        const error =  new Error('No token provided');
        res.status(401).json({ message: error.message });
        return
    }
    const token = bearer.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (typeof decoded === 'object' && decoded.id) {
            const user = await User.findById(decoded.id).select('-password -__v -createdAt -updatedAt -token -confirmed');

            if(user) {
                req.user = user;
                next();

            }else{
                res.status(401).json({ message: 'Invalid token' });
                return

            }
        }

        
        
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
        return
        
    }

    
}