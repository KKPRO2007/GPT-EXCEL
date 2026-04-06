import schedule
import time
import threading
from analysis import analyze_data
from charts import create_chart

WATCHED_FILE = "uploads/latest.xlsx"


def auto_analyze():
    print("[Automation] Running scheduled analysis...")
    try:
        result = analyze_data(WATCHED_FILE)
        print(f"[Automation] Analysis done: {result['total_rows']} rows, {result['total_columns']} columns")
    except Exception as e:
        print(f"[Automation] Analysis failed: {e}")


def auto_chart():
    print("[Automation] Running scheduled chart generation...")
    try:
        result = create_chart(WATCHED_FILE, chart_type="auto")
        print(f"[Automation] {result}")
    except Exception as e:
        print(f"[Automation] Chart failed: {e}")


def start_scheduler():
    schedule.every(5).minutes.do(auto_analyze)
    schedule.every(10).minutes.do(auto_chart)

    print("[Automation] Scheduler started.")
    while True:
        schedule.run_pending()
        time.sleep(1)


def run_in_background():
    thread = threading.Thread(target=start_scheduler, daemon=True)
    thread.start()
    print("[Automation] Background scheduler running.")
