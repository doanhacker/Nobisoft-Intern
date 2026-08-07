#!/bin/bash
# Start Ollama server in background
ollama serve &

# Wait for server to be ready
echo "Waiting for Ollama server to start..."
for i in $(seq 1 30); do
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Ollama server is ready."
    break
  fi
  sleep 1
done

# Pull the model if not already present
MODEL="${OLLAMA_MODEL:-gemma2:2b}"
echo "Pulling model: $MODEL ..."
ollama pull "$MODEL"
echo "Model $MODEL is ready."

# Keep the server running
wait
