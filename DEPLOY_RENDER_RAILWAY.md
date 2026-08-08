# Demo Deployment Guide for Render / Railway

This setup is for a public demo link, not the fully free always-on Ollama version.

## What this deployment uses

- FastAPI backend from [src/aiagentrag/rag_unified.py](src/aiagentrag/rag_unified.py)
- Docker container from [Dockerfile](Dockerfile)
- HuggingFace local embeddings
- Groq for answer generation

Render and Railway are good for a demo link, but they are not the best choice for running Ollama inside the cloud container.

## Required secrets

Set this secret in Render or Railway:

- `GROQ_API_KEY`

## Optional env vars

- `LLM_PROVIDER=groq`
- `EMBEDDING_PROVIDER=huggingface`
- `TOP_K=7`
- `TEMPERATURE=0.3`
- `MAX_TOKENS=300`

## Render steps

1. Push this repo to GitHub.
2. Open Render and create a new Web Service from the repo.
3. Use the Docker deploy option, or let Render read [render.yaml](render.yaml).
4. Add `GROQ_API_KEY` in the Environment tab.
5. Deploy and wait for `/health` to return ready.
6. Copy the public URL and set it in the frontend as `VITE_RAG_API_URL`.

## Railway steps

1. Push this repo to GitHub.
2. Open Railway and create a new project from GitHub.
3. Railway should detect [Dockerfile](Dockerfile) automatically.
4. Add `GROQ_API_KEY` in Variables.
5. Deploy the service.
6. Copy the public URL and set it in the frontend as `VITE_RAG_API_URL`.

## Frontend change

Set the frontend environment variable to your deployed backend URL:

```env
VITE_RAG_API_URL=https://your-rag-service.onrender.com
```

or

```env
VITE_RAG_API_URL=https://your-rag-service.up.railway.app
```

Then rebuild and redeploy the frontend.

## Important note

If you want the link to stay live even when your laptop is off, use the cloud backend above.
If you want zero API cost, use the local Ollama setup instead, but that requires your own machine or always-on server.