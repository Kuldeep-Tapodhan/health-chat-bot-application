"""
Script to re-index all PDFs in the data folder into ChromaDB.
Run this when you add new documents to update the RAG system.

Usage: python reingest_documents.py
"""

import asyncio
import os
from pathlib import Path
from services.rag_service import ingest_document, get_vectorstore

DATA_DIR = Path(__file__).resolve().parent / "data"

async def reingest_all():
    """Re-ingest all PDF and TXT files from the data directory."""
    
    # Get all PDF and TXT files
    files = list(DATA_DIR.glob("*.pdf")) + list(DATA_DIR.glob("*.txt"))
    
    print(f"Found {len(files)} documents to ingest")
    print("-" * 50)
    
    total_chunks = 0
    success_count = 0
    failed_files = []
    
    for i, file_path in enumerate(files, 1):
        try:
            print(f"[{i}/{len(files)}] Ingesting: {file_path.name}...")
            chunks = await ingest_document(str(file_path))
            total_chunks += chunks
            success_count += 1
            print(f"  ✓ Added {chunks} chunks")
        except Exception as e:
            print(f"  ✗ Failed: {str(e)[:50]}")
            failed_files.append(file_path.name)
    
    print("-" * 50)
    print(f"✅ Successfully ingested: {success_count}/{len(files)} files")
    print(f"📊 Total chunks added: {total_chunks}")
    
    if failed_files:
        print(f"\n⚠️ Failed files:")
        for f in failed_files:
            print(f"  - {f}")

def clear_and_reingest():
    """Clear the existing database and reingest everything."""
    import shutil
    
    db_path = Path(__file__).resolve().parent / "chroma_db"
    
    if db_path.exists():
        print("🗑️ Clearing existing ChromaDB...")
        try:
            shutil.rmtree(db_path)
            print("  ✓ Cleared")
        except PermissionError:
            print("\n⚠️ ERROR: Cannot clear database - files are in use!")
            print("=" * 50)
            print("The backend server is using the database.")
            print("\nPlease follow these steps:")
            print("1. Stop the backend server (Ctrl+C in uvicorn terminal)")
            print("2. Run this script again")
            print("3. Restart the backend server after ingestion completes")
            print("=" * 50)
            return
    
    # Recreate the directory
    db_path.mkdir(exist_ok=True)
    
    # Run ingestion
    asyncio.run(reingest_all())

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--clear":
        print("🔄 FULL RE-INDEX MODE (clearing existing data)")
        clear_and_reingest()
    else:
        print("🔄 INCREMENTAL MODE (adding to existing data)")
        print("Use --clear flag to clear and rebuild from scratch")
        asyncio.run(reingest_all())
