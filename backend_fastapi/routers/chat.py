from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.rag_service import get_retriever
from services.data_service import list_csvs, get_csv_path

from langchain.chains.retrieval import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_experimental.agents import create_pandas_dataframe_agent

import pandas as pd
import json
import os

router = APIRouter()

class ChatRequest(BaseModel):
    text: str
    mode: str = "rag"
    history: list[dict] = []
    language: str = "en-in"

class ChatResponse(BaseModel):
    message: str
    chart_data: dict = None

class StreamRequest(BaseModel):
    message: str

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Initialize LLM
llm = ChatGoogleGenerativeAI(
    api_key=os.getenv("GOOGLE_API_KEY"),
    model=MODEL_NAME,
    temperature=0
)

# Global Cache for DataFrames
DF_CACHE = {}

@router.post("/stream")
async def chat_stream(request: StreamRequest):
    async def generate():
        try:
            async for chunk in llm.astream(request.message):
                if hasattr(chunk, "content") and chunk.content:
                    yield chunk.content
        except Exception as e:
            yield f"Error generating response: {str(e)}"

    return StreamingResponse(generate(), media_type="text/plain")

@router.post("/query", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    from fastapi.concurrency import run_in_threadpool
    from langchain.chains import ConversationalRetrievalChain
    import asyncio
    
    # Spell Check / Query Refinement
    corrected_text = request.text
    for attempt in range(2): # Retry once
        try:
            correction_prompt = f"Correct any spelling mistakes in this query. Return ONLY the corrected text. Do not explain. Query: {request.text}"
            corrected_response = await run_in_threadpool(llm.invoke, correction_prompt)
            if corrected_response and corrected_response.content:
                corrected_text = corrected_response.content.strip()
                print(f"Original: {request.text} -> Corrected: {corrected_text}")
                break
        except Exception as e:
            print(f"Spell check failed (attempt {attempt+1}): {e}")
            await asyncio.sleep(1)

    query = corrected_text.lower()
    request.text = corrected_text # Update request object for downstream use
    
    # Format history for agents
    # Convert list of dicts to list of (human, ai) tuples for RAG
    chat_history = []
    for msg in request.history:
        if msg.get("role") == "user":
            chat_history.append((msg.get("content"), ""))
        elif msg.get("role") == "assistant" and chat_history:
            # Update the last tuple with the AI response
            last_human = chat_history[-1][0]
            chat_history[-1] = (last_human, msg.get("content"))
            
    # Intent Extraction
    intent = "general"
    location_query = ""
    distance_km = 5.0
    
    # Simple Router Logic
    is_data_query = any(keyword in query for keyword in ["chart", "plot", "graph", "trend", "analysis", "csv", "data", "hospital", "find", "location", "search", "list", "near"])

    if is_data_query:
        try:
            intent_prompt = f"""
            Analyze this query: "{request.text}"
            Return a JSON object with:
            - "intent": "nearby_search" if the user wants to find hospitals near a location, else "general_data".
            - "location": The specific location name to search for (e.g., "Nanavati Chowk").
            - "distance": The distance in km (default to 5.0 if not specified).
            
            Return ONLY the JSON.
            """
            intent_response = await run_in_threadpool(llm.invoke, intent_prompt)
            intent_data = json.loads(intent_response.content.replace("```json", "").replace("```", "").strip())
            intent = intent_data.get("intent", "general_data")
            location_query = intent_data.get("location", "")
            distance_km = float(intent_data.get("distance", 5.0))
        except Exception as e:
            print(f"Intent extraction failed: {e}")

    csv_files = list_csvs()
    
    if is_data_query and csv_files:
        # Use Pandas Agent
        csv_path = get_csv_path(csv_files[0])
        
        # Check Cache
        if csv_path in DF_CACHE:
            df = DF_CACHE[csv_path]
        else:
            df = pd.read_csv(csv_path)
            # Sanitize column names
            df.columns = df.columns.str.replace(r'[^\w\s]', '', regex=True).str.replace(' ', '_')
            
            # Pre-process coordinates for faster geospatial queries
            if 'Location_Coordinates' in df.columns:
                try:
                    # Split coordinates into Latitude and Longitude
                    # Handle cases where the split might not result in 2 columns by using n=1
                    coords = df['Location_Coordinates'].astype(str).str.split(',', n=1, expand=True)
                    if len(coords.columns) >= 2:
                        df['Latitude'] = pd.to_numeric(coords[0], errors='coerce')
                        df['Longitude'] = pd.to_numeric(coords[1], errors='coerce')
                except Exception as e:
                    print(f"Warning: Could not parse coordinates: {e}")

            DF_CACHE[csv_path] = df
            
        # FAST PATH: Direct Execution for Nearby Search
        if intent == "nearby_search" and location_query and 'Latitude' in df.columns and 'Longitude' in df.columns:
            try:
                print(f"Executing Fast Path: {location_query} ({distance_km} km)")
                result_df = find_nearby_hospitals(df, location_query, distance_km)
                
                if result_df.empty:
                    return ChatResponse(message=f"No hospitals found within {distance_km} km of '{location_query}'.")
                
                # Generate Summary
                response_msg = f"Here are the hospitals within {distance_km} km of **{location_query}**:\n\n"
                
                # Generate Table
                table_md = result_df.to_markdown(index=False)
                response_msg += table_md + "\n\n"
                
                # Generate Highlights
                response_msg += "### 🏥 Key Highlights:\n"
                
                # 1. Nearest Hospital
                nearest = result_df.iloc[0]
                response_msg += f"- **Nearest Hospital:** {nearest['Hospital_Name']} ({nearest['distance']} km)\n"
                
                # 2. Specialty Hospitals
                specialties = []
                keywords = {
                    "Heart": ["Heart", "Cardiac"],
                    "Eye": ["Eye", "Ophthal"],
                    "Maternity": ["Maternity", "Women", "Prasuti"],
                    "Ortho": ["Ortho", "Bone"],
                    "Neuro": ["Neuro", "Brain"],
                    "Kidney": ["Kidney", "Renal", "Uro"],
                    "Cancer": ["Cancer", "Onco"],
                    "Children": ["Child", "Pediatric"]
                }
                
                found_specialties = set()
                for index, row in result_df.iterrows():
                    name = row['Hospital_Name']
                    for spec, keys in keywords.items():
                        if any(k.lower() in name.lower() for k in keys):
                            if spec not in found_specialties:
                                specialties.append(f"{spec} ({name})")
                                found_specialties.add(spec)
                
                if specialties:
                    response_msg += f"- **Specialty Hospitals:** {', '.join(specialties[:3])}" # Limit to 3
                    if len(specialties) > 3:
                        response_msg += "..."
                    response_msg += "\n"

                # 3. Clusters (Most common location)
                if 'Location' in result_df.columns:
                    common_loc = result_df['Location'].mode()
                    if not common_loc.empty:
                         response_msg += f"- **Major Cluster:** Many hospitals are located in *{common_loc[0]}*.\n"

                return ChatResponse(message=response_msg)
            except Exception as e:
                print(f"Fast Path failed: {e}. Falling back to Agent.")

        # System Prompt
        # System Prompt
        # Use single f-string for clarity and proper escaping
        # We use triple curly braces {{{ or }}}} where we want LITERAL { or } in the final prompt (which LangChain will parse)
        # LangChain needs { to be escaped as {{ in its template.
        # So we need output string to have {{ param }}.
        # In f-string: {{ -> {. So {{{{ -> {{.
        # Thus: {{{{ "key": "value" }}}} -> {{ "key": "value" }} (Python string) -> { "key": "value" } (LangChain template)
        
        # System Prompt
        # SPLIT PROMPT to avoid f-string escaping hell.
        # Part 1: Static instructions (Standard Python String)
        # We need to escape { as {{ for LangChain.
        
        static_prefix = """
        You are a data analysis agent specialized in HEALTH and MEDICAL data. 
        
        RESTRICT YOUR DOMAIN:
        1. You are a **Health AI Assistant**.
        2. You SHOULD answer questions related to health, diseases, medical data, hospital locations, and outbreaks.
        3. If the answer is in the provided dataset, use it. If not, use your general medical knowledge.
        4. **CRITICAL:** If the user asks about a clearly NON-MEDICAL topic (e.g., "what is love", "describe a bike", "jokes", "coding", "movies"), you MUST reply with: "I am a health assistant and can only help with medical or health-related queries." and STOP.
        
        IMPORTANT:
        1. ALWAYS import pandas as pd and numpy as np at the beginning of your python code blocks. The environment does not have them pre-loaded.
        2. The dataset has 'Latitude' and 'Longitude' columns. USE THEM for distance calculations.
        3. When looking for a specific hospital (e.g., "Nanavati Chowk Hospital"), perform a FUZZY SEARCH on 'Hospital_Name' or 'Location' columns. It might be listed as "Nanavati Hospital".
        4. To find "X km near Y":
            a. First, find the coordinates of Y.
            b. Then, calculate the distance of all other rows from Y's coordinates.
            c. Filter for rows where distance <= X.
        5. If the user asks for a list or table, ensure there are NO DUPLICATE entries.
        6. Format the output cleanly as a Markdown table.
        7. If the user asks for a chart, graph, or plot, you MUST return a JSON object in the following format:
        {{
            "text_response": "Here is the chart...",
            "chart_data": {{
                "type": "bar", 
                "labels": ["Label1", "Label2"],
                "datasets": [
                    {{
                        "label": "Dataset Label",
                        "data": [10, 20]
                    }}
                ]
            }}
        }}
        Do not wrap the JSON in markdown code blocks. Just return the raw JSON string.
        If the user just asks a question about the data without a chart, just answer normally.
        """

        # Part 2: Dynamic instructions (F-String)
        # We need {{ for LangChain, which means {{{{ in f-string.
        
        dynamic_prefix = f"""
        CRITICAL INSTRUCTIONS:
        1. **Language:** Respond in {request.language}. Translate the Final Answer.
        2. **Final Answer:** ALWAYS output "Final Answer:" when you have the result.
        3. **Stop:** Once you output "Final Answer:", STOP generating text.
        4. **Charts:** If generating a chart JSON:
            - Calculate the data first.
            - **IMPORTANT:** Print the JSON object as a **SINGLE LINE** string to avoid Python syntax errors in the tool.
            - Example: `print({{{{"text_response": "...", "chart_data": ...}}}})`
        """
        
        prefix = static_prefix + dynamic_prefix
        
        agent = create_pandas_dataframe_agent(
            llm, 
            df, 
            verbose=True,
            prefix=prefix,
            agent_type="zero-shot-react-description",
            allow_dangerous_code=True,
            handle_parsing_errors=True, 
            max_iterations=5,
            early_stopping_method="generate"
        )
        
        # Add context to query for Pandas Agent
        context_str = ""
        if request.history:
            context_str = "Previous Conversation:\n"
            for msg in request.history[-5:]: # Last 5 messages
                context_str += f"{msg['role'].capitalize()}: {msg['content']}\n"
            context_str += "\nCurrent Query: "
            
        final_query = context_str + request.text

        try:
            # Run in threadpool to avoid blocking
            response_text = await run_in_threadpool(agent.run, final_query)
            
            try:
                cleaned_response = response_text.replace("```json", "").replace("```", "").strip()
                # Try to parse as JSON
                response_json = json.loads(cleaned_response)
                
                if "chart_data" in response_json:
                    return ChatResponse(
                        message=response_json.get("text_response") or response_json.get("message") or "Here is the chart.",
                        chart_data=response_json["chart_data"]
                    )
            except json.JSONDecodeError:
                pass
                
            return ChatResponse(message=response_text)
            
        except Exception as e:
             return ChatResponse(message=f"Error analyzing data: {str(e)}")

    else:
        # Use RAG Chain with History
        from langchain.prompts import PromptTemplate
        
        retriever = get_retriever()
        
        # Check if user wants detailed answer
        is_detailed = any(keyword in request.text.lower() for keyword in ["detail", "explain", "comprehensive", "elaborate", "long"])
        
        if is_detailed:
            custom_template = """
            You are a helpful medical AI assistant. Use the following pieces of context to answer the user's question.
            
            RESTRICT YOUR DOMAIN:
            1. You SHOULD answer questions related to health, diseases, medical conditions, outbreaks, and hospitals.
            2. If the answer is in the context, use it.
            3. If the answer is NOT in the context but the question is a valid MEDICAL question (e.g., "what is dengue", "symptoms of flu"), you **MUST** answer it using your general medical knowledge.
            4. **CRITICAL:** If the user asks about a clearly NON-MEDICAL topic (e.g., "what is love", "describe a bike", "jokes", "coding"), you MUST reply with: "I am a health assistant and can only help with medical or health-related queries."
            
            IMPORTANT: 
            - Provide DETAILED and COMPREHENSIVE answers.
            - **FORMATTING IS CRITICAL:**
                - Use **## Headers** for main sections.
                - Use **### Sub-headers** for details.
                - Use **Bullet points** for lists.
                - Use **Bold** for key terms.
                - Use **Emojis** to make it visually appealing (e.g., 🦟 for mosquito, 🤒 for fever).
                - **MANDATORY:** If the context mentions **dates, months, or weeks**, you **MUST** include them.
                - **STRICT RULE:** If listing multiple outbreaks/events, you **MUST** use a **Markdown Table**.
                - **PDF Parsing:** The context comes from a PDF. Text may be split across lines (e.g., "16-10-\n2025"). **Join lines** to make sense of them.
                - **Data Inference:** Numbers after the disease name (e.g., "Fever 10 0") usually mean **Cases** and **Deaths**. Use the first number as "Cases".
                - **Table Formatting:** 
                    - Use **Short Headers**: `| ID | Disease | Loc | Cases | Date |`
                    - **Compact Dates:** Use `dd/mm` format (e.g., "28/09"). Omit the year if current year.
                    - **No Text Wrapping:** Keep cell content concise.

            Structure your answer like this:
            ## 🏥 [Disease Name/Topic]
            
            ### 🔍 Overview
            [Brief summary]
            
            ### 🤒 Symptoms
            - [Symptom 1]
            - [Symptom 2]
            
            ### 🧬 Causes & Transmission
            [Details]
            
            ### 💊 Treatment & Prevention
            [Details]
            
            Context: {context}
            
            Chat History: {chat_history}
            
            Question: {question}
            
            Answer:
            """
        else:
             custom_template = """
            You are a helpful medical AI assistant. Use the following pieces of context to answer the user's question.
            
            RESTRICT YOUR DOMAIN:
            1. You SHOULD answer questions related to health, diseases, medical conditions, outbreaks, and hospitals.
            2. If the answer is NOT in the context but it is a valid MEDICAL question, answer it.
            3. **CRITICAL:** If the user asks about a clearly NON-MEDICAL topic (e.g., "what is love", "describe a bike", "jokes", "coding"), you MUST reply with: "I am a health assistant and can only help with medical or health-related queries."

            IMPORTANT:
            - Keep your answer **CONCISE and TO THE POINT**.
            - Do not use excessive headers or emojis unless necessary.
            - Provide a direct summary of the information.
            - **MANDATORY:** If the context mentions **dates, months, or weeks**, you **MUST** include them.
            - **PDF Parsing:** Text may be split across lines. Join them. "Fever 10 0" -> 10 Cases.
            - **Table Formatting:** 
                - Use **Short Headers**: `| ID | Disease | Loc | Cases | Date |`
                - **Compact Dates:** Use `dd/mm` format (e.g., "28/09").
                - **Concise:** Keep descriptions short to fit in the table.
            - Do NOT use plain lists for data.
            
            Context: {context}
            
            Chat History: {chat_history}
            
            Question: {question}
            
            Answer:
            """
        
        PROMPT = PromptTemplate(
            template=custom_template, input_variables=["context", "chat_history", "question"]
        )
        
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=retriever,
            return_source_documents=False,
            combine_docs_chain_kwargs={"prompt": PROMPT}
        )
        
        try:
            # Run in threadpool
            # ConversationalRetrievalChain expects 'question' and 'chat_history'
            response = await run_in_threadpool(
                qa_chain.invoke, 
                {"question": request.text, "chat_history": chat_history}
            )
            return ChatResponse(message=response['answer'])
        except Exception as e:
            return ChatResponse(message=f"Error retrieving information: {str(e)}")

def find_nearby_hospitals(df, location_query, distance_km):
    import numpy as np
    
    # 1. Find Target Location (Fuzzy Match)
    # Simple case-insensitive contains search for speed
    target_rows = df[df.astype(str).apply(lambda x: x.str.contains(location_query, case=False, na=False)).any(axis=1)]
    
    target_lat = None
    target_lon = None
    
    if not target_rows.empty:
        # Take the first match from CSV
        target_lat = target_rows.iloc[0]['Latitude']
        target_lon = target_rows.iloc[0]['Longitude']
    else:
        # Fallback: Try Geocoding with Nominatim (Free)
        try:
            from geopy.geocoders import Nominatim
            geolocator = Nominatim(user_agent="health_chatbot_app")
            location = geolocator.geocode(location_query)
            if location:
                target_lat = location.latitude
                target_lon = location.longitude
                print(f"Geocoded '{location_query}': {target_lat}, {target_lon}")
        except Exception as e:
            print(f"Geocoding failed: {e}")

    if target_lat is None or target_lon is None or pd.isna(target_lat) or pd.isna(target_lon):
        return pd.DataFrame()

    # 2. Vectorized Haversine Distance
    R = 6371  # Earth radius in km
    
    lat1 = np.radians(target_lat)
    lon1 = np.radians(target_lon)
    lat2 = np.radians(df['Latitude'])
    lon2 = np.radians(df['Longitude'])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    
    # Make a copy before modifying to avoid mutating the cached DataFrame
    df_copy = df.copy()
    df_copy['distance'] = R * c
    
    # 3. Filter and Sort
    nearby_df = df_copy[df_copy['distance'] <= distance_km].copy()
    nearby_df = nearby_df.sort_values('distance')
    
    # Round distance to 2 decimal places
    nearby_df['distance'] = nearby_df['distance'].round(2)
    
    # Select relevant columns for display
    cols_to_show = ['Hospital_Name', 'Location', 'distance']
    # Filter columns that actually exist
    cols_to_show = [c for c in cols_to_show if c in nearby_df.columns]
    
    return nearby_df[cols_to_show].head(50) # Limit to top 50 for cleaner output

# --- Session Management Endpoints ---

from services.database import get_db_connection
from services.auth_service import get_current_user
import uuid
from datetime import datetime

class ChatSessionCreate(BaseModel):
    title: str = "Untitled Chat"
    messages: list = []

class ChatSessionUpdate(BaseModel):
    title: str = None
    messages: list = None

@router.get("/sessions")
def get_chat_sessions(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    sessions = conn.execute("SELECT id, title, created_at FROM ai_chats WHERE user_id = ? ORDER BY created_at DESC", (current_user["id"],)).fetchall()
    conn.close()
    return {"success": True, "sessions": [dict(s) for s in sessions]}

@router.post("/sessions")
def create_chat_session(payload: ChatSessionCreate, current_user: dict = Depends(get_current_user)):
    session_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat()
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO ai_chats (id, user_id, title, messages, created_at) VALUES (?, ?, ?, ?, ?)",
        (session_id, current_user["id"], payload.title, json.dumps(payload.messages), now_iso)
    )
    conn.commit()
    conn.close()
    return {"success": True, "sessionId": session_id}

@router.get("/sessions/{session_id}")
def get_chat_session(session_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    session = conn.execute("SELECT * FROM ai_chats WHERE id = ? AND user_id = ?", (session_id, current_user["id"])).fetchone()
    conn.close()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    s_dict = dict(session)
    s_dict["messages"] = json.loads(s_dict["messages"])
    return {"success": True, "session": s_dict}

@router.put("/sessions/{session_id}")
def update_chat_session(session_id: str, payload: ChatSessionUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    session = conn.execute("SELECT * FROM ai_chats WHERE id = ? AND user_id = ?", (session_id, current_user["id"])).fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
    
    title = payload.title if payload.title is not None else session["title"]
    messages = json.dumps(payload.messages) if payload.messages is not None else session["messages"]
    
    conn.execute("UPDATE ai_chats SET title = ?, messages = ? WHERE id = ?", (title, messages, session_id))
    conn.commit()
    conn.close()
    return {"success": True}

@router.delete("/sessions/{session_id}")
def delete_chat_session(session_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    conn.execute("DELETE FROM ai_chats WHERE id = ? AND user_id = ?", (session_id, current_user["id"]))
    conn.commit()
    conn.close()
    return {"success": True}
