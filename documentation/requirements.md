# Health-Assistance Project Requirements

This document lists all the library dependencies used in the Health-Assistance project.

---

## Backend (FastAPI) - `backend_fastapi/requirements.txt`

| Library | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.109.0 | Web API framework |
| `uvicorn` | 0.27.0 | ASGI server |
| `python-multipart` | 0.0.6 | File upload handling |
| `langchain` | 0.2.16 | LLM framework |
| `langchain-community` | 0.2.16 | LangChain community integrations |
| `langchain-experimental` | 0.0.64 | Experimental LangChain features |
| `langchain-openai` | 0.1.23 | OpenAI integration for LangChain |
| `langchain-google-genai` | 1.0.10 | Google Generative AI integration |
| `chromadb` | 0.5.0 | Vector database for RAG |
| `pydantic` | 2.8.2 | Data validation |
| `pandas` | 2.1.4 | Data manipulation |
| `pypdf` | 3.17.4 | PDF parsing |
| `pytesseract` | 0.3.10 | OCR text extraction |
| `tabulate` | 0.9.0 | Table formatting |
| `python-dotenv` | 1.0.0 | Environment variable management |
| `sentence-transformers` | 3.0.1 | Embeddings for RAG |
| `SpeechRecognition` | 3.10.3 | Speech-to-text |
| `gTTS` | 2.5.1 | Text-to-speech (Google TTS) |
| `pydub` | 0.25.1 | Audio processing |
| `soundfile` | 0.12.1 | Audio file handling |
| `numpy` | 1.26.4 | Numerical operations |
| `geopy` | 2.4.1 | Geocoding/location services |
| `deep-translator` | 1.11.4 | Translation services |
| `google-generativeai` | >=0.8.3 | Google Gemini API |

---

## Frontend (Next.js) - `health-chatbot-app/package.json`

### Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| `@google/generative-ai` | ^0.24.1 | Google Gemini client |
| `@heroicons/react` | ^2.2.0 | Icon library |
| `@types/jspdf` | ^1.3.3 | jsPDF type definitions |
| `appwrite` | ^21.5.0 | Backend-as-a-Service |
| `clsx` | ^2.1.1 | Conditional classNames |
| `firebase` | ^12.6.0 | Firebase SDK |
| `jspdf` | ^3.0.4 | PDF generation |
| `lucide-react` | ^0.555.0 | Icon library |
| `next` | 16.0.6 | React framework |
| `react` | 19.2.0 | UI library |
| `react-dom` | 19.2.0 | React DOM renderer |
| `react-hot-toast` | ^2.6.0 | Toast notifications |
| `react-markdown` | ^10.1.0 | Markdown rendering |
| `recharts` | ^3.5.1 | Charting library |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown |
| `tailwind-merge` | ^3.4.0 | Tailwind class merging |
| `tesseract.js` | ^7.0.0 | Client-side OCR |

### Dev Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| `@tailwindcss/postcss` | ^4 | Tailwind PostCSS plugin |
| `@types/node` | ^20 | Node.js type definitions |
| `@types/react` | ^19 | React type definitions |
| `@types/react-dom` | ^19 | ReactDOM type definitions |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 16.0.6 | Next.js ESLint config |
| `tailwindcss` | ^4 | CSS framework |
| `typescript` | ^5 | TypeScript |

---

## Installation Instructions

### Backend (FastAPI)
```bash
cd backend_fastapi
pip install -r requirements.txt
```

### Frontend (Next.js)
```bash
cd health-chatbot-app
npm install
```
