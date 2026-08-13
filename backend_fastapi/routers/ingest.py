from fastapi import APIRouter, UploadFile, File, HTTPException
from services.rag_service import ingest_document
from services.data_service import save_csv
import shutil
import os
from typing import List

router = APIRouter()

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = os.path.join(BASE_DIR, "data")

@router.post("/upload")
async def upload_document(files: List[UploadFile] = File(...)):
    """
    Upload multiple documents (PDF, TXT, CSV).
    - PDF/TXT: Ingested into Vector Store.
    - CSV: Saved for Data Analysis.
    """
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    results = []
    
    for file in files:
        file_extension = file.filename.split(".")[-1].lower()
        
        if file_extension not in ["pdf", "txt", "csv"]:
            results.append({"filename": file.filename, "status": "skipped", "reason": "Unsupported file type"})
            continue

        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        try:
            # Save file locally
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            if file_extension == "csv":
                results.append({"filename": file.filename, "status": "success", "type": "csv", "message": "Saved for analysis"})
            else:
                # Ingest PDF/TXT into Vector Store
                # We await here, assuming sequential ingestion is acceptable for now.
                # For large batches, background tasks would be better, but avoiding complexity.
                num_chunks = await ingest_document(file_path)
                results.append({"filename": file.filename, "status": "success", "type": "text", "chunks": num_chunks})
                
        except Exception as e:
            results.append({"filename": file.filename, "status": "error", "error": str(e)})

    return {"message": f"Processed {len(files)} files", "results": results}

@router.get("/files")
async def list_files():
    """List all uploaded files."""
    if not os.path.exists(UPLOAD_DIR):
        return []
    
    files = []
    for filename in os.listdir(UPLOAD_DIR):
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.isfile(file_path):
            stats = os.stat(file_path)
            files.append({
                "name": filename,
                "size": stats.st_size,
                "type": filename.split(".")[-1].lower()
            })
    return files

@router.delete("/files/{filename}")
async def delete_file(filename: str):
    """Delete an uploaded file."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        os.remove(file_path)
        return {"message": f"File {filename} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")
