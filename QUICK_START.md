# 🚀 Quick Start - Parent Support API

## ⚠️ IMPORTANT: Directory Warning

**DON'T do this:**
```bash
cd src/aiagentrag
cd src/aiagentrag  # ❌ WRONG - creates nested path!
python startup_parent.py
```

**DO this:**
```bash
# From project root
cd C:\Users\sujay\Desktop\All_projects_folder\NUEROHUB
cd src\aiagentrag  # ✅ Correct
python startup_parent.py
```

---

## 3 Ways to Start the API

### Option 1: Windows Batch (Easiest) ⭐
```bash
# Double-click this file:
start_parent_api.bat

# Or run from PowerShell:
.\start_parent_api.bat
```

### Option 2: PowerShell
```powershell
# From any directory, run:
.\src\aiagentrag\start_parent_api.ps1
```

### Option 3: Manual (Full Control)
```bash
# 1. Go to project root
cd C:\Users\sujay\Desktop\All_projects_folder\NUEROHUB

# 2. Go to API directory
cd src\aiagentrag

# 3. Install dependencies (first time only)
pip install -r requirements.txt

# 4. Start API
python startup_parent.py
```

---

## What Happens When You Start

```
✓ Loads .env from project root
✓ Checks GROQ_API_KEY
✓ Verifies dependencies
✓ Starts FastAPI server on http://localhost:8001
```

Expected output:
```
👨‍👩‍👧 NeuroHub Parent Support API - Starting
✓ Loaded .env from C:\Users\sujay\Desktop\All_projects_folder\NUEROHUB\.env
✓ GROQ_API_KEY configured
✓ All dependencies available

📍 Server: http://localhost:8001
📚 Docs: http://localhost:8001/docs
```

---

## Test the API

### In your browser:
- API Docs: http://localhost:8001/docs
- Health Check: http://localhost:8001/health

### From command line:

**Greeting (instant):**
```bash
curl -X POST http://localhost:8001/ask ^
  -H "Content-Type: application/json" ^
  -d "{\"query\": \"hello\"}"
```

Expected response time: **<100ms** ⚡

**Real question (fast):**
```bash
curl -X POST http://localhost:8001/ask ^
  -H "Content-Type: application/json" ^
  -d "{\"query\": \"How can I help my child learn?\"}"
```

Expected response time: **2-4 seconds** ✨

---

## Troubleshooting

### Error: "GROQ_API_KEY not found"
**Solution**: Make sure `.env` file exists in project root with:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### Error: "ModuleNotFoundError: No module named 'fastapi'"
**Solution**: Install dependencies
```bash
cd src\aiagentrag
pip install -r requirements.txt
```

### Error: "Port 8001 already in use"
**Solution**: Change port in `startup_parent.py` line ~10, or:
```bash
# Find and kill process on port 8001 (PowerShell)
Get-Process | Where-Object {$_.Port -eq 8001} | Stop-Process -Force
```

### Error: "can't find .env in wrong directory"
**Solution**: Make sure you're running from the correct location:
```bash
# Current should be:
C:\Users\sujay\Desktop\All_projects_folder\NUEROHUB\src\aiagentrag

# NOT:
C:\Users\sujay\Desktop\All_projects_folder\NUEROHUB\src\aiagentrag\src\aiagentrag
```

---

## Files You Need

- ✅ `.env` (project root) - contains GROQ_API_KEY
- ✅ `src/aiagentrag/startup_parent.py` - starter script
- ✅ `src/aiagentrag/rag_api_parent.py` - API server
- ✅ `src/aiagentrag/rag_pipeline_parent.py` - logic
- ✅ `src/aiagentrag/requirements.txt` - dependencies

---

## Performance Targets

After starting, verify these speeds:

| Query | Expected Time | Status |
|-------|---|---|
| "hello" | <100ms | ✓ |
| "thanks" | <150ms | ✓ |
| Real question | 2-4 sec | ✓ |
| Cached answer | <100ms | ✓ |

---

## Next Steps

1. ✅ Start API: `start_parent_api.bat` or `python startup_parent.py`
2. ✅ Test: http://localhost:8001/docs
3. ✅ Query: Send test messages
4. ✅ Monitor: Check response times

---

**Need help?** Check `PARENT_SYSTEM_GUIDE.md` for full documentation.
