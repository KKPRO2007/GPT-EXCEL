# GPT-EXCEL 
Desktop application built with Electron, React, and Python (FastAPI) to generate Excel files, documents, charts, and automation workflows using natural language.

---

## 🚀 Quick Start (Frontend + Electron)

```bash
npm install
npm run dev
```

The app will launch automatically.

---

## 🐍 Python Backend (Excel Engine)

```bash
cd python_engine
pip install fastapi uvicorn pandas matplotlib openpyxl schedule xlsxwriter
uvicorn main:app --reload
```

Runs on: http://127.0.0.1:8000  
API Docs: http://127.0.0.1:8000/docs  

Handles Excel generation, data processing, and chart creation.

---

## 📦 Build

```bash
npm run dist
```

Production build will be available in the `release/` folder.

---

## ⚙️ Tech Stack

- **Frontend:** React + Electron  
- **Backend:** Node.js (API layer)  
- **Python Engine:** FastAPI, Pandas, OpenPyXL  
- **AI Integration:** LLM APIs  

---
