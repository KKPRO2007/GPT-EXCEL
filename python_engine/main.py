import os
import shutil

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from analysis import analyze_data
from excel_generator import read_excel, generate_advanced_excel
from charts import create_chart
from data_cleaning import clean_data
from report_generator import generate_report
from word_generator import generate_word_report
from ppt_generator import generate_ppt
from prompt_engine import process_prompt
from file_segmentation import (
    segment_by_column, segment_by_row_count,
    segment_by_date_column, merge_excel_files, get_file_info
)
from sqlite_storage import (
    save_file_record, get_all_files, get_file_by_id,
    save_analysis, get_analysis_by_file,
    save_generated_file, get_generated_files,
    get_automation_logs, get_db_stats
)
from automation import run_in_background

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="GPT Excel — Python Engine",
    version="2.0.0",
    description="Data processing, analysis, chart, doc, PPT generation engine"
)

ELECTRON_ORIGIN = os.environ.get("ELECTRON_ORIGIN", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ELECTRON_ORIGIN, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    run_in_background()


# ── Helpers ───────────────────────────────────────────────────────────────────
def save_upload(file: UploadFile) -> str:
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return file_path


def out(filename: str) -> str:
    return os.path.join(OUTPUT_DIR, filename)


def _record_file(file_path: str) -> int:
    try:
        df = pd.read_excel(file_path)
        return save_file_record(
            filename=os.path.basename(file_path),
            file_path=file_path,
            row_count=len(df),
            col_count=len(df.columns),
            columns=list(df.columns),
        )
    except Exception:
        return save_file_record(os.path.basename(file_path), file_path)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status": "running",
        "engine": "GPT Excel Python Engine",
        "version": "2.0.0",
    }


# ── File Upload ───────────────────────────────────────────────────────────────
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only Excel files (.xlsx / .xls) are allowed")
    file_path = save_upload(file)
    file_id = _record_file(file_path)
    return {"message": "File uploaded successfully", "file_path": file_path, "file_id": file_id}


@app.post("/read")
async def read_file(file: UploadFile = File(...)):
    file_path = save_upload(file)
    data = read_excel(file_path)
    return {"data": data}


# ── Core Processing ───────────────────────────────────────────────────────────
@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    file_path = save_upload(file)
    result = analyze_data(file_path)
    file_id = _record_file(file_path)
    save_analysis(file_id, "analyze", result)
    return {"analysis": result}


@app.post("/chart")
async def generate_chart(
    file: UploadFile = File(...),
    chart_type: str = Query("auto", description="bar | line | pie | scatter | auto")
):
    file_path = save_upload(file)
    output_path = out("chart.png")
    result = create_chart(file_path, chart_type, output_path=output_path)
    file_id = _record_file(file_path)
    save_generated_file(file_id, "chart", output_path)
    return {"message": result, "chart_path": output_path}


@app.post("/clean")
async def clean_file(file: UploadFile = File(...)):
    file_path = save_upload(file)
    output_path = out("cleaned_data.xlsx")
    result = clean_data(file_path, output_path=output_path)
    file_id = _record_file(file_path)
    save_generated_file(file_id, "cleaned_excel", output_path)
    return {"message": result, "output_path": output_path}


@app.post("/report")
async def create_report(file: UploadFile = File(...)):
    file_path = save_upload(file)
    output_path = out("report.txt")
    result = generate_report(file_path, output_path=output_path)
    file_id = _record_file(file_path)
    save_generated_file(file_id, "report_txt", output_path)
    return {"message": result, "output_path": output_path}


# ── Document Generation ───────────────────────────────────────────────────────
@app.post("/word")
async def create_word(file: UploadFile = File(...)):
    file_path = save_upload(file)
    output_path = out("output_report.docx")
    result = generate_word_report(file_path, output_path=output_path)
    file_id = _record_file(file_path)
    save_generated_file(file_id, "word_doc", output_path)
    return {"message": result, "output_path": output_path}


@app.post("/ppt")
async def create_ppt(file: UploadFile = File(...)):
    file_path = save_upload(file)
    output_path = out("output_report.pptx")
    result = generate_ppt(file_path, output_path=output_path)
    file_id = _record_file(file_path)
    save_generated_file(file_id, "pptx", output_path)
    return {"message": result, "output_path": output_path}


@app.post("/excel-advanced")
async def create_advanced_excel(file: UploadFile = File(...)):
    file_path = save_upload(file)
    output_path = out("final_output.xlsx")
    result = generate_advanced_excel(file_path, output_path=output_path)
    file_id = _record_file(file_path)
    save_generated_file(file_id, "advanced_excel", output_path)
    return {"message": result, "output_path": output_path}


# ── File Segmentation ─────────────────────────────────────────────────────────
@app.post("/segment/by-column")
async def segment_column(
    file: UploadFile = File(...),
    column: str = Query(..., description="Column name to segment by")
):
    file_path = save_upload(file)
    result = segment_by_column(file_path, column, output_dir=out("segments"))
    return result


@app.post("/segment/by-rows")
async def segment_rows(
    file: UploadFile = File(...),
    chunk_size: int = Query(1000, description="Rows per chunk")
):
    file_path = save_upload(file)
    result = segment_by_row_count(file_path, chunk_size, output_dir=out("segments"))
    return result


@app.post("/segment/by-date")
async def segment_date(
    file: UploadFile = File(...),
    date_column: str = Query(..., description="Date column name"),
    freq: str = Query("M", description="D=daily W=weekly M=monthly Q=quarterly Y=yearly")
):
    file_path = save_upload(file)
    result = segment_by_date_column(file_path, date_column, freq, output_dir=out("segments"))
    return result


@app.post("/file-info")
async def file_info(file: UploadFile = File(...)):
    file_path = save_upload(file)
    return get_file_info(file_path)


# ── Smart Prompt ──────────────────────────────────────────────────────────────
@app.post("/process")
async def process_with_prompt(
    file: UploadFile = File(...),
    prompt: str = Query(..., description="Natural language instruction")
):
    if not prompt.strip():
        raise HTTPException(400, "Prompt cannot be empty")
    file_path = save_upload(file)
    result = process_prompt(file_path, prompt)
    return {"result": result}


# ── File Download ─────────────────────────────────────────────────────────────
@app.get("/download")
def download_file(path: str = Query(..., description="File path to download")):
    if not os.path.exists(path):
        raise HTTPException(404, f"File not found: {path}")
    return FileResponse(path, filename=os.path.basename(path))


# ── SQLite / History ──────────────────────────────────────────────────────────
@app.get("/history/files")
def history_files():
    return {"files": get_all_files()}


@app.get("/history/files/{file_id}")
def history_file(file_id: int):
    record = get_file_by_id(file_id)
    if not record:
        raise HTTPException(404, "File record not found")
    return record


@app.get("/history/analysis/{file_id}")
def history_analysis(file_id: int):
    return {"results": get_analysis_by_file(file_id)}


@app.get("/history/outputs/{file_id}")
def history_outputs(file_id: int):
    return {"outputs": get_generated_files(file_id)}


@app.get("/history/automation")
def history_automation(limit: int = Query(50)):
    return {"logs": get_automation_logs(limit)}


@app.get("/db/stats")
def db_stats():
    return get_db_stats()
