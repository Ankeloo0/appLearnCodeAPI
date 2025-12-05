import { CorsOptions } from 'cors'

export const corsConfig: CorsOptions = {
  origin: function (origin, callback) {
    const whiteList = [
      process.env.FRONTEND_URL,             // tu frontend web local
      process.env.REACT_NATIVE_URL,         // tu app de React Native desplegada
      undefined                              // para Postman o requests sin origin
    ];

    if (whiteList.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Error de CORS: origen no permitido'));
    }
  },
  credentials: true,
};
