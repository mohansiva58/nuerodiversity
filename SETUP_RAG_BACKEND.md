# RAG Backend - Setup Required ⚠️

## What's Happening
Your frontend (http://localhost:3000) is trying to reach backend (http://localhost:8000), but getting CORS errors because:

1. **Backend might not be running** → CORS headers never sent
2. **GROQ_API_KEY not set** → Backend crashes on startup
3. **PDFs folder missing** → Backend fails during initialization

---

## Quick Setup (3 Steps)

### Step 1️⃣: Set Your Groq API Key
1. Go to: https://console.groq.com
2. Get a free API key
3. Edit `src/aiagentrag/.env`:

```env
GROQ_API_KEY=gsk_your_actual_key_here
```

### Step 2️⃣: Create PDFs Folder (Even If Empty)
```bash
mkdir -p src/aiagentrag/pdfs
```

### Step 3️⃣: Start Backend
```bash
cd src/aiagentrag
python rag_unified.py
```

**Expected output:**
```
INFO: Uvicorn running on http://0.0.0.0:8000
✓ Embeddings ready
✓ Groq ready (mixtral-8x7b-32768)  ← This means it worked!
✓ RAG Agent created
```

---

## Now Test It!

### Test 1: Backend is Running
```bash
curl http://localhost:8000/health
# Should return: {"status": "ok", "ready": true}
```

### Test 2: CORS Works
```bash
curl http://localhost:8000/cors-test  
# Should return: {"message": "CORS is working!", ...}
```

### Test 3: Frontend Works
1. Open browser: http://localhost:3000
2. Click purple chat bubble 🟣
3. Should show "Connected" (green indicator)
4. Type a message
5. Should see response! ✅

---

## Troubleshooting

### "Cannot reach backend at 8000"
**Problem:** Backend not running  
**Solution:**
```bash
cd src/aiagentrag
python rag_unified.py
```

### "CORS blocked" or "Failed to fetch"  
**Problem:** Backend might be crashing  
**Solution:**
1. Check backend terminal for errors
2. Make sure GROQ_API_KEY is set in `.env`
3. Make sure `pdfs/` folder exists
4. Restart backend

### "Agent not ready" or "Initializing..."
**Problem:** Backend still loading models (~10 seconds first time)  
**Solution:** Wait 10-15 seconds and try again

### 500 Error
**Problem:** Backend error (check terminal!)  
**Solution:** Look at backend terminal output - it will tell you exactly what's wrong

---

## Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 3000 | http://localhost:3000 |
| Backend (RAG API) | 8000 | http://localhost:8000 |

Different ports = CORS required ✓

---

## Next Steps

1. ✅ Set GROQ_API_KEY  
2. ✅ Create pdfs/ folder  
3. ✅ Run backend  
4. ✅ Test CORS  
5. ✅ Use floating chatbot!

---

## Full Debugging

For detailed troubleshooting, see: [CORS_DEBUGGING_GUIDE.md](CORS_DEBUGGING_GUIDE.md)

Key commands:
- `curl http://localhost:8000/health` - Check backend
- `curl http://localhost:8000/cors-test` - Check CORS
- `F12` browser console - Check frontend errors
