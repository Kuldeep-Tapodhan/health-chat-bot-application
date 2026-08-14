import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from services.outbreak_rag_helper import is_outbreak_query, get_outbreak_surveillance_context

def test_is_outbreak_query_detection():
    assert is_outbreak_query("Show me active Dengue outbreaks in Maharashtra") is True
    assert is_outbreak_query("Are there any Nipah virus cases reported in Kerala?") is True
    assert is_outbreak_query("What is the capital of France?") is False

def test_get_outbreak_surveillance_context():
    context = get_outbreak_surveillance_context("Dengue in Maharashtra")
    assert "OFFICIAL GOVERNMENT DISEASE SURVEILLANCE DATA" in context
    assert "Dengue" in context
    assert "Maharashtra" in context

if __name__ == "__main__":
    test_is_outbreak_query_detection()
    test_get_outbreak_surveillance_context()
    print("✅ Outbreak Chat RAG helper tests passed!")
