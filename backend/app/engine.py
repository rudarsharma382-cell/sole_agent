import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI SDK with OpenRouter base URL and API Key
client = OpenAI(
    base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
    api_key=os.getenv("OPENROUTER_API_KEY"),
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "SOLE_AGENT",
    }
)

def get_model_name():
    return os.getenv("MODEL_NAME", "meta-llama/llama-3.1-8b-instruct")
