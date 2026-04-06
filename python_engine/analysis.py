import pandas as pd
 
 
def analyze_data(file_path: str) -> dict:
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        return {"error": f"Could not read file: {str(e)}"}
 
    summary = {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": list(df.columns),
        "data_types": df.dtypes.astype(str).to_dict(),
        "null_values": df.isnull().sum().to_dict(),
        "null_percentage": (df.isnull().mean() * 100).round(2).to_dict(),
        "duplicate_rows": int(df.duplicated().sum()),
    }
 
    try:
        summary["statistics"] = df.describe().round(2).to_dict()
    except Exception:
        summary["statistics"] = "Not applicable"
 
    return summary
 
