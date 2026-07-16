# CORS Error Debugging Guide

## Your Setup
- **Frontend:** http://localhost:3000 (Vite)
- **Backend:** http://localhost:8000 (RAG API)
- **CORS:** Required because different ports = different origins

---

## CORS Error Explained

```
Access to fetch has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present
```

**What this means:**
- Frontend (3000) tried to reach backend (8000)
- Backend crashed or didn't send CORS headers
- Browser blocked the response for security

**Why it happens:**
❌ Backend not running  
❌ Backend crashed on startup  
❌ GROQ_API_KEY not set  
❌ PDFs folder missing  

---

## Quick Diagnostic (Do This First!)

### 1. Check Backend is Running
```bash
curl http://localhost:8000/health
```

**Should return:**
```json
{"status": "ok", "ready": true}
```

If this fails → Backend isn't running

### 2. Test CORS Endpoint
```bash
curl http://localhost:8000/cors-test
```

**Should return:**
```json
{
  "message": "CORS is working!",
  "status": "✓ Backend is reachable",
  "agent_ready": true
}
```

If this fails → Backend has CORS issues

### 3. Check Browser Console
```
F12 → Console tab
```

Look for specific error, e.g.:
- "GROQ_API_KEY not found" 
- "PDFs folder not found"
- Network error

---

## Step-by-Step Fix

### Step 1: Verify GROQ_API_KEY
Edit `src/aiagentrag/.env`:
```env
GROQ_API_KEY=gsk_your_key_here
```

✓ Must not be empty!  
✓ Must be valid (from https://console.groq.com)

### Step 2: Create PDFs Folder
```bash
mkdir -p src/aiagentrag/pdfs
# Add at least one PDF file here
```

Backend needs this folder (even if empty)

### Step 3: Start Backend Fresh
```bash
# Kill old backend (Ctrl+C if running)
cd src/aiagentrag
python rag_unified.py
```

**Watch for:**
```
✓ Embeddings ready
✓ Groq ready (mixtral-8x7b-32768)  ← This is KEY
✓ RAG Agent created
Uvicorn running on http://0.0.0.0:8000
```

If you see ✓ Groq ready → Backend is healthy

### Step 4: Test CORS
In browser console (F12):
```javascript
fetch('http://localhost:8000/cors-test')
  .then(r => r.json())
  .then(d => console.log('✓ CORS works!', d))
  .catch(e => console.error('✗ CORS failed:', e))
```

Should print: `✓ CORS works!` with data

### Step 5: Clear Chat & Try Again
1. Refresh browser (F5)
2. Click purple chat bubble 🟣
3. Should show "Connected" status (green)
4. Type a message
5. Should get response!

---

## Common Issues & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Cannot reach backend at 8000" | Backend not running | `python src/aiagentrag/rag_unified.py` |
| "CORS blocked" | Groq API key missing | Set `GROQ_API_KEY` in `.env` |
| 503 error | Backend initializing | Wait 10 seconds, try again |
| 500 error | Backend crashed | Check terminal logs for error |
| "Failed to fetch" | CORS headers missing | Restart backend with fixed code |

---

## Testing While Browser is Open

Keep browser console open (F12) and watch for:

**Good signs:**
- ✓ "Testing CORS..." message
- ✓ "CORS test successful"
- ✓ "Agent initialized"
- ✓ "Query processed"

**Bad signs:**
- ✗ Net errors
- ✗ CORS policy errors
- ✗ 500 errors

---

## Backend Terminal Logs

When you run backend, watch terminal for:

```
🔍 Testing CORS...
✓ Embeddings ready          ← Models loaded
✓ Groq ready (mixtral...)   ← API connected
✓ RAG Agent created         ← Ready for queries
Uvicorn running on 0.0.0.0:8000
```

If you see any ❌ errors - that's the problem!

---

## Advanced Debugging

### Check Network Tab
1. F12 → Network tab
2. Type in chat
3. Look for POST request to `/query`
4. Click it and check:
   - **Status:** Should be 200 (not 500)
   - **Headers → Response:** Should have `Access-Control-Allow-Origin: *`

### Check Backend Logs
Backend should print:
```
🔍 Processing query: "your message"...
✓ Query processed in 1234ms
```

If stuck on initialization:
```
🔄 Initializing agent...
```

Wait ~10 seconds for models to load.

---

## Nuclear Option (Reset Everything)

If nothing works:

```bash
# Clear Chroma cache
rm -rf src/aiagentrag/chroma_db

# Kill all Python processes
lsof -ti:8000 | xargs kill -9

# Fresh start
cd src/aiagentrag
python rag_unified.py
```

---

## What's Fixed in Backend

✅ CORS middleware added first (before routes)  
✅ Explicit OPTIONS handler for preflight  
✅ Exception handlers include CORS headers  
✅ Test endpoint for debugging  
✅ Better error messages  

---

## Need More Help?

1. Check **backend terminal** for actual error
2. Check **browser console** (F12) for response details
3. Test `/cors-test` endpoint manually
4. Verify GROQ_API_KEY is valid
5. Try the nuclear reset option above

Backend logs tell the truth - they'll show exactly what's wrong!
