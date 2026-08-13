import asyncio
import os
import sys

# Add the current directory to sys.path so we can import from services
sys.path.append(os.getcwd())

from backend_fastapi.services.rag_service import ingest_document

async def main():
    file_path = os.path.abspath("backend_fastapi/data/tb_guidelines.txt")
    print(f"Ingesting {file_path}...")
    try:
        num_chunks = await ingest_document(file_path)
        print(f"Successfully ingested {num_chunks} chunks.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
