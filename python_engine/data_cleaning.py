import pandas as pd
 
 
def clean_data(file_path: str, output_path: str = "cleaned_data.xlsx") -> str:
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        return f"Could not read file: {str(e)}"
 
    original_rows = len(df)
 
    df.drop_duplicates(inplace=True)
    rows_after_dedup = len(df)
 
    for col in df.columns:
        if df[col].dtype in ["float64", "int64"]:
            df[col].fillna(df[col].median(), inplace=True)
        else:
            df[col].fillna("Unknown", inplace=True)
 
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]
 
    try:
        df.to_excel(output_path, index=False)
    except Exception as e:
        return f"Could not save cleaned file: {str(e)}"
 
    removed_rows = original_rows - rows_after_dedup
    return (
        f"Data cleaned successfully. "
        f"Removed {removed_rows} duplicate rows. "
        f"Filled missing values. Saved to: {output_path}"
    )
