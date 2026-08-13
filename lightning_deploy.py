import os
import time
import threading
import torch
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from pyngrok import ngrok
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig, TextIteratorStreamer
from typing import Dict
from threading import Thread

# ===========================================
# CONFIGURATION
# ===========================================
# Reverted to BioMistral (4-bit)
MODEL_PATH = "/teamspace/studios/this_studio/model_4bit"
NGROK_AUTH_TOKEN = "36EjWcZo8NTBeYtSA0D4LZdkba3_5GvCdtBhmixcz3JeKtWUm"

# ===========================================
# MODEL LOADER CLASS
# ===========================================
class BioMistralModel:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, model_path):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, model_path):
        if self._initialized:
            return
        self.model_path = model_path
        self.model = None
        self.tokenizer = None
        self.device = None
        self.start_time = time.time()
        self._initialized = True
        self._load_model()
    
    def _load_model(self):
        print(f"Loading medical AI model from {self.model_path}...")
        
        if not os.path.exists(self.model_path):
            # Fallback if local path doesn't exist (e.g. if running locally vs cloud)
            if "/" in self.model_path and not self.model_path.startswith("/"):
                 print(f"Loading from HuggingFace Hub: {self.model_path}")
            else:
                 raise FileNotFoundError(f"Model not found at: {self.model_path}")

        has_cuda = torch.cuda.is_available()
        print(f"CUDA available: {has_cuda}")
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(str(self.model_path))
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            print("Tokenizer loaded")
            
            if has_cuda:
                print("Loading on GPU with 4-bit quantization...")
                bnb_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16,
                    llm_int8_enable_fp32_cpu_offload=True
                )
                self.model = AutoModelForCausalLM.from_pretrained(
                    str(self.model_path),
                    quantization_config=bnb_config,
                    device_map="auto",
                    trust_remote_code=True
                )
            else:
                print("Loading on CPU...")
                self.model = AutoModelForCausalLM.from_pretrained(
                    str(self.model_path),
                    device_map="cpu",
                    trust_remote_code=True,
                    torch_dtype=torch.float32
                )
            
            self.model.eval()
            self.device = next(self.model.parameters()).device
            print(f"Model loaded successfully on {self.device}!")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
    
    def generate_stream(self, message, max_tokens=150, temperature=0.7, top_p=0.9):
        """Streaming generation with TextIteratorStreamer"""
        if self.model is None or self.tokenizer is None:
            yield "Error: Model not loaded"
            return
        
        with self._lock:
            try:
                # Format prompt with special tokens
                prompt = f"<|user|>\n{message}\n<|assistant|>\n"
                inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).to(self.device)
                
                streamer = TextIteratorStreamer(self.tokenizer, skip_prompt=True, skip_special_tokens=True)
                
                generation_kwargs = dict(
                    inputs,
                    streamer=streamer,
                    max_new_tokens=int(max_tokens),
                    temperature=float(temperature),
                    do_sample=True if temperature > 0 else False,
                    top_p=float(top_p),
                    use_cache=True,
                    pad_token_id=self.tokenizer.pad_token_id,
                    eos_token_id=self.tokenizer.eos_token_id
                )
                
                thread = Thread(target=self.model.generate, kwargs=generation_kwargs)
                thread.start()
                
                for new_text in streamer:
                    if "<|assistant|>" in new_text:
                        continue
                    yield new_text
                
            except Exception as e:
                yield f"Error: {str(e)}"

# ===========================================
# FLASK APP
# ===========================================
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
model_instance = None

@app.route('/api/chat/stream', methods=['POST', 'OPTIONS'])
def chat_stream():
    """Streaming chat endpoint - this is what the frontend calls"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = Response('')
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
    
    global model_instance
    if not model_instance:
        return jsonify({"success": False, "error": "Model initializing..."}), 503
        
    data = request.json
    message = data.get('message', '')
    
    # Dynamic Token Logic (OPTIMIZED FOR SPEED)
    message_lower = message.lower()
    
    # Default is now 150 as requested
    max_tokens = 150  
    
    if any(t in message_lower for t in ["short", "brief", "summary"]):
        max_tokens = 100 
    elif any(t in message_lower for t in ["detail", "explain", "list"]) or len(message) > 100:
        max_tokens = 300 # Cap long responses to 300 to keep it fast

    def generate():
        for token in model_instance.generate_stream(message, max_tokens=max_tokens):
            yield token

    response = Response(stream_with_context(generate()), mimetype='text/plain')
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"})

# ===========================================
# MAIN EXECUTION
# ===========================================
if __name__ == "__main__":
    print("="*50)
    print("STARTING LIGHTNING AI DEPLOYMENT")
    print("="*50)
    print("STARTING LIGHTNING AI DEPLOYMENT - VERSION: BIOMISTRAL_LOW_TOKENS_V5")
    print("If you do not see this message, you are running the OLD file!")
    print("="*50)

    if NGROK_AUTH_TOKEN == "YOUR_NGROK_AUTH_TOKEN_HERE":
        print("ERROR: Please edit this file and set your NGROK_AUTH_TOKEN!")
        exit(1)
    
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)
    
    try:
        model_instance = BioMistralModel(MODEL_PATH)
    except Exception as e:
        print(f"Failed to load model: {e}")
        exit(1)

    public_url = ngrok.connect(5000).public_url
    print("\n" + "="*50)
    print(f"PUBLIC API URL: {public_url}")
    print("Copy this URL to your frontend .env.local file as NEXT_PUBLIC_LIGHTNING_API_URL")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000)