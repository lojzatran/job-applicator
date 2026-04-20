FROM alpine/ollama

RUN apk add --no-cache curl

RUN ollama serve & \
    SERVER_PID=$! && \
    until curl -sf http://localhost:11434/api/tags > /dev/null; do sleep 1; done && \
    ollama pull nomic-embed-text-v2-moe:latest && \
    kill "$SERVER_PID" || true

EXPOSE 11434
