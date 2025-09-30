import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { publishJson } from './publisher.js';
import { startSubscription } from './subscriber.js';
import { hederaConfigured, topicsConfigured } from './hederaClient.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS for all origins (demo purposes)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hederaConfigured,
    topicsConfigured
  });
});

app.post('/api/hcs/publish', async (req, res) => {
  try {
    const { email_id, message, event_id } = req.body || {};
    if (!email_id || !message || !event_id) {
      return res.status(400).json({ status: 'error', message: 'email_id, message, and event_id are required' });
    }
    if (!hederaConfigured) {
      return res.status(500).json({ status: 'error', message: 'Hedera not configured on server' });
    }
    if (!topicsConfigured) {
      return res.status(500).json({ status: 'error', message: 'Topic IDs not configured on server' });
    }
    console.log('[API] /api/hcs/publish received', { email_id, message, event_id });
    await publishJson({ email_id, message, event_id });
    console.log('[API] Published to SOURCE_TOPIC_ID');
    res.json({ status: 'success' });
  } catch (e) {
    console.error('Publish error:', e);
    res.status(500).json({ status: 'error', message: 'failed to publish' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  
  // Handle React Router: serve index.html for all routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Development mode: API only
  app.get('/', (req, res) => {
    res.json({ message: 'HCS Server running in development mode' });
  });
}

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port} (${process.env.NODE_ENV || 'development'} mode)`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('Serving frontend and API from single server');
  }
});

// Optional: start forwarding worker
if (process.env.START_SUBSCRIBER === 'true') {
  startSubscription();
}
