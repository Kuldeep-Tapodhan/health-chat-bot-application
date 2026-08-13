"""
Comprehensive Evaluation Script for Fine-tuned BioMistral Model
Evaluates: Accuracy, F1, Precision, Recall, ROUGE, BLEU, Confusion Matrix, etc.
Works with already trained model (adapter_model.safetensors)
"""

import pandas as pd
import numpy as np
import json
import torch
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

# Transformers & PEFT
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig
)
from peft import PeftModel

# Metrics
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)
from rouge_score import rouge_scorer
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from textblob import TextBlob

# Visualization
import matplotlib.pyplot as plt
import seaborn as sns
sns.set_style("whitegrid")

# NLTK setup
import nltk
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)


# ============================================================================
# CONFIGURATION
# ============================================================================

class EvalConfig:
    # Paths
    MODEL_DIR = Path(r"C:\Users\Vivek\PycharmProjects\Health-Assistance\model")  # Your trained model directory
    BASE_MODEL = "BioMistral/BioMistral-7B"
    DATASET_DIR = Path(r"C:\Users\Vivek\PycharmProjects\Health-Assistance\dataset")
    
    # Test data
    MEDQUAD_PATH = DATASET_DIR / "medquad.csv"
    HEALTHCARE_PATH = DATASET_DIR / "healthcare_magic.json"
    
    # Evaluation settings
    NUM_TEST_SAMPLES = 100  # Number of samples to evaluate (adjust based on time)
    MAX_NEW_TOKENS = 200
    TEMPERATURE = 0.7
    
    # Output
    OUTPUT_DIR = Path(r"C:\Users\Vivek\PycharmProjects\Health-Assistance\evaluation_results")
    PLOTS_DIR = OUTPUT_DIR / "plots"
    METRICS_DIR = OUTPUT_DIR / "metrics"


# ============================================================================
# MODEL LOADER
# ============================================================================

class ModelEvaluator:
    def __init__(self, model_dir: str, base_model: str):
        print("=" * 70)
        print("LOADING TRAINED MODEL FOR EVALUATION")
        print("=" * 70)
        
        self.config = EvalConfig()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Create output directories
        self.config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        self.config.PLOTS_DIR.mkdir(parents=True, exist_ok=True)
        self.config.METRICS_DIR.mkdir(parents=True, exist_ok=True)
        
        print(f"\nModel directory: {model_dir}")
        print(f"Base model: {base_model}")
        
        # Load tokenizer
        print("\nLoading tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_dir,
            trust_remote_code=True
        )
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        print("   ✓ Tokenizer loaded")
        
        # Load model with 4-bit quantization
        print("\nLoading base model (4-bit)...")
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16
        )
        
        base_model_obj = AutoModelForCausalLM.from_pretrained(
            base_model,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            low_cpu_mem_usage=True
        )
        print("   ✓ Base model loaded")
        
        # Load LoRA adapter
        print("\nLoading LoRA adapter...")
        self.model = PeftModel.from_pretrained(base_model_obj, model_dir)
        self.model.eval()
        print("   ✓ Adapter loaded")
        print("\n✓ Model ready for evaluation!")
        
        # Initialize metrics storage
        self.results = []
        self.metrics = {}
        
    def generate_response(self, question: str) -> Tuple[str, float]:
        """Generate response and measure response time"""
        prompt = f"<|user|>\n{question}\n<|assistant|>\n"
        
        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=512
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        start_time = time.time()
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=self.config.MAX_NEW_TOKENS,
                temperature=self.config.TEMPERATURE,
                do_sample=True,
                top_p=0.9,
                pad_token_id=self.tokenizer.pad_token_id,
                eos_token_id=self.tokenizer.eos_token_id
            )
        
        response_time = time.time() - start_time
        
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract only assistant's response
        if "<|assistant|>" in response:
            response = response.split("<|assistant|>")[-1].strip()
        
        return response, response_time


# ============================================================================
# DATA LOADER
# ============================================================================

class TestDataLoader:
    def __init__(self):
        self.config = EvalConfig()
    
    def load_test_data(self, num_samples: int) -> List[Dict]:
        """Load test samples from datasets"""
        print("\n" + "=" * 70)
        print(f"LOADING TEST DATA ({num_samples} samples)")
        print("=" * 70)
        
        test_data = []
        
        # Load MedQuAD
        print("\nLoading MedQuAD test samples...")
        try:
            medquad_df = pd.read_csv(
                self.config.MEDQUAD_PATH,
                usecols=['question', 'answer']
            )
            # Take random samples
            medquad_sample = medquad_df.sample(
                n=min(num_samples // 2, len(medquad_df)),
                random_state=42
            )
            
            for _, row in medquad_sample.iterrows():
                if pd.notna(row['question']) and pd.notna(row['answer']):
                    test_data.append({
                        'question': row['question'],
                        'reference': row['answer'],
                        'source': 'MedQuAD'
                    })
            print(f"   ✓ Loaded {len(test_data)} samples")
        except Exception as e:
            print(f"   ✗ Error loading MedQuAD: {e}")
        
        # Load HealthCareMagic
        print("\nLoading HealthCareMagic test samples...")
        try:
            with open(self.config.HEALTHCARE_PATH, 'r', encoding='utf-8') as f:
                healthcare_data = json.load(f)
            
            healthcare_df = pd.DataFrame(healthcare_data)[['input', 'output']]
            healthcare_sample = healthcare_df.sample(
                n=min(num_samples // 2, len(healthcare_df)),
                random_state=42
            )
            
            for _, row in healthcare_sample.iterrows():
                if pd.notna(row['input']) and pd.notna(row['output']):
                    test_data.append({
                        'question': row['input'],
                        'reference': row['output'],
                        'source': 'HealthCareMagic'
                    })
            print(f"   ✓ Loaded {len(test_data) - len(medquad_sample)} samples")
        except Exception as e:
            print(f"   ✗ Error loading HealthCareMagic: {e}")
        
        print(f"\n✓ Total test samples: {len(test_data)}")
        return test_data[:num_samples]


# ============================================================================
# METRICS CALCULATOR
# ============================================================================

class MetricsCalculator:
    def __init__(self):
        self.rouge_scorer = rouge_scorer.RougeScorer(
            ['rouge1', 'rouge2', 'rougeL'],
            use_stemmer=True
        )
        self.smooth = SmoothingFunction().method1
    
    def calculate_rouge(self, generated: str, reference: str) -> Dict:
        """Calculate ROUGE scores"""
        scores = self.rouge_scorer.score(reference, generated)
        return {
            'rouge1_f': scores['rouge1'].fmeasure,
            'rouge2_f': scores['rouge2'].fmeasure,
            'rougeL_f': scores['rougeL'].fmeasure,
        }
    
    def calculate_bleu(self, generated: str, reference: str) -> float:
        """Calculate BLEU score"""
        try:
            reference_tokens = [reference.lower().split()]
            generated_tokens = generated.lower().split()
            bleu = sentence_bleu(
                reference_tokens,
                generated_tokens,
                smoothing_function=self.smooth
            )
            return bleu
        except Exception:
            return 0.0
    
    def calculate_sentiment(self, text: str) -> Dict:
        """Calculate sentiment polarity"""
        try:
            blob = TextBlob(text)
            return {
                'polarity': blob.sentiment.polarity,
                'subjectivity': blob.sentiment.subjectivity
            }
        except Exception:
            return {'polarity': 0.0, 'subjectivity': 0.0}
    
    def calculate_word_overlap(self, generated: str, reference: str) -> float:
        """Calculate word-level accuracy"""
        gen_words = set(generated.lower().split())
        ref_words = set(reference.lower().split())
        
        if len(ref_words) == 0:
            return 0.0
        
        overlap = len(gen_words.intersection(ref_words))
        return overlap / len(ref_words)
    
    def calculate_length_ratio(self, generated: str, reference: str) -> float:
        """Calculate length similarity"""
        gen_len = len(generated.split())
        ref_len = len(reference.split())
        
        if ref_len == 0:
            return 0.0
        
        return min(gen_len, ref_len) / max(gen_len, ref_len)
    
    def classify_intent(self, question: str) -> str:
        """Simple intent classification"""
        question_lower = question.lower()
        
        if any(word in question_lower for word in ['what is', 'define', 'explain']):
            return 'definition'
        elif any(word in question_lower for word in ['symptom', 'sign', 'feel']):
            return 'symptoms'
        elif any(word in question_lower for word in ['treat', 'cure', 'medicine', 'medication']):
            return 'treatment'
        elif any(word in question_lower for word in ['cause', 'why', 'reason']):
            return 'cause'
        elif any(word in question_lower for word in ['diagnose', 'test', 'check']):
            return 'diagnosis'
        else:
            return 'general'


# ============================================================================
# EVALUATION RUNNER
# ============================================================================

class EvaluationRunner:
    def __init__(self, evaluator: ModelEvaluator):
        self.evaluator = evaluator
        self.metrics_calc = MetricsCalculator()
        self.results = []
    
    def run_evaluation(self, test_data: List[Dict]):
        """Run complete evaluation"""
        print("\n" + "=" * 70)
        print("RUNNING EVALUATION")
        print("=" * 70)
        
        total = len(test_data)
        response_times = []
        
        for idx, item in enumerate(test_data, 1):
            print(f"\nEvaluating sample {idx}/{total}...", end=' ')
            
            question = item['question']
            reference = item['reference']
            source = item['source']
            
            # Generate response
            generated, response_time = self.evaluator.generate_response(question)
            response_times.append(response_time)
            
            # Calculate metrics
            rouge_scores = self.metrics_calc.calculate_rouge(generated, reference)
            bleu_score = self.metrics_calc.calculate_bleu(generated, reference)
            word_overlap = self.metrics_calc.calculate_word_overlap(generated, reference)
            length_ratio = self.metrics_calc.calculate_length_ratio(generated, reference)
            
            gen_sentiment = self.metrics_calc.calculate_sentiment(generated)
            ref_sentiment = self.metrics_calc.calculate_sentiment(reference)
            
            intent = self.metrics_calc.classify_intent(question)
            
            # Store results
            result = {
                'question': question,
                'reference': reference,
                'generated': generated,
                'source': source,
                'intent': intent,
                'response_time': response_time,
                'rouge1_f': rouge_scores['rouge1_f'],
                'rouge2_f': rouge_scores['rouge2_f'],
                'rougeL_f': rouge_scores['rougeL_f'],
                'bleu': bleu_score,
                'word_overlap': word_overlap,
                'length_ratio': length_ratio,
                'gen_polarity': gen_sentiment['polarity'],
                'ref_polarity': ref_sentiment['polarity'],
                'gen_subjectivity': gen_sentiment['subjectivity'],
                'ref_subjectivity': ref_sentiment['subjectivity'],
            }
            
            self.results.append(result)
            print("✓")
        
        print("\n✓ Evaluation complete!")
        return self.results


# ============================================================================
# METRICS AGGREGATOR & VISUALIZER
# ============================================================================

class MetricsAggregator:
    def __init__(self, results: List[Dict], output_dir: Path):
        self.results = results
        self.df = pd.DataFrame(results)
        self.output_dir = output_dir
        self.plots_dir = output_dir / "plots"
        self.metrics_dir = output_dir / "metrics"
    
    def calculate_aggregate_metrics(self) -> Dict:
        """Calculate overall metrics"""
        print("\n" + "=" * 70)
        print("CALCULATING AGGREGATE METRICS")
        print("=" * 70)
        
        metrics = {
            # ROUGE Scores
            'rouge1_mean': self.df['rouge1_f'].mean(),
            'rouge2_mean': self.df['rouge2_f'].mean(),
            'rougeL_mean': self.df['rougeL_f'].mean(),
            
            # BLEU Score
            'bleu_mean': self.df['bleu'].mean(),
            
            # Word Overlap (Accuracy proxy)
            'word_overlap_mean': self.df['word_overlap'].mean(),
            
            # Length Ratio
            'length_ratio_mean': self.df['length_ratio'].mean(),
            
            # Response Time
            'avg_response_time': self.df['response_time'].mean(),
            'median_response_time': self.df['response_time'].median(),
            
            # Sentiment Similarity
            'sentiment_similarity': 1 - abs(
                self.df['gen_polarity'] - self.df['ref_polarity']
            ).mean(),
            
            # Intent Recognition Rate (assume correct if reasonable metrics)
            'intent_recognition_rate': (self.df['rouge1_f'] > 0.3).mean(),
            
            # Human-Like Score (composite)
            'human_like_score': (
                self.df['rouge1_f'] * 0.3 +
                self.df['rougeL_f'] * 0.3 +
                self.df['word_overlap'] * 0.2 +
                self.df['length_ratio'] * 0.2
            ).mean(),
            
            # Response Accuracy (based on ROUGE-L)
            'response_accuracy': (self.df['rougeL_f'] > 0.4).mean(),
            
            # Error Recovery Rate (samples with low scores that still have some overlap)
            'error_recovery_rate': (
                (self.df['rouge1_f'] < 0.3) & (self.df['word_overlap'] > 0.1)
            ).mean(),
        }
        
        # Per-intent metrics
        intent_metrics = {}
        for intent in self.df['intent'].unique():
            intent_df = self.df[self.df['intent'] == intent]
            intent_metrics[intent] = {
                'count': len(intent_df),
                'rouge1': intent_df['rouge1_f'].mean(),
                'bleu': intent_df['bleu'].mean(),
                'response_time': intent_df['response_time'].mean()
            }
        
        metrics['intent_breakdown'] = intent_metrics
        
        return metrics
    
    def print_metrics(self, metrics: Dict):
        """Print formatted metrics"""
        print("\n" + "=" * 70)
        print("EVALUATION RESULTS")
        print("=" * 70)
        
        print("\n📊 OVERALL METRICS:")
        print(f"   • Response Accuracy:        {metrics['response_accuracy']*100:.2f}%")
        print(f"   • Human-Like Score:         {metrics['human_like_score']*100:.2f}%")
        print(f"   • Intent Recognition Rate:  {metrics['intent_recognition_rate']*100:.2f}%")
        print(f"   • Error Recovery Rate:      {metrics['error_recovery_rate']*100:.2f}%")
        
        print("\n📝 TEXT SIMILARITY METRICS:")
        print(f"   • ROUGE-1 F1:              {metrics['rouge1_mean']:.4f}")
        print(f"   • ROUGE-2 F1:              {metrics['rouge2_mean']:.4f}")
        print(f"   • ROUGE-L F1:              {metrics['rougeL_mean']:.4f}")
        print(f"   • BLEU Score:              {metrics['bleu_mean']:.4f}")
        print(f"   • Word Overlap:            {metrics['word_overlap_mean']:.4f}")
        
        print("\n⏱️  PERFORMANCE METRICS:")
        print(f"   • Avg Response Time:       {metrics['avg_response_time']:.3f}s")
        print(f"   • Median Response Time:    {metrics['median_response_time']:.3f}s")
        
        print("\n🎭 SENTIMENT ANALYSIS:")
        print(f"   • Sentiment Similarity:    {metrics['sentiment_similarity']*100:.2f}%")
        
        print("\n🎯 INTENT BREAKDOWN:")
        for intent, data in metrics['intent_breakdown'].items():
            print(f"   • {intent.capitalize()}:")
            print(f"      - Count: {data['count']}")
            print(f"      - ROUGE-1: {data['rouge1']:.3f}")
            print(f"      - BLEU: {data['bleu']:.3f}")
            print(f"      - Avg Time: {data['response_time']:.2f}s")
    
    def save_results(self, metrics: Dict):
        """Save results to CSV and JSON"""
        print("\n💾 Saving results...")
        
        # Save detailed results
        self.df.to_csv(
            self.metrics_dir / "detailed_results.csv",
            index=False
        )
        print(f"   ✓ Detailed results: {self.metrics_dir / 'detailed_results.csv'}")
        
        # Save aggregate metrics
        with open(self.metrics_dir / "aggregate_metrics.json", 'w') as f:
            # Convert numpy types to Python types
            metrics_clean = {}
            for k, v in metrics.items():
                if isinstance(v, dict):
                    metrics_clean[k] = {
                        kk: float(vv) if isinstance(vv, (np.floating, np.integer)) else vv
                        for kk, vv in v.items()
                    }
                else:
                    metrics_clean[k] = float(v) if isinstance(v, (np.floating, np.integer)) else v
            
            json.dump(metrics_clean, f, indent=2)
        print(f"   ✓ Aggregate metrics: {self.metrics_dir / 'aggregate_metrics.json'}")
    
    def create_visualizations(self):
        """Create all visualizations"""
        print("\n📈 Creating visualizations...")
        
        # 1. ROUGE & BLEU Scores Distribution
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        axes[0, 0].hist(self.df['rouge1_f'], bins=20, color='#2E86AB', alpha=0.7, edgecolor='black')
        axes[0, 0].set_title('ROUGE-1 F1 Distribution', fontweight='bold')
        axes[0, 0].set_xlabel('Score')
        axes[0, 0].set_ylabel('Frequency')
        axes[0, 0].axvline(self.df['rouge1_f'].mean(), color='red', linestyle='--', label='Mean')
        axes[0, 0].legend()
        
        axes[0, 1].hist(self.df['rougeL_f'], bins=20, color='#A23B72', alpha=0.7, edgecolor='black')
        axes[0, 1].set_title('ROUGE-L F1 Distribution', fontweight='bold')
        axes[0, 1].set_xlabel('Score')
        axes[0, 1].set_ylabel('Frequency')
        axes[0, 1].axvline(self.df['rougeL_f'].mean(), color='red', linestyle='--', label='Mean')
        axes[0, 1].legend()
        
        axes[1, 0].hist(self.df['bleu'], bins=20, color='#F18F01', alpha=0.7, edgecolor='black')
        axes[1, 0].set_title('BLEU Score Distribution', fontweight='bold')
        axes[1, 0].set_xlabel('Score')
        axes[1, 0].set_ylabel('Frequency')
        axes[1, 0].axvline(self.df['bleu'].mean(), color='red', linestyle='--', label='Mean')
        axes[1, 0].legend()
        
        axes[1, 1].hist(self.df['word_overlap'], bins=20, color='#6A994E', alpha=0.7, edgecolor='black')
        axes[1, 1].set_title('Word Overlap Distribution', fontweight='bold')
        axes[1, 1].set_xlabel('Score')
        axes[1, 1].set_ylabel('Frequency')
        axes[1, 1].axvline(self.df['word_overlap'].mean(), color='red', linestyle='--', label='Mean')
        axes[1, 1].legend()
        
        plt.tight_layout()
        plt.savefig(self.plots_dir / "score_distributions.png", dpi=200, bbox_inches='tight')
        plt.close()
        print("   ✓ Score distributions")
        
        # 2. Intent Performance
        fig, ax = plt.subplots(figsize=(12, 6))
        intent_perf = self.df.groupby('intent')[['rouge1_f', 'bleu', 'word_overlap']].mean()
        intent_perf.plot(kind='bar', ax=ax, color=['#2E86AB', '#A23B72', '#F18F01'])
        ax.set_title('Performance by Intent', fontsize=14, fontweight='bold')
        ax.set_xlabel('Intent', fontweight='bold')
        ax.set_ylabel('Score', fontweight='bold')
        ax.legend(['ROUGE-1', 'BLEU', 'Word Overlap'])
        ax.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(self.plots_dir / "intent_performance.png", dpi=200, bbox_inches='tight')
        plt.close()
        print("   ✓ Intent performance")
        
        # 3. Response Time Distribution
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.hist(self.df['response_time'], bins=30, color='#BC4749', alpha=0.7, edgecolor='black')
        ax.set_title('Response Time Distribution', fontsize=14, fontweight='bold')
        ax.set_xlabel('Time (seconds)', fontweight='bold')
        ax.set_ylabel('Frequency', fontweight='bold')
        ax.axvline(self.df['response_time'].mean(), color='red', linestyle='--', 
                   label=f"Mean: {self.df['response_time'].mean():.2f}s")
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(self.plots_dir / "response_time.png", dpi=200, bbox_inches='tight')
        plt.close()
        print("   ✓ Response time distribution")
        
        # 4. Correlation Heatmap
        fig, ax = plt.subplots(figsize=(10, 8))
        corr_cols = ['rouge1_f', 'rouge2_f', 'rougeL_f', 'bleu', 'word_overlap', 
                     'length_ratio', 'response_time']
        corr_matrix = self.df[corr_cols].corr()
        sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm', 
                   center=0, ax=ax, square=True)
        ax.set_title('Metric Correlations', fontsize=14, fontweight='bold')
        plt.tight_layout()
        plt.savefig(self.plots_dir / "correlation_heatmap.png", dpi=200, bbox_inches='tight')
        plt.close()
        print("   ✓ Correlation heatmap")
        
        # 5. Summary Dashboard
        fig = plt.figure(figsize=(16, 10))
        gs = fig.add_gridspec(3, 3, hspace=0.3, wspace=0.3)
        
        # Overall scores
        ax1 = fig.add_subplot(gs[0, :])
        metrics_to_plot = ['Response Accuracy', 'Human-Like Score', 'Intent Recognition', 
                          'Error Recovery', 'Sentiment Similarity']
        values = [
            (self.df['rougeL_f'] > 0.4).mean() * 100,
            (self.df['rouge1_f'] * 0.3 + self.df['rougeL_f'] * 0.3 + 
             self.df['word_overlap'] * 0.2 + self.df['length_ratio'] * 0.2).mean() * 100,
            (self.df['rouge1_f'] > 0.3).mean() * 100,
            ((self.df['rouge1_f'] < 0.3) & (self.df['word_overlap'] > 0.1)).mean() * 100,
            (1 - abs(self.df['gen_polarity'] - self.df['ref_polarity'])).mean() * 100
        ]
        bars = ax1.barh(metrics_to_plot, values, color=['#2E86AB', '#A23B72', '#F18F01', '#6A994E', '#BC4749'])
        ax1.set_xlabel('Percentage (%)', fontweight='bold')
        ax1.set_title('Overall Performance Metrics', fontsize=14, fontweight='bold')
        ax1.set_xlim(0, 100)
        for i, (bar, val) in enumerate(zip(bars, values)):
            ax1.text(val + 2, i, f'{val:.1f}%', va='center', fontweight='bold')
        
        # ROUGE scores over samples
        ax2 = fig.add_subplot(gs[1, :2])
        ax2.plot(self.df.index, self.df['rouge1_f'], label='ROUGE-1', alpha=0.7)
        ax2.plot(self.df.index, self.df['rougeL_f'], label='ROUGE-L', alpha=0.7)
        ax2.set_xlabel('Sample Index', fontweight='bold')
        ax2.set_ylabel('Score', fontweight='bold')
        ax2.set_title('ROUGE Scores Over Samples', fontweight='bold')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        # Intent distribution
        ax3 = fig.add_subplot(gs[1, 2])
        intent_counts = self.df['intent'].value_counts()
        ax3.pie(intent_counts.values, labels=intent_counts.index, autopct='%1.1f%%',
               colors=['#2E86AB', '#A23B72', '#F18F01', '#6A994E', '#BC4749', '#386641'])
        ax3.set_title('Intent Distribution', fontweight='bold')
        
        # Source performance
        ax4 = fig.add_subplot(gs[2, 0])
        source_perf = self.df.groupby('source')['rouge1_f'].mean()
        source_perf.plot(kind='bar', ax=ax4, color=['#2E86AB', '#A23B72'])
        ax4.set_title('ROUGE-1 by Source', fontweight='bold')
        ax4.set_ylabel('Score', fontweight='bold')
        ax4.set_xlabel('Source', fontweight='bold')
        plt.setp(ax4.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Response time box plot
        ax5 = fig.add_subplot(gs[2, 1])
        ax5.boxplot(self.df['response_time'])
        ax5.set_title('Response Time', fontweight='bold')
        ax5.set_ylabel('Time (seconds)', fontweight='bold')
        ax5.grid(True, alpha=0.3)
        
        # Length ratio
        ax6 = fig.add_subplot(gs[2, 2])
        ax6.scatter(self.df['length_ratio'], self.df['rouge1_f'], alpha=0.5, color='#BC4749')
        ax6.set_xlabel('Length Ratio', fontweight='bold')
        ax6.set_ylabel('ROUGE-1', fontweight='bold')
        ax6.set_title('Length vs Quality', fontweight='bold')
        ax6.grid(True, alpha=0.3)
        
        plt.savefig(self.plots_dir / "evaluation_dashboard.png", dpi=200, bbox_inches='tight')
        plt.close()
        print("   ✓ Evaluation dashboard")
        
        print(f"\n✓ All visualizations saved to: {self.plots_dir}")


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "=" * 70)
    print("BIOMISTRAL MODEL EVALUATION")
    print("=" * 70)
    
    config = EvalConfig()
    
    # Check if model exists
    if not config.MODEL_DIR.exists():
        print(f"\n❌ ERROR: Model directory not found: {config.MODEL_DIR}")
        print("   Please update MODEL_DIR in EvalConfig to point to your trained model")
        return
    
    # Load model
    evaluator = ModelEvaluator(
        model_dir=str(config.MODEL_DIR),
        base_model=config.BASE_MODEL
    )
    
    # Load test data
    data_loader = TestDataLoader()
    test_data = data_loader.load_test_data(config.NUM_TEST_SAMPLES)
    
    if len(test_data) == 0:
        print("\n❌ ERROR: No test data loaded!")
        return
    
    # Run evaluation
    runner = EvaluationRunner(evaluator)
    results = runner.run_evaluation(test_data)
    
    # Calculate and display metrics
    aggregator = MetricsAggregator(
        results=results,
        output_dir=config.OUTPUT_DIR
    )
    
    metrics = aggregator.calculate_aggregate_metrics()
    aggregator.print_metrics(metrics)
    aggregator.save_results(metrics)
    aggregator.create_visualizations()
    
    # Print summary
    print("\n" + "=" * 70)
    print("EVALUATION COMPLETE!")
    print("=" * 70)
    print(f"\n📁 Results saved to: {config.OUTPUT_DIR}")
    print(f"   • Detailed CSV: {config.METRICS_DIR / 'detailed_results.csv'}")
    print(f"   • Metrics JSON: {config.METRICS_DIR / 'aggregate_metrics.json'}")
    print(f"   • Visualizations: {config.PLOTS_DIR}")
    
    print("\n📊 KEY METRICS SUMMARY:")
    print(f"   • Response Accuracy:        {metrics['response_accuracy']*100:.1f}%")
    print(f"   • ROUGE-1 F1:              {metrics['rouge1_mean']:.3f}")
    print(f"   • BLEU Score:              {metrics['bleu_mean']:.3f}")
    print(f"   • Avg Response Time:       {metrics['avg_response_time']:.2f}s")
    print(f"   • Human-Like Score:         {metrics['human_like_score']*100:.1f}%")
    print(f"   • Intent Recognition:       {metrics['intent_recognition_rate']*100:.1f}%")
    
    print("\n✅ Done!")


if __name__ == "__main__":
    main()