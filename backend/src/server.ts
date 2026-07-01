import app from './app.js';
import http from 'http';


const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

async function startServer() {
  try {
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}


startServer();