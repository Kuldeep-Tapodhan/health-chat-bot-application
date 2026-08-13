# <<< FIX 1: CUDA + multiprocessing fix >>>
import pandas as pd
import numpy as np
import json
import torch
import os
import gc
import time
from pathlib import Path
from datetime import datetime
from typing import Tuple, Dict, List
from sklearn.model_selection import train_test_split
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    Trainer,
    TrainingArguments,
    DataCollatorForLanguageModeling,
    BitsAndBytesConfig,
    TrainerCallback
)
from datasets import Dataset as HFDataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, PeftModel
import warnings
warnings.filterwarnings('ignore')

# Visualization
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
sns.set_style("whitegrid")

# CRITICAL: Limit threads
torch.set_num_threads(2)
os.environ["OMP_NUM_THREADS"] = "2"
os.environ["MKL_NUM_THREADS"] = "2"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# ============================================================================
# MEMORY MANAGEMENT
# ============================================================================

def clear_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
    time.sleep(0.1)

# ============================================================================
# L4 OPTIMIZED CONFIGURATION
# ============================================================================

class L4OptimizedConfig:
    DATASET_DIR = Path("/teamspace/studios/this_studio/dataset")
    MEDQUAD_PATH = DATASET_DIR / "medquad.csv"
    HEALTHCARE_PATH = DATASET_DIR / "healthcare_magic.json"
    ICLINIQ_PATH = DATASET_DIR / "icliniq.json"
    
    MODEL_NAME = "BioMistral/BioMistral-7B"
    OUTPUT_DIR = Path("/content/biomistral_trained")
    FINAL_MODEL_DIR = OUTPUT_DIR / "final_model"
    CHECKPOINT_DIR = OUTPUT_DIR / "checkpoints"
    
    EPOCHS = 2
    BATCH_SIZE = 2
    GRADIENT_ACCUMULATION_STEPS = 8
    LEARNING_RATE = 2e-4
    MAX_LENGTH = 384
    
    LORA_R = 16
    LORA_ALPHA = 32
    LORA_DROPOUT = 0.05
    LORA_TARGET_MODULES = ["q_proj", "v_proj","k_proj", "o_proj"]
    
    USE_4BIT = False
    FP16 = True   
    DATALOADER_WORKERS = 8
    
    USE_DATA_PERCENTAGE = 0.2
    
    EVAL_STEPS = 500
    SAVE_STEPS = 1000
    LOGGING_STEPS = 100
    SAVE_TOTAL_LIMIT = 1
    
    EVAL_SAMPLES = 30


# ============================================================================
# METRICS TRACKER - FIXED None → nan
# ============================================================================

class LightweightMetricsTracker:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.metrics_dir = output_dir / "metrics"
        self.plots_dir = output_dir / "plots"
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        self.plots_dir.mkdir(parents=True, exist_ok=True)
        
        self.training_history = {
            'step': [],
            'epoch': [],
            'train_loss': [],
            'eval_loss': [],
            'learning_rate': [],
            'timestamp': []
        }
    
    def log_training_step(self, step: int, epoch: float, train_loss: float | None, 
                         eval_loss: float | None = None, lr: float | None = None):
        self.training_history['step'].append(step)
        self.training_history['epoch'].append(epoch)
        self.training_history['train_loss'].append(train_loss if train_loss is not None else float('nan'))
        self.training_history['eval_loss'].append(eval_loss if eval_loss is not None else float('nan'))
        self.training_history['learning_rate'].append(lr if lr is not None else float('nan'))
        self.training_history['timestamp'].append(datetime.now().isoformat())
    
    def save_training_history(self):
        df = pd.DataFrame(self.training_history)
        df.to_csv(self.metrics_dir / "training_history.csv", index=False)
        return df
    
    def plot_essential_metrics(self):
        try:
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
            df = pd.DataFrame(self.training_history)
            
            ax1.plot(df['step'], df['train_loss'], label='Train Loss', linewidth=2, color='#2E86AB', alpha=0.8)
            eval_df = df[df['eval_loss'].notna()]
            if len(eval_df) > 0:
                ax1.plot(eval_df['step'], eval_df['eval_loss'], label='Val Loss', linewidth=2, color='#A23B72', alpha=0.8, marker='o', markersize=4)
            ax1.set_xlabel('Step', fontweight='bold')
            ax1.set_ylabel('Loss', fontweight='bold')
            ax1.set_title('Training & Validation Loss', fontsize=12, fontweight='bold')
            ax1.legend()
            ax1.grid(True, alpha=0.3)
            
            lr_df = df[df['learning_rate'].notna()]
            if len(lr_df) > 0:
                ax2.plot(lr_df['step'], lr_df['learning_rate'], linewidth=2, color='#F18F01', alpha=0.8)
                ax2.set_xlabel('Step', fontweight='bold')
                ax2.set_ylabel('Learning Rate', fontweight='bold')
                ax2.set_title('Learning Rate Schedule', fontsize=12, fontweight='bold')
                ax2.grid(True, alpha=0.3)
            
            plt.tight_layout()
            plt.savefig(self.plots_dir / "training_metrics.png", dpi=200, bbox_inches='tight')
            plt.close()
            print(f"   Training plots saved")
        except Exception as e:
            print(f"   Plot generation failed: {e}")


# ============================================================================
# CUSTOM CALLBACK - FIXED None handling
# ============================================================================

class MetricsCallback(TrainerCallback):
    def __init__(self, tracker: LightweightMetricsTracker, model, tokenizer, output_dir):
        self.tracker = tracker
        self.model = model
        self.tokenizer = tokenizer
        self.output_dir = output_dir
        self.best_loss = float('inf')
    
    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs:
            self.tracker.log_training_step(
                step=state.global_step,
                epoch=state.epoch or 0,
                train_loss=logs.get('loss'),
                eval_loss=logs.get('eval_loss'),
                lr=logs.get('learning_rate')
            )
    
    def on_evaluate(self, args, state, control, metrics=None, **kwargs):
        if metrics:
            eval_loss = metrics.get('eval_loss', float('inf'))
            self.tracker.log_training_step(
                step=state.global_step,
                epoch=state.epoch or 0,
                train_loss=float('nan'),  # Fixed: was None
                eval_loss=eval_loss,
                lr=None
            )
            if eval_loss < self.best_loss:
                self.best_loss = eval_loss
                print(f"\nNew best model! Loss: {eval_loss:.4f}")
    
    def on_save(self, args, state, control, **kwargs):
        print(f"Checkpoint saved at step {state.global_step}")


# ============================================================================
# STREAMING DATA LOADER - Fixed boolean context
# ============================================================================

class StreamingDataLoader:
    def __init__(self):
        print("=" * 70)
        print("LOADING DATASETS (MEMORY OPTIMIZED)")
        print("=" * 70)
        self.config = L4OptimizedConfig()
        
    def load_datasets(self):
        print(f"\nPath: {self.config.DATASET_DIR}")
        
        print("\nLoading MedQuAD...")
        self.medquad_df = pd.read_csv(self.config.MEDQUAD_PATH, usecols=['question', 'answer'])
        print(f"   {len(self.medquad_df):,} entries")
        
        # Fixed: use float() to avoid pandas boolean context error
        if float(self.config.USE_DATA_PERCENTAGE) < 1.0:
            sample_size = int(len(self.medquad_df) * self.config.USE_DATA_PERCENTAGE)
            self.medquad_df = self.medquad_df.sample(n=sample_size, random_state=42)
            print(f"   • Using {len(self.medquad_df):,} samples ({int(self.config.USE_DATA_PERCENTAGE*100)}%)")
        else:
            print(f"   • Using ALL {len(self.medquad_df):,} samples (100%)")
        clear_memory()
        
        print("\nLoading HealthCareMagic...")
        with open(self.config.HEALTHCARE_PATH, 'r', encoding='utf-8') as f:
            healthcare_data = json.load(f)
        self.healthcare_df = pd.DataFrame(healthcare_data)[['input', 'output']]
        print(f"   {len(self.healthcare_df):,} entries")
        
        if float(self.config.USE_DATA_PERCENTAGE) < 1.0:
            sample_size = int(len(self.healthcare_df) * self.config.USE_DATA_PERCENTAGE)
            self.healthcare_df = self.healthcare_df.sample(n=sample_size, random_state=42)
            print(f"   • Using {len(self.healthcare_df):,} samples ({int(self.config.USE_DATA_PERCENTAGE*100)}%)")
        else:
            print(f"   • Using ALL {len(self.healthcare_df):,} samples (100%)")
        
        del healthcare_data
        clear_memory()
        
        print("\nLoading iCliniq...")
        with open(self.config.ICLINIQ_PATH, 'r', encoding='utf-8') as f:
            icliniq_data = json.load(f)
        self.icliniq_df = pd.DataFrame(icliniq_data)
        print(f"   {len(self.icliniq_df):,} entries")
        
        del icliniq_data
        clear_memory()
        
        return self.medquad_df, self.healthcare_df, self.icliniq_df
    
    def prepare_training_data(self):
        print("\n" + "=" * 70)
        print(f"PREPARING TRAINING DATA ({int(self.config.USE_DATA_PERCENTAGE*100)}% OF DATASET)")
        print("=" * 70)
        
        training_data = []
        
        print(f"\nProcessing MedQuAD...")
        for idx, row in self.medquad_df.iterrows():
            if pd.notna(row['question']) and pd.notna(row['answer']):
                training_data.append({
                    'text': f"<|user|>\n{row['question']}\n<|assistant|>\n{row['answer']}"
                })
        print(f"   Added {len(training_data):,} samples")
        del self.medquad_df
        clear_memory()
        
        print(f"\nProcessing HealthCareMagic...")
        initial = len(training_data)
        for idx, row in self.healthcare_df.iterrows():
            if pd.notna(row['input']) and pd.notna(row['output']):
                training_data.append({
                    'text': f"<|user|>\n{row['input']}\n<|assistant|>\n{row['output']}"
                })
        print(f"   Added {len(training_data) - initial:,} samples")
        del self.healthcare_df
        clear_memory()
        
        train_df = pd.DataFrame(training_data)
        del training_data
        clear_memory()
        
        train_data, temp_data = train_test_split(train_df, test_size=0.15, random_state=42)
        val_data, test_data = train_test_split(temp_data, test_size=0.5, random_state=42)
        del temp_data, train_df
        clear_memory()
        
        print(f"\nDataset split:")
        print(f"   • Training: {len(train_data):,}")
        print(f"   • Validation: {len(val_data):,}")
        print(f"   • Testing: {len(test_data):,}")
        
        return train_data, val_data, test_data


# ============================================================================
# OPTIMIZED TRAINER (unchanged except for clear_memory calls)
# ============================================================================

class L4Trainer:
    def __init__(self):
        print("\n" + "=" * 70)
        print("INITIALIZING BIOMISTRAL (L4 OPTIMIZED)")
        print("=" * 70)
        
        self.config = L4OptimizedConfig()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        if torch.cuda.is_available():
            print(f"\nGPU: {torch.cuda.get_device_name(0)}")
            mem = torch.cuda.get_device_properties(0).total_memory / 1e9
            print(f"   Memory: {mem:.1f} GB")
        
        self.config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        self.config.FINAL_MODEL_DIR.mkdir(parents=True, exist_ok=True)
        self.config.CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
        
        self.metrics_tracker = LightweightMetricsTracker(self.config.OUTPUT_DIR)
        self._load_model()
    
    def _load_model(self):
        print(f"\nLoading BioMistral (4-bit)...")
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )
        
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.config.MODEL_NAME,
            trust_remote_code=True,
            use_fast=True
        )
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        print("   Tokenizer loaded")
        
        print("   • Loading model...")
        self.model = AutoModelForCausalLM.from_pretrained(
            self.config.MODEL_NAME,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True
        )
        print("   Model loaded")
        
        self.model = prepare_model_for_kbit_training(self.model)
        
        print(f"   • Applying LoRA (r={self.config.LORA_R}, 2 modules)...")
        lora_config = LoraConfig(
            r=self.config.LORA_R,
            lora_alpha=self.config.LORA_ALPHA,
            target_modules=self.config.LORA_TARGET_MODULES,
            lora_dropout=self.config.LORA_DROPOUT,
            bias="none",
            task_type="CAUSAL_LM"
        )
        self.model = get_peft_model(self.model, lora_config)
        
        trainable = sum(p.numel() for p in self.model.parameters() if p.requires_grad)
        total = sum(p.numel() for p in self.model.parameters())
        print(f"   Trainable: {trainable/1e6:.1f}M / {total/1e6:.1f}M params ({100*trainable/total:.2f}%)")
        clear_memory()
    
    def tokenize_data(self, train_df, val_df, test_df):
        print("\nTokenizing...")
        
        def tokenize_fn(examples):
            result = self.tokenizer(
                examples['text'],
                truncation=True,
                max_length=self.config.MAX_LENGTH,
                padding='max_length'
            )
            result['labels'] = result['input_ids'].copy()
            return result
        
        train_ds = HFDataset.from_pandas(train_df[['text']].reset_index(drop=True))
        val_ds = HFDataset.from_pandas(val_df[['text']].reset_index(drop=True))
        test_ds = HFDataset.from_pandas(test_df[['text']].reset_index(drop=True))
        
        print("   • Training...")
        train_tok = train_ds.map(tokenize_fn, batched=True, remove_columns=['text'], num_proc=None )
        print("   • Validation...")
        val_tok = val_ds.map(tokenize_fn, batched=True, remove_columns=['text'], num_proc=None )
        print("   • Testing...")
        test_tok = test_ds.map(tokenize_fn, batched=True, remove_columns=['text'], num_proc=None )
        
        print(f"   Done: {len(train_tok):,} train samples")
        
        del train_ds, val_ds, test_ds
        clear_memory()
        
        return train_tok, val_tok, test_tok
    
    def train(self, train_dataset, val_dataset):
        print("\n" + "=" * 70)
        print("STARTING TRAINING (L4 OPTIMIZED - 6 HOUR TARGET)")
        print("=" * 70)
        
        training_args = TrainingArguments(
            output_dir=str(self.config.CHECKPOINT_DIR),
            num_train_epochs=self.config.EPOCHS,
            per_device_train_batch_size=self.config.BATCH_SIZE,
            per_device_eval_batch_size=self.config.BATCH_SIZE,
            gradient_accumulation_steps=self.config.GRADIENT_ACCUMULATION_STEPS,
            learning_rate=self.config.LEARNING_RATE,
            warmup_steps=50,
            weight_decay=0.01,
            logging_steps=self.config.LOGGING_STEPS,
            eval_strategy="steps",
            eval_steps=self.config.EVAL_STEPS,
            save_strategy="steps",
            save_steps=self.config.SAVE_STEPS,
            save_total_limit=self.config.SAVE_TOTAL_LIMIT,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            fp16=True,
            gradient_checkpointing=False,
            optim="paged_adamw_8bit",
            dataloader_num_workers=2,
            dataloader_pin_memory=True,
            max_grad_norm=1.0,
            report_to="none",
        )
        
        print(f"\nConfiguration:")
        print(f"   • Epochs: {self.config.EPOCHS}")
        print(f"   • Batch size: {self.config.BATCH_SIZE}")
        print(f"   • Gradient accumulation: {self.config.GRADIENT_ACCUMULATION_STEPS}")
        print(f"   • Effective batch: {self.config.BATCH_SIZE * self.config.GRADIENT_ACCUMULATION_STEPS}")
        print(f"   • Learning rate: {self.config.LEARNING_RATE}")
        print(f"   • Max length: {self.config.MAX_LENGTH}")
        print(f"   • Data: {int(self.config.USE_DATA_PERCENTAGE*100)}% of full dataset")
        print(f"   • LoRA modules: {len(self.config.LORA_TARGET_MODULES)} (q_proj, v_proj)")
        
        total_samples = len(train_dataset)
        steps_per_epoch = total_samples // (self.config.BATCH_SIZE * self.config.GRADIENT_ACCUMULATION_STEPS)
        total_steps = steps_per_epoch * self.config.EPOCHS
        estimated_hours = (total_steps * 2.5) / 3600
        print(f"   • Estimated training time: ~{estimated_hours:.1f} hours")
        print(f"   • Total training steps: {total_steps:,}")
        
        data_collator = DataCollatorForLanguageModeling(tokenizer=self.tokenizer, mlm=False)
        
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            data_collator=data_collator,
            callbacks=[MetricsCallback(self.metrics_tracker, self.model, self.tokenizer, self.config.FINAL_MODEL_DIR)]
        )
        
        print("\nTraining started...\n")
        start_time = time.time()
        try:
            train_result = trainer.train()
            training_time = time.time() - start_time
            
            print("\nSaving final model...")
            trainer.save_model(str(self.config.FINAL_MODEL_DIR))
            self.tokenizer.save_pretrained(str(self.config.FINAL_MODEL_DIR))
            
            self.metrics_tracker.save_training_history()
            self.metrics_tracker.plot_essential_metrics()
            
            config_save = {
                'model': self.config.MODEL_NAME,
                'epochs': self.config.EPOCHS,
                'train_loss': float(train_result.training_loss),
                'time_hours': training_time / 3600,
                'lora_r': self.config.LORA_R,
                'learning_rate': self.config.LEARNING_RATE,
                'data_percentage': self.config.USE_DATA_PERCENTAGE,
                'date': datetime.now().isoformat()
            }
            with open(self.config.FINAL_MODEL_DIR / 'training_config.json', 'w') as f:
                json.dump(config_save, f, indent=2)
            
            print("\n" + "=" * 70)
            print("TRAINING COMPLETE!")
            print("=" * 70)
            print(f"   • Time: {training_time/3600:.2f} hours")
            print(f"   • Final Loss: {train_result.training_loss:.4f}")
            print(f"   • Model: {self.config.FINAL_MODEL_DIR}")
            
        except Exception as e:
            print(f"\nTraining error: {e}")
            try:
                trainer.save_model(str(self.config.FINAL_MODEL_DIR / "emergency_save"))
                self.tokenizer.save_pretrained(str(self.config.FINAL_MODEL_DIR / "emergency_save"))
                print("   Emergency save successful")
            except:
                print("   Emergency save failed")
            raise
        
        clear_memory()
        return str(self.config.FINAL_MODEL_DIR)


# ============================================================================
# QUICK EVALUATOR (unchanged)
# ============================================================================

class QuickEvaluator:
    def __init__(self, model_path: str):
        print("\n" + "=" * 70)
        print("LOADING MODEL FOR TESTING")
        print("=" * 70)
        
        self.config = L4OptimizedConfig()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16)
        base_model = AutoModelForCausalLM.from_pretrained(
            self.config.MODEL_NAME,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            low_cpu_mem_usage=True
        )
        self.model = PeftModel.from_pretrained(base_model, model_path)
        self.model.eval()
        print("   Model loaded")
    
    def generate(self, question: str, max_new_tokens: int = 150) -> str:
        prompt = f"<|user|>\n{question}\n<|assistant|>\n"
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=256)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=0.7,
                do_sample=True,
                top_p=0.9,
                pad_token_id=self.tokenizer.pad_token_id,
                eos_token_id=self.tokenizer.eos_token_id
            )
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        if "<|assistant|>" in response:
            response = response.split("<|assistant|>")[-1].strip()
        return response
    
    def test(self):
        print("\nQuick Test:")
        demo_questions = [
            "What is diabetes?",
            "What are the symptoms of fever?",
            "How to treat a headache?"
        ]
        for q in demo_questions:
            print(f"\n{q}")
            answer = self.generate(q)
            print(f"{answer[:200]}..." if len(answer) > 200 else answer)


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n" + "=" * 70)
    print("BIOMISTRAL - L4 OPTIMIZED (6-HOUR VERSION)")
    print("=" * 70)
    
    if torch.cuda.is_available():
        print(f"\nGPU: {torch.cuda.get_device_name(0)}")
        mem = torch.cuda.get_device_properties(0).total_memory / 1e9
        print(f"   Memory: {mem:.1f} GB")
    
    loader = StreamingDataLoader()
    medquad_df, healthcare_df, icliniq_df = loader.load_datasets()
    train_data, val_data, test_data = loader.prepare_training_data()
    
    del loader, medquad_df, healthcare_df, icliniq_df
    clear_memory()
    
    trainer = L4Trainer()
    train_tok, val_tok, test_tok = trainer.tokenize_data(train_data, val_data, test_data)
    
    del train_data, val_data, test_data
    clear_memory()
    
    model_path = trainer.train(train_tok, val_tok)
    
    del trainer, train_tok, val_tok, test_tok
    clear_memory()
    
    evaluator = QuickEvaluator(model_path)
    evaluator.test()
    
    print("\nAll done! Model saved successfully.")
    print(f"   Model: {L4OptimizedConfig.FINAL_MODEL_DIR}")
    print(f"   Plots: {L4OptimizedConfig.OUTPUT_DIR / 'plots'}")
    print(f"   Metrics: {L4OptimizedConfig.OUTPUT_DIR / 'metrics'}")


if __name__ == "__main__":
    main()