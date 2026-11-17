import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // fallback to cwd .env

import { connectDB } from './db.js';
import authRouter from './routes/auth.js';
import { createPatternsRouter } from './routes/patterns.js';
import logsRouter from './routes/logs.js';
import workersRouter from './routes/workers.js';
import { createCategoriesRouter } from './routes/categories.js';

dotenv.config();

const app = express();

// Connect to MongoDB asynchronously without blocking HTTP server startup
connectDB().catch((err) => {
  console.warn('⚠️ Échec de connexion initiale à MongoDB :', err.message);
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/patterns', createPatternsRouter());
app.use('/api/categories', createCategoriesRouter());
app.use('/api/logs', logsRouter);
app.use('/api/workers', workersRouter);

// Root backend welcome route
app.get('/', (req, res) => {
  res.send('server run');
});

app.get('/api', (req, res) => {
  res.send('server run');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'MongoDB',
    app: 'Atelier Taher Garment Patterns Inventory & Production API (MongoDB)',
    time: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🍃 Atelier Taher Server running on port ${PORT}`);
    console.log(`📡 REST API ready on http://127.0.0.1:${PORT}`);
    console.log(`=================================================`);
  });
}

export default app;
