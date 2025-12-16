import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRouter } from './routes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ppss';
const openaiApiKey = process.env.OPENAI_API_KEY;

app.use(cors());
app.use(express.json());
app.use('/api', createRouter({ mongoUri, openaiApiKey }));

app.get('/', (_req, res) => {
  res.json({ status: 'PPSS personalized agent API is running' });
});

app.listen(port, () => {
  console.log(`PPSS server listening on http://localhost:${port}`);
});
