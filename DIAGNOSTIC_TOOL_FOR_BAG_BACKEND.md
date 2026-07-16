# Diagnostic Tool - Find Backend Issues

## Quick Start

Your backend is returning 500 errors on search queries. Use this tool to find the exact problem:

### Step 1: Start Backend
```bash
cd src/aiagentrag
python rag_unified.py
```

Wait for:
```
Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Run Diagnostic Tool (New Terminal)
```bash
python test_rag_backend.py
```

### Step 3: Read the Output

The tool will test:
1. ✅ Health check
2. ✅ CORS connectivity  
3. ✅ Greeting queries (simple)
4. ✅ Search queries (complex)

**If Search fails**, it will show:
- The exact error message from backend
- HTTP status code
- Response body

---

## What Each Test Does

| Test | Purpose | Expected |
|------|---------|----------|
| Health | Backend running? | 200 OK |
| CORS | Can frontend reach backend? | 200 OK |
| Greeting | Simple cached query | 200 OK |
| Search | Complex query with PDFs | 200 OK |

---

## Reading the Output

### ✅ All Tests Pass
You're done! Backend works perfectly. The CORS error in the browser is a different issue (probably frontend not reloaded).

### ✅ Up to Search Fails
**Problem:** Backend crashes on complex queries
**Action:** Look at **backend terminal logs** - the error message will be there
**Common issues:**
- Groq API key invalid
- PDF processing error
- Model loading timeout
- Vector search issue

### ❌ Health Fails
**Problem:** Backend not running
**Action:** 
```bash
cd src/aiagentrag
python rag_unified.py
```

### ❌ CORS Fails  
**Problem:** Backend can't send CORS headers
**Action:** Check if backend is actually running and responding

---

## Backend Terminal - Look For

When you run the diagnostic, watch the **backend terminal** for:

**Good output:**
```
🔍 Embedding query: "What is autism?"...
✓ Query embedded
🔍 Searching vector store...
✓ Found 2 sources
🤖 Generating answer with Groq...
✓ Answer generated
```

**Bad output (errors like):**
```
❌ LLM generation error: ...
❌ Search/embedding error: ...
❌ Response formatting error: ...
```

The error message tells you exactly what failed!

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "GROQ_API_KEY not found" | API key missing | Set in `.env` |
| "Connection refused" | Groq API unreachable | Check API key validity |
| "No documents" | PDFs not loaded | Ensure `pdfs/` folder exists |
| "Invalid embedding" | Model loading failed | Restart backend |

---

## If Diagnostic Works but Browser Still Fails

1. **Refresh browser** (F5 or Ctrl+Shift+R)
2. **Clear browser cache** (F12 → Network → Disable Cache, then refresh)
3. **Check browser console** (F12 → Console) for errors
4. **Make sure tab is on http://localhost:3000**

---

## Get More Details

For comprehensive debugging guide, see:
- [CORS_DEBUGGING_GUIDE.md](CORS_DEBUGGING_GUIDE.md)
- [SETUP_RAG_BACKEND.md](SETUP_RAG_BACKEND.md)

---

## Run This When:
- You get CORS errors in browser
- Queries return 500 errors
- Chat doesn't work but you don't know why
- You want to verify backend is ready

**The diagnostic will tell you exactly what's wrong!**
