import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import chatRoutes from './routes/chat.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import studioRoutes from './routes/studio.routes.js';
import errorHandler from './middleware/error.middleware.js';
import connectDB from './config/database.js';
import morgan from 'morgan';
import cors from 'cors';
import { serve } from 'inngest/express';
import { functions, inngest } from './inngest/index.js';

dotenv.config();

connectDB();

const app = express();

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://sop-frontend-eight.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie'],
  })
);

app.use(
  morgan('dev', {
    stream: {
      write: message => console.log(message.trim()),
    },
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(
  '/api/inngest',
  serve({
    client: inngest,
    functions,
    options: {
      landingPage: true,
      servePath: '/api/inngest',
    },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/studio', studioRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);

export default app;
