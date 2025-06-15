from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import re

app = FastAPI()

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for user tokens (for demo)
user_tokens = {"notion": None}

class ChatRequest(BaseModel):
    message: str

class NotionTokenRequest(BaseModel):
    token: str

@app.get("/")
def read_root():
    return {"message": "Solendir backend is running!"}

async def fetch_notion_items(token: str):
    url = "https://api.notion.com/v1/search"
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, headers=headers, json={"page_size": 20})
            resp.raise_for_status()
            data = resp.json()
            items = []
            for obj in data.get("results", []):
                url = obj.get("url", "")
                if obj["object"] == "page":
                    # Extract title from properties
                    title = None
                    props = obj.get("properties", {})
                    for prop in props.values():
                        if prop.get("type") == "title" and prop["title"]:
                            title = ''.join([t.get("plain_text","") for t in prop["title"]])
                            break
                    items.append(f"Page: {title or obj.get('id')} ({url})")
                elif obj["object"] == "database":
                    # Extract title from 'title' field
                    title = None
                    if obj.get("title"):
                        title = ''.join([t.get("plain_text","") for t in obj["title"]])
                    items.append(f"Database: {title or obj.get('id')} ({url})")
            return items
        except Exception as e:
            return [f"Error fetching Notion items: {str(e)}"]

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    user_message = request.message
    prompt = user_message
    # If the message is about Notion, fetch Notion items and inject as context
    if user_tokens["notion"] and re.search(r"notion|page|database|diet|document|workspace", user_message, re.I):
        notion_items = await fetch_notion_items(user_tokens["notion"])
        context = "User's Notion items:\n" + '\n'.join(notion_items) + "\n"
        prompt = context + f"User question: {user_message}\nAnswer as a helpful assistant."
    ollama_url = "http://localhost:11434/api/generate"
    payload = {
        "model": "llama3",
        "prompt": prompt,
        "stream": False
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(ollama_url, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            return {"response": data.get("response", "(No response from Llama3)")}
        except Exception as e:
            return {"response": f"Error: {str(e)}"}

@app.post("/notion/token")
def set_notion_token(req: NotionTokenRequest):
    user_tokens["notion"] = req.token
    return {"status": "ok"}

@app.get("/notion/pages")
async def get_notion_pages():
    token = user_tokens["notion"]
    if not token:
        return {"error": "No Notion token set."}
    url = "https://api.notion.com/v1/search"
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, headers=headers, json={"page_size": 10})
            resp.raise_for_status()
            data = resp.json()
            return {"raw": data}
        except Exception as e:
            return {"error": str(e)}
