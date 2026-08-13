"""
Medical AI Chatbot - Web UI (Fixed for CPU/GPU compatibility)
"""
import gradio as gr
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import torch
from pathlib import Path
import time

# Configuration
COMPRESSED_MODEL = Path(r"C:\Users\Vivek\PycharmProjects\Health-Assistance\model_4bit")
MODEL = None
TOKENIZER = None

# ============================================================================
# MODEL LOADING
# ============================================================================

def load_model():
    """Load the compressed model with proper device handling"""
    global MODEL, TOKENIZER
    
    print("Loading medical AI model...")
    
    if not COMPRESSED_MODEL.exists():
        raise FileNotFoundError(f"Model not found at: {COMPRESSED_MODEL}")
    
    # Check if CUDA is available
    has_cuda = torch.cuda.is_available()
    print(f"CUDA available: {has_cuda}")
    
    if has_cuda:
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    
    try:
        # Load tokenizer first
        TOKENIZER = AutoTokenizer.from_pretrained(str(COMPRESSED_MODEL))
        if TOKENIZER.pad_token is None:
            TOKENIZER.pad_token = TOKENIZER.eos_token
        print("✓ Tokenizer loaded")
        
        if has_cuda:
            # Try GPU with 4-bit quantization
            print("Loading on GPU with 4-bit quantization...")
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                llm_int8_enable_fp32_cpu_offload=True  # Enable CPU offload
            )
            
            MODEL = AutoModelForCausalLM.from_pretrained(
                str(COMPRESSED_MODEL),
                quantization_config=bnb_config,
                device_map="auto",
                trust_remote_code=True,
                low_cpu_mem_usage=True,
                max_memory={0: "10GB", "cpu": "30GB"}  # Adjust based on your system
            )
        else:
            # Load on CPU
            print("Loading on CPU (this may be slower)...")
            MODEL = AutoModelForCausalLM.from_pretrained(
                str(COMPRESSED_MODEL),
                device_map="cpu",
                trust_remote_code=True,
                low_cpu_mem_usage=True,
                torch_dtype=torch.float32
            )
        
        MODEL.eval()
        print("✓ Model loaded successfully!")
        return True
        
    except Exception as e:
        print(f"GPU loading failed, trying CPU fallback...")
        print(f"Error was: {e}")
        
        # Fallback to CPU
        try:
            MODEL = AutoModelForCausalLM.from_pretrained(
                str(COMPRESSED_MODEL),
                device_map="cpu",
                trust_remote_code=True,
                low_cpu_mem_usage=True,
                torch_dtype=torch.float32
            )
            MODEL.eval()
            print("✓ Model loaded on CPU")
            return True
        except Exception as e2:
            print(f"✗ CPU loading also failed: {e2}")
            raise


# ============================================================================
# CHAT FUNCTION
# ============================================================================

def chat(message, history, max_tokens, temperature, top_p):
    """Generate response to user message"""
    
    if MODEL is None or TOKENIZER is None:
        return "❌ Model not loaded. Please restart the application."
    
    if not message.strip():
        return ""
    
    # Build prompt
    prompt = f"<|user|>\n{message}\n<|assistant|>\n"
    
    # Tokenize
    device = next(MODEL.parameters()).device
    inputs = TOKENIZER(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=384
    ).to(device)
    
    # Generate
    start_time = time.time()
    
    with torch.no_grad():
        outputs = MODEL.generate(
            **inputs,
            max_new_tokens=int(max_tokens),
            temperature=float(temperature),
            do_sample=True if temperature > 0 else False,
            top_p=float(top_p),
            use_cache=True,
            pad_token_id=TOKENIZER.pad_token_id,
            eos_token_id=TOKENIZER.eos_token_id
        )
    
    response_time = time.time() - start_time
    
    # Decode response
    response = TOKENIZER.decode(outputs[0], skip_special_tokens=True)
    
    # Extract just the assistant's response
    if "<|assistant|>" in response:
        response = response.split("<|assistant|>")[-1].strip()
    
    # Add generation info
    response += f"\n\n_Generated in {response_time:.2f}s_"
    
    return response


# ============================================================================
# EXAMPLE QUESTIONS
# ============================================================================

EXAMPLES = [
    ["What is diabetes and how is it diagnosed?"],
    ["What are the common symptoms of the flu?"],
    ["How can I lower my blood pressure naturally?"],
    ["What is the difference between Type 1 and Type 2 diabetes?"],
    ["What are the side effects of antibiotics?"],
    ["How do I know if I have a fever?"],
    ["What causes migraines and how can they be treated?"],
    ["What is the recommended treatment for COVID-19?"],
    ["What are the symptoms of dehydration?"],
    ["How can I improve my immune system?"]
]


# ============================================================================
# GRADIO INTERFACE
# ============================================================================

def create_ui():
    """Create the Gradio web interface"""
    
    with gr.Blocks(title="Medical AI Assistant") as demo:
        
        # Header
        gr.Markdown("""
        # 🏥 Medical AI Assistant
        ### Ask medical questions and get AI-powered answers
        """)
        
        # Warning banner
        gr.Markdown("""
        > ⚠️ **Important Medical Disclaimer:**  
        > This AI assistant is for informational purposes only and should NOT replace professional medical advice. 
        > Always consult with a qualified healthcare provider for medical concerns.
        """)
        
        # Main chat interface
        with gr.Row():
            with gr.Column(scale=3):
                chatbot = gr.Chatbot(
                    height=500,
                    label="Chat History"
                )
                
                with gr.Row():
                    msg = gr.Textbox(
                        placeholder="Ask a medical question...",
                        show_label=False,
                        lines=2
                    )
                
                with gr.Row():
                    submit_btn = gr.Button("Send 📤", variant="primary")
                    clear_btn = gr.Button("Clear 🗑️")
            
            # Settings sidebar
            with gr.Column(scale=1):
                gr.Markdown("### ⚙️ Settings")
                
                max_tokens = gr.Slider(
                    minimum=50,
                    maximum=300,
                    value=150,
                    step=10,
                    label="Max Length"
                )
                
                temperature = gr.Slider(
                    minimum=0.1,
                    maximum=1.0,
                    value=0.7,
                    step=0.1,
                    label="Temperature"
                )
                
                top_p = gr.Slider(
                    minimum=0.1,
                    maximum=1.0,
                    value=0.9,
                    step=0.1,
                    label="Top-p"
                )
                
                gr.Markdown("---")
                device_info = "GPU" if torch.cuda.is_available() else "CPU"
                gr.Markdown(f"""
                ### 📊 Model Info
                - **Status:** ✅ Loaded
                - **Device:** {device_info}
                - **Base:** BioMistral-7B
                """)
        
        # Example questions
        gr.Markdown("### 💡 Example Questions")
        gr.Examples(
            examples=EXAMPLES,
            inputs=msg
        )
        
        # Chat logic
        def respond(message, chat_history, max_tok, temp, top_p_val):
            if not message.strip():
                return chat_history, ""
            
            bot_message = chat(message, chat_history, max_tok, temp, top_p_val)
            chat_history.append((message, bot_message))
            
            return chat_history, ""
        
        # Event handlers
        submit_btn.click(
            respond,
            inputs=[msg, chatbot, max_tokens, temperature, top_p],
            outputs=[chatbot, msg]
        )
        
        msg.submit(
            respond,
            inputs=[msg, chatbot, max_tokens, temperature, top_p],
            outputs=[chatbot, msg]
        )
        
        clear_btn.click(lambda: None, None, chatbot)
        
        gr.Markdown("""
        ---
        Built with Gradio | Model: BioMistral-7B (Fine-tuned)
        """)
    
    return demo


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("MEDICAL AI CHATBOT - WEB INTERFACE")
    print("=" * 70)
    
    # Load model
    try:
        load_model()
    except Exception as e:
        print(f"✗ Error loading model: {e}")
        print("\nMake sure your model exists at:")
        print(f"  {COMPRESSED_MODEL}")
        exit(1)
    
    # Create and launch UI
    print("\nStarting web interface...")
    demo = create_ui()
    
    # Launch
    demo.launch(
        server_name="127.0.0.1",  # localhost for Windows
        server_port=7860,
        share=True,
        inbrowser=True  # Auto-open browser
    )
