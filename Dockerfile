FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY src/aiagentrag/requirements.txt /app/src/aiagentrag/requirements.txt

RUN pip install --no-cache-dir -r /app/src/aiagentrag/requirements.txt

COPY . /app

EXPOSE 10000

CMD ["sh", "-c", "uvicorn src.aiagentrag.rag_unified:app --host 0.0.0.0 --port ${PORT:-10000}"]