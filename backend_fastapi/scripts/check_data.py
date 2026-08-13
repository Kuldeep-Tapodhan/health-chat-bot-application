import os
from appwrite.client import Client
from appwrite.services.databases import Databases

# Config
PROJECT_ID = '69370a87002fd794bb2c'
API_KEY = os.getenv('APPWRITE_API_KEY')
DATABASE_ID = '693718fa0035792b67ac'
ENDPOINT = 'https://nyc.cloud.appwrite.io/v1'

SEARCH_LOGS_COLLECTION = 'search_logs'
CHATS_COLLECTION = 'ai_chats'

if not API_KEY:
    print("Error: API Key missing")
    exit(1)

client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

databases = Databases(client)

try:
    searches = databases.list_documents(DATABASE_ID, SEARCH_LOGS_COLLECTION)
    print(f"Search Logs: {searches['total']}")
except Exception as e:
    print(f"Error checking searches: {e}")

try:
    chats = databases.list_documents(DATABASE_ID, CHATS_COLLECTION)
    print(f"Chats: {chats['total']}")
except Exception as e:
    print(f"Error checking chats: {e}")
