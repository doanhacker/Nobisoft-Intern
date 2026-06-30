import * as http from "node:http";

const PORT = Number(process.env.BACKEND_PORT) || 8001;

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.url === "/health") {
    res.statusCode = 200;
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ message: "Backend is running" }));
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Please stop the running app or change BACKEND_PORT.`);
    process.exit(1);
  }

  console.error("Server failed to start:", error.message);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});