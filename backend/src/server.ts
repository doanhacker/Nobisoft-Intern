
import app from './app.js';
import http from 'http';
import { connectDatabase } from './config/prisma.js';
import { ensureQdrantCollection } from './config/qdrant.js';
import { connectRabbitMQ } from './services/rabbitmq.service.js';


const PORT = process.env.PORT || 8000;

const server = http.createServer(app);

async function startServer() {
  try {
    await connectDatabase();
    await ensureQdrantCollection();
    await connectRabbitMQ();
    
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}


startServer();