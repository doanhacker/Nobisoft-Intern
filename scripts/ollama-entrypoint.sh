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

# Warmup: preload model into RAM
echo "Warming up model $MODEL ..."
curl -sf http://localhost:11434/api/generate -d "{\"model\": \"$MODEL\", \"prompt\": \"hi\", \"stream\": false, \"keep_alive\": -1, \"options\": {\"num_predict\": 1}}" > /dev/null 2>&1
echo "Model $MODEL is loaded into RAM."

# Keep the server running
wait
