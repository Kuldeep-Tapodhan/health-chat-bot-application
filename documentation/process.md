# Regional Health Assistance Chatbot - Process Diagram

> **Research Paper Documentation**  
> Complete Website Process Flow and System Architecture

---

## 1. Complete System Process Flow

```mermaid
flowchart TD
    subgraph Users["👤 USERS"]
        U1["Health Seekers"]
        U2["Administrators"]
    end

    subgraph Website["🌐 WEBSITE (Next.js 14)"]
        direction TB
        HP["Home Page"]
        RC["Regional Chat"]
        AC["AI Chat"]
        RA["Report Analyzer"]
        AD["Admin Dashboard"]
    end

    subgraph Backend["⚙️ BACKEND (FastAPI)"]
        direction TB
        API1["/api/chat/regional"]
        API2["/api/chat/ai"]
        API3["/api/reports/analyze"]
        API4["/api/ingest/upload"]
        API5["/api/translate"]
        API6["/api/tts"]
        API7["/api/admin/stats"]
    end

    subgraph Processing["🔄 PROCESSING ENGINE"]
        direction TB
        
        subgraph RAG["RAG Pipeline"]
            R1["Document Loader"]
            R2["Text Splitter<br/>(2000 chars)"]
            R3["Embedding Generator<br/>(all-MiniLM-L6-v2)"]
            R4["Vector Retriever<br/>(Top 100)"]
        end
        
        subgraph Query["Query Handler"]
            Q1["Spell Correction"]
            Q2["Intent Detection"]
            Q3["Query Router"]
        end
        
        subgraph Analysis["Data Analysis"]
            A1["Pandas Agent"]
            A2["Geospatial Search"]
            A3["Chart Generator"]
        end
        
        subgraph Services["Services"]
            S1["Translation"]
            S2["Text-to-Speech"]
            S3["OCR Engine"]
        end
    end

    subgraph AI["🤖 AI MODELS"]
        LLM["Llama 3.3 70B<br/>(Lightning AI)"]
        CM["Custom Health Model"]
        VM["Vision Model"]
    end

    subgraph Storage["💾 DATA STORAGE"]
        DB1[("ChromaDB<br/>Vectors")]
        DB2[("PostgreSQL<br/>Chat History")]
        DB3[("CSV Files<br/>Hospital Data")]
        DB4[("Documents<br/>PDFs/TXTs")]
    end

    %% User to Website
    U1 --> HP
    U1 --> RC
    U1 --> AC
    U1 --> RA
    U2 --> AD

    %% Website to Backend
    RC --> API1
    AC --> API2
    RA --> API3
    AD --> API4
    AD --> API7

    %% Backend to Processing
    API1 --> Query
    API1 --> RAG
    API2 --> Query
    API3 --> S3
    API4 --> R1
    API5 --> S1
    API6 --> S2

    %% Processing Flow
    R1 --> R2 --> R3 --> DB1
    R4 --> DB1
    Q1 --> Q2 --> Q3
    A1 --> DB3
    S3 --> VM

    %% To AI Models
    Q3 --> LLM
    R4 --> LLM
    A1 --> LLM
    API2 --> CM

    %% AI to Services
    LLM --> S1
    LLM --> S2
    LLM --> DB2

    %% Storage connections
    DB4 --> R1
```

---

## 2. User Journey Flow

```mermaid
flowchart LR
    subgraph Journey["User Journey"]
        direction LR
        J1["🏠 Visit Website"] --> J2["📍 Select Feature"]
        J2 --> J3["💬 Enter Query"]
        J3 --> J4["⏳ Processing"]
        J4 --> J5["📋 View Response"]
        J5 --> J6["🔊 Listen/Translate"]
    end
```

---

## 3. Feature Process Flow (Combined)

```mermaid
flowchart LR
    %% ===== USER INPUT =====
    subgraph Input["📥 USER INPUT"]
        direction TB
        U1["💬 Regional Chat<br/>Health Query"]
        U2["🤖 AI Chat<br/>General Query"]
        U3["📄 Report Analyzer<br/>Upload PDF/Image"]
        U4["📁 Document Ingestion<br/>Upload Documents"]
    end

    %% ===== REGIONAL CHAT =====
    subgraph RC["REGIONAL CHAT FLOW"]
        direction LR
        RC1["Spell<br/>Correction"]
        RC2["Intent<br/>Classification"]
        RC3{"Query<br/>Type?"}
        RC4["RAG Retrieval<br/>(Top 100)"]
        RC5["Pandas Agent<br/>(CSV)"]
        RC6["Geo Search<br/>(Haversine)"]
        RC7["Context<br/>Assembly"]
        
        RC1 --> RC2 --> RC3
        RC3 -->|Health| RC4
        RC3 -->|Data| RC5
        RC3 -->|Location| RC6
        RC4 --> RC7
        RC5 --> RC7
        RC6 --> RC7
    end

    %% ===== AI CHAT =====
    subgraph AC["AI CHAT FLOW"]
        direction LR
        AC1["Lightning<br/>AI API"] --> AC2["Custom Health<br/>Model"]
    end

    %% ===== REPORT ANALYZER =====
    subgraph RP["REPORT ANALYZER FLOW"]
        direction LR
        RP1{"File<br/>Type?"}
        RP2["PyPDF<br/>Extract"]
        RP3["OCR<br/>(Tesseract)"]
        RP4["Text<br/>Content"]
        RP5["Vision<br/>Model"]
        
        RP1 -->|PDF| RP2 --> RP4
        RP1 -->|Image| RP3 --> RP4
        RP4 --> RP5
    end

    %% ===== DOCUMENT INGESTION =====
    subgraph IN["DOCUMENT INGESTION FLOW"]
        direction LR
        IN1{"File<br/>Type?"}
        IN2["Text<br/>Extraction"]
        IN3["Text Splitter<br/>(2000 chars)"]
        IN4["Embeddings<br/>(384-dim)"]
        IN5[("ChromaDB")]
        IN6["Save to<br/>Data Folder"]
        
        IN1 -->|PDF/TXT| IN2 --> IN3 --> IN4 --> IN5
        IN1 -->|CSV| IN6
    end

    %% ===== LLM PROCESSING =====
    subgraph LLM["🤖 LLM PROCESSING"]
        L1["Llama 3.3 70B"]
    end

    %% ===== OUTPUT =====
    subgraph Output["📤 OUTPUT"]
        direction TB
        O1["Generate<br/>Response"]
        O2["Translation<br/>(Optional)"]
        O3["Text-to-Speech"]
        O4["Save to<br/>PostgreSQL"]
        O5["👤 Display<br/>to User"]
        
        O1 --> O2
        O1 --> O3
        O1 --> O4
        O2 --> O5
        O3 --> O5
    end

    %% ===== MAIN CONNECTIONS =====
    U1 --> RC1
    U2 --> AC1
    U3 --> RP1
    U4 --> IN1

    RC7 --> L1
    AC2 --> L1
    RP5 --> L1
    
    IN5 -.->|Stored for RAG| RC4

    L1 --> O1
```

---

## 4. Data Flow Diagram

```mermaid
flowchart LR
    subgraph Input["📥 INPUT"]
        I1["User Queries"]
        I2["Documents"]
        I3["Reports"]
    end

    subgraph Process["⚙️ PROCESS"]
        P1["Query Processing"]
        P2["RAG Retrieval"]
        P3["LLM Generation"]
    end

    subgraph Output["📤 OUTPUT"]
        O1["Text Response"]
        O2["Audio Response"]
        O3["Charts/Tables"]
        O4["Translations"]
    end

    I1 --> P1 --> P2 --> P3
    I2 --> P2
    I3 --> P3
    
    P3 --> O1
    P3 --> O2
    P3 --> O3
    P3 --> O4
```

---

## 5. Technology Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer"]
        F1["Next.js 14"]
        F2["TypeScript"]
        F3["TailwindCSS"]
        F4["React Components"]
    end

    subgraph Backend["Backend Layer"]
        B1["FastAPI"]
        B2["Python 3.10+"]
        B3["LangChain"]
        B4["Pydantic"]
    end

    subgraph AI["AI/ML Layer"]
        A1["Llama 3.3 70B"]
        A2["all-MiniLM-L6-v2"]
        A3["Tesseract OCR"]
        A4["gTTS"]
    end

    subgraph Data["Data Layer"]
        D1["ChromaDB"]
        D2["PostgreSQL"]
        D3["CSV Files"]
    end

    Frontend --> Backend --> AI --> Data
```

---

## 6. API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat/regional` | POST | RAG-based health Q&A |
| `/api/chat/ai` | POST | Direct AI conversation |
| `/api/reports/analyze` | POST | Medical report analysis |
| `/api/ingest/upload` | POST | Document ingestion |
| `/api/translate` | POST | Multi-language translation |
| `/api/tts` | POST | Text-to-speech conversion |
| `/api/admin/stats` | GET | Dashboard statistics |

---

## 7. Simplified Linear Process

```mermaid
flowchart TD
    A["📄 Step 1: Data Ingestion<br/>Upload PDF/TXT/CSV documents"]
    B["📥 Step 2: Document Processing<br/>Load → Split → Embed → Store in ChromaDB"]
    C["💬 Step 3: User Query<br/>Enter health question via website"]
    D["🔍 Step 4: Query Processing<br/>Spell Check → Intent Detection → Route Query"]
    E["📚 Step 5: Information Retrieval<br/>Vector Search → Get Top 100 relevant chunks"]
    F["🤖 Step 6: Response Generation<br/>LLM processes context + query → Generate answer"]
    G["🌐 Step 7: Post-Processing<br/>Translate → Text-to-Speech → Save history"]
    H["👤 Step 8: Display Response<br/>Show formatted answer to user"]
    
    A --> B --> C --> D --> E --> F --> G --> H
```

---

## 8. System Components Table

| Component | Technology | Description |
|-----------|------------|-------------|
| **Website** | Next.js 14 | React-based frontend with TypeScript |
| **API Server** | FastAPI | High-performance Python backend |
| **Vector Database** | ChromaDB | Store and retrieve document embeddings |
| **User Database** | PostgreSQL | Chat history and user sessions |
| **LLM** | Llama 3.3 70B | Primary language model via Lightning AI |
| **Embeddings** | all-MiniLM-L6-v2 | 384-dimensional sentence embeddings |
| **Translation** | LLM-based | Multi-language support (Hindi, Gujarati, etc.) |
| **TTS** | gTTS | Convert text responses to audio |
| **OCR** | Tesseract | Extract text from images |

---

## 9. Security & Performance

| Aspect | Implementation |
|--------|----------------|
| **API Security** | CORS, Rate Limiting |
| **Data Privacy** | Local vector storage |
| **Performance** | Streaming responses |
| **Scalability** | Async FastAPI endpoints |
| **Caching** | ChromaDB persistence |

---
