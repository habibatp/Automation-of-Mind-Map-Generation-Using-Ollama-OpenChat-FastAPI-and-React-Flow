from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import requests
import json
from datetime import datetime
from fastapi.responses import JSONResponse
import uuid
from slugify import slugify  
# 🔄 Charger les variables d’environnement
load_dotenv()

# 🚀 Initialiser FastAPI
app = FastAPI()

# 🔐 Activer CORS pour permettre les appels depuis React (localhost:3000)
app.add_middleware(
    CORSMiddleware,#Permet à ton frontend (React) d’appeler ton backend sans blocage de sécurité CORS.
    allow_origins=["http://localhost:3000"],#Autorise les requêtes provenant de ton app React en développement.
    allow_credentials=True,#Autorise l’envoi de cookies ou headers d’authentification.
    allow_methods=["*"],#Autorise toutes les méthodes HTTP (GET, POST, etc.).
    allow_headers=["*"],#: Autorise tous les en-têtes HTTP personnalisés (ex. X-API-Key).
)

# 🔧 Variables d’environnement
OLLAMA_URL = os.getenv("OLLAMA_URL")
MODEL_NAME = os.getenv("MODEL_NAME")
API_KEY = os.getenv("API_KEY")

# 📁 Dossier de sauvegarde des mindmaps
OUTPUT_DIR = "MindmapFolder"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 📌 Icônes associées à chaque section
ICONS = {
    "Idea": "💡",
    "Market Research": "📊",
    "Business Model": "💼",
    "Revenue Streams": "💰",
    "Customer Segments": "🎯",
    "Marketing Plan": "📣",
    "Technology Stack": "🛠️",
    "Launch Plan": "🚀"
}

# 📥 Structure de la requête reçue
class MindmapRequest(BaseModel):
    prompt: str

# 🔁 Endpoint : génération automatique avec LLM
@app.post("/generate-mindmap")
def generate_mindmap(req: MindmapRequest, x_api_key: str = Header(...)):
    if not req.prompt or not isinstance(req.prompt, str):
        raise HTTPException(status_code=422, detail="Prompt invalide ou manquant.")

    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    query = f"""
Tu es un assistant expert en startups. Pour l'idée suivante : "{req.prompt}", 
génère un texte synthétique pour chaque section :
- Idea
- Market Research
- Business Model
- Revenue Streams
- Customer Segments
- Marketing Plan
- Technology Stack
- Launch Plan

Réponds en format JSON strict comme ci-dessous :
{{
  "Idea": "...",
  "Market Research": "...",
  ...
}}
    """

    payload = {
        "model": MODEL_NAME,
        "prompt": query,
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        raw = response.json()["response"]

        sections_data = json.loads(raw)

        result = {
            "topic": req.prompt,
            "sections": [
                {
                    "title": title,
                    "icon": ICONS.get(title, ""),
                    "content": content
                }
                for title, content in sections_data.items()
            ]
        }

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"mindmap_{timestamp}.json"
        filepath = os.path.join(OUTPUT_DIR, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# 📌 Endpoint : sauvegarde manuelle des nœuds modifiés (drag & edit)

@app.post("/save-nodes")
async def save_nodes(request: Request, x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = await request.json()#lit le corps JSON envoyé par le frontend.
    nodes = data.get("nodes", [])# Récupère la liste des nœuds modifiés.
    prompt = data.get("prompt", "mindmap")  # ⚠️ assure-toi que le frontend envoie aussi le prompt
    #prompt : Utilisé comme nom du fichier. Si absent, utilise "mindmap".

    # Nettoyer le nom du fichier avec slugify
    safe_filename = f"{slugify(prompt)}.json"# Convertit le prompt en nom de fichier propre (sans accents, espaces, etc.).
    filepath = os.path.join(OUTPUT_DIR, safe_filename)

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(nodes, f, indent=2, ensure_ascii=False)
        return {"message": "✅ Mindmap mise à jour", "file": filepath}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))