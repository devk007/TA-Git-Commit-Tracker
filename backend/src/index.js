import 'dotenv/config';
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { scheduleClassSync } from './jobs/syncJob.js';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDB(process.env.MONGODB_URI);

    const server = http.createServer(app);

    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${PORT}`);
    });

    scheduleClassSync();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
