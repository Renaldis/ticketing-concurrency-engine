import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import checkoutRoutes from './routes/checkout.routes.js';

// Konfigurasi dotenv agar mampu membaca file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk mempermudah membaca body HTTP berformat JSON
app.use(express.json());

app.use('/api', checkoutRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Ticketing Engine API is healthy',
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
