import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import webhookRoutes from './routes/webhook.js';
import adminRoutes from './routes/admin.js';
import axcelerateRoutes from './routes/axcelerate.js';
import { initDatabase } from './db/index.js';


// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for admin dashboard
  crossOriginResourcePolicy: false, // Disable CORP to allow widget files
  crossOriginEmbedderPolicy: false // Disable COEP to allow widget files
}));

// Disable Helmet for widget routes (apply after helmet)
app.use('/api/axcelerate/widget', (req, res, next) => {
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  next();
});

// CORS configuration - allow Shopify store
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from Shopify store or no origin (for widget files)
    const allowedOrigins = [
      'https://blackmarket-training.myshopify.com',
      'https://www.blackmarkettraining.com'
    ];
    
    // Allow requests with no origin (like mobile apps, Postman, or widget files)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for widget files
    }
  },
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Custom middleware to wrap views in layout
app.use((req, res, next) => {
  const originalRender = res.render;
  res.render = function(view, options, callback) {
    const self = this;
    const opts = options || {};
    
    // Render the view content
    originalRender.call(self, view, opts, (err, html) => {
      if (err) return callback ? callback(err) : next(err);
      
      // Wrap in layout
      originalRender.call(self, 'layout', { ...opts, body: html }, callback);
    });
  };
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing - but NOT for webhook route (needs raw body for HMAC verification)
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);
app.use('/api/axcelerate', axcelerateRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'shopify-axcelerate-integration'
  });
});

// Root route
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize database and start server
async function start() {
  try {
    await initDatabase();
    console.log('✅ Database initialized');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
      console.log(`🪝 Webhook endpoint: http://localhost:${PORT}/webhook/shopify`);
      console.log(`🔌 Axcelerate API proxy: http://localhost:${PORT}/api/axcelerate`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

