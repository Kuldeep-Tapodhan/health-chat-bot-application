from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os

# Initialize Vector Store
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
VECTOR_DB_DIR = os.path.join(BASE_DIR, "chroma_db")
# Use Google Embeddings via API to avoid massive local Torch dependencies
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")


def get_vectorstore():
    return Chroma(persist_directory=VECTOR_DB_DIR, embedding_function=embeddings, collection_metadata={"hnsw:space": "cosine"})

async def ingest_document(file_path: str) -> int:
    """
    Ingests a document into the ChromaDB vector store.
    """
    if file_path.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    elif file_path.endswith(".txt"):
        loader = TextLoader(file_path)
    else:
        raise ValueError("Unsupported file type for vector ingestion")

    documents = loader.load()
    
    # Split text
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=400)
    chunks = text_splitter.split_documents(documents)
    
    # Add to Vector Store
    vectorstore = get_vectorstore()
    vectorstore.add_documents(chunks)
    
    return len(chunks)

def get_retriever():
    vectorstore = get_vectorstore()
    return vectorstore.as_retriever(search_kwargs={"k": 10})
