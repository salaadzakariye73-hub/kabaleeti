import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes, { usersRouter } from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import operationsRoutes from './routes/operations.js';
import financeRoutes from './routes/finance.js';
import { requireAuth } from './middleware/auth.js';
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is missing. Add it in Render → Environment for this service.');
  process.exit(1);
}
const app = express();
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api', requireAuth, catalogRoutes);
app.use('/api', requireAuth, operationsRoutes);
app.use('/api', requireAuth, financeRoutes);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'Duplicate value' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: err.message || 'Server error' });
});

const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI).then(() => {
  app.listen(port, () => console.log(`Kaah Steel Props API on :${port}`));
}).catch((e) => {
  console.error('MongoDB connection failed:', e.message);
  process.exit(1);
});
