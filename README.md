# Install dependencies
npm install

# Run development server
npm run dev

---

# 🐍 Python Engine (Backend)
This is the Python-based backend engine for Excel GPT. It handles Excel processing, data analysis, chart generation, and prompt-based operations.

--##  Setup (Backend)

### 1. Go to Python Engine folder
```bash```
cd python_engine

# Install dependencies
pip install fastapi uvicorn pandas matplotlib openpyxl

# Run server
uvicorn main:app --reload

# Open API docs
http://127.0.0.1:8000/docs
