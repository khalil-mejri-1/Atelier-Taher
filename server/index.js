import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import authRouter from './routes/auth.js';
import { createPatternsRouter } from './routes/patterns.js';
import logsRouter from './routes/logs.js';
import workersRouter from './routes/workers.js';
import { createCategoriesRouter } from './routes/categories.js';

dotenv.config();

// Connect to MongoDB & Seed Data
await connectDB();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO for instant live updates across Admin and Worker interfaces
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/patterns', createPatternsRouter(io));
app.use('/api/categories', createCategoriesRouter(io));
app.use('/api/logs', logsRouter);
app.use('/api/workers', workersRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'MongoDB',
    app: 'Atelier Taher Garment Patterns Inventory & Production API (MongoDB)',
    time: new Date().toISOString(),
  });
});

// Socket connection
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🍃 Atelier Taher Server (MongoDB) is running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time sync`);
  console.log(`=================================================`);
});
