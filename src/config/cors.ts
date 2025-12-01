import { CorsOptions } from 'cors'

export const corsConfig: CorsOptions = {
  origin: function (origin, callback) {
    const whiteList = [process.env.FRONTEND_URL, undefined]; // <-- agrega undefined siempre

    if (whiteList.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('error de cors'));
    }
  },
  credentials: true,
};