import os
import uuid
import logging
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
import scipy.stats as stats
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)

# Load env variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="StatPlot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    dataset_id: str
    user_id: str
    test_type: str  # chi_square, anova, t_test, correlation
    target_col: Optional[str] = None
    group_col: Optional[str] = None
    var1_col: Optional[str] = None
    var2_col: Optional[str] = None

@app.post("/analyze")
async def analyze_dataset(req: AnalyzeRequest):
    # 1. Fetch Dataset Metadata
    dataset_res = supabase.table("datasets").select("*").eq("id", req.dataset_id).execute()
    if not dataset_res.data:
        raise HTTPException(status_code=404, detail="Dataset not found in tracking table.")
    
    dataset = dataset_res.data[0]
    file_url = dataset["file_url"]
    
    # 2. Download from Supabase Storage
    # file_url is expected to be the path in the "datasets" bucket (e.g. "user_id/uuid_name.csv")
    temp_path = f"/tmp/{uuid.uuid4()}_{dataset['file_name']}"
    os.makedirs("/tmp", exist_ok=True)
    
    try:
        storage_res = supabase.storage.from_("datasets").download(file_url)
        with open(temp_path, "wb") as f:
            f.write(storage_res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download dataset from storage: {e}")
        
    # 3. Load & Clean Data
    try:
        if dataset['file_name'].lower().endswith('.csv'):
            df = pd.read_csv(temp_path)
        else:
            df = pd.read_excel(temp_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    # 4. Statistical Computations
    result_stat = 0.0
    result_p = 0.0
    conclusion = ""
    additional_output = {}

    try:
        if req.test_type == "chi_square":
            if not req.var1_col or not req.var2_col:
                raise HTTPException(status_code=400, detail="Missing var1_col or var2_col")
            # Cross tabulation
            contingency_table = pd.crosstab(df[req.var1_col], df[req.var2_col])
            chi2, p, dof, expected = stats.chi2_contingency(contingency_table)
            result_stat = float(chi2)
            result_p = float(p)
            conclusion = f"Variables '{req.var1_col}' and '{req.var2_col}' are {'dependent' if p < 0.05 else 'independent'}."
            additional_output = {
                "dof": int(dof),
                "expected_frequencies": expected.tolist()
            }
            
        elif req.test_type == "anova":
            if not req.target_col or not req.group_col:
                raise HTTPException(status_code=400, detail="Missing target_col or group_col")
            # Group distributions
            groups = [group[req.target_col].dropna().values for _, group in df.groupby(req.group_col)]
            f_stat, p = stats.f_oneway(*groups)
            result_stat = float(f_stat)
            result_p = float(p)
            conclusion = f"The means of '{req.target_col}' across '{req.group_col}' are {'significantly different' if p < 0.05 else 'not significantly different'}."
            
        elif req.test_type == "t_test":
            if not req.target_col or not req.group_col:
                raise HTTPException(status_code=400, detail="Missing target_col or group_col")
            groups = [group[req.target_col].dropna().values for _, group in df.groupby(req.group_col)]
            if len(groups) != 2:
                raise HTTPException(status_code=400, detail="Independent T-test requires exactly 2 groups within group_col.")
            t_stat, p = stats.ttest_ind(groups[0], groups[1])
            result_stat = float(t_stat)
            result_p = float(p)
            conclusion = f"The means of the two groups are {'significantly different' if p < 0.05 else 'not significantly different'}."
            
        elif req.test_type == "correlation":
            if not req.var1_col or not req.var2_col:
                raise HTTPException(status_code=400, detail="Missing var1_col or var2_col")
            clean_df = df[[req.var1_col, req.var2_col]].dropna()
            r, p = stats.pearsonr(clean_df[req.var1_col], clean_df[req.var2_col])
            result_stat = float(r)
            result_p = float(p)
            conclusion = f"There is a {'significant' if p < 0.05 else 'non-significant'} linear relationship between '{req.var1_col}' and '{req.var2_col}'."
        else:
            raise HTTPException(status_code=400, detail="Unknown test_type.")
            
    except Exception as e:
        logging.error(e)
        raise HTTPException(status_code=500, detail=f"Statistical computation failed: {str(e)}")

    # 5. Insert Analysis Record
    analysis_data = {
        "user_id": req.user_id,
        "dataset_id": req.dataset_id,
        "test_type": req.test_type
    }
    analysis_res = supabase.table("analyses").insert(analysis_data).execute()
    new_analysis_id = analysis_res.data[0]["id"]
    
    # 6. Insert Results Record
    result_data = {
        "analysis_id": new_analysis_id,
        "statistic_value": result_stat,
        "p_value": result_p,
        "conclusion": conclusion,
        "additional_output": additional_output
    }
    results_res = supabase.table("results").insert(result_data).execute()
    
    return {
        "status": "success",
        "analysis_id": new_analysis_id,
        "result_id": results_res.data[0]["id"],
        "statistic": result_stat,
        "p_value": result_p,
        "conclusion": conclusion,
        "additional_output": additional_output
    }

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
