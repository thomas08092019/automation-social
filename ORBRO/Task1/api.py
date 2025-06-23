"""
RTLS REST API Server
Provides REST API endpoints for tag management and status queries
Reads data from registered_tags.json and state.json files
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import datetime
import os

app = FastAPI(
    title="RTLS API Server",
    description="Real-Time Location System API for tag management",
    version="1.0.0"
)

# File paths
REGISTERED_TAGS_FILE = "registered_tags.json"
TAG_STATE_FILE = "state.json"

# Pydantic Models
class TagRegister(BaseModel):
    id: str
    description: str

class TagStatus(TagRegister):
    last_cnt: Optional[int] = None
    last_seen: Optional[str] = None

# Helper Functions
def read_json_file(filename: str) -> dict:
    """Read JSON file safely, return empty dict if file doesn't exist"""
    try:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return {}

def write_json_file(filename: str, data: dict):
    """Write data to JSON file safely"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error writing {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to write {filename}")

# API Endpoints

@app.get("/")
def root():
    """Root endpoint with API information"""
    return {
        "name": "RTLS API Server",
        "version": "1.0.0",
        "description": "Real-Time Location System API",
        "endpoints": {
            "POST /tags": "Register a new tag",
            "GET /tags": "Get all registered tags with status",
            "GET /tag/{id}": "Get specific tag details",
            "GET /health": "Health check"
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.post("/tags")
def register_tag(tag: TagRegister):
    """Register a new tag"""
    try:
        # Read current registered tags
        registered_tags = read_json_file(REGISTERED_TAGS_FILE)
        
        # Check if tag already exists
        if tag.id in registered_tags:
            raise HTTPException(
                status_code=400,
                detail=f"Tag {tag.id} is already registered"
            )
        
        # Add new tag
        registered_tags[tag.id] = {
            "id": tag.id,
            "description": tag.description,
            "registered_at": datetime.datetime.now().isoformat()
        }
        
        # Save to file
        write_json_file(REGISTERED_TAGS_FILE, registered_tags)
        
        return {
            "message": f"Tag {tag.id} registered successfully",
            "tag": registered_tags[tag.id]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/tags")
def get_all_tags():
    """Get all registered tags with their current status"""
    try:
        # Read registered tags and current states
        registered_tags = read_json_file(REGISTERED_TAGS_FILE)
        tag_states = read_json_file(TAG_STATE_FILE)
        
        if not registered_tags:
            return []
        
        # Combine registration info with current status
        result = []
        for tag_id, tag_info in registered_tags.items():
            tag_status = TagStatus(
                id=tag_id,
                description=tag_info.get("description", ""),
                last_cnt=tag_states.get(tag_id, {}).get("last_cnt"),
                last_seen=tag_states.get(tag_id, {}).get("last_seen")
            )
            result.append(tag_status)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/tag/{tag_id}")
def get_tag_details(tag_id: str):
    """Get details for a specific tag"""
    try:
        # Read registered tags and current states
        registered_tags = read_json_file(REGISTERED_TAGS_FILE)
        tag_states = read_json_file(TAG_STATE_FILE)
        
        # Check if tag is registered
        if tag_id not in registered_tags:
            raise HTTPException(
                status_code=404,
                detail=f"Tag {tag_id} not found. Please register the tag first."
            )
        
        # Get tag info
        tag_info = registered_tags[tag_id]
        tag_state = tag_states.get(tag_id, {})
        
        # Create response
        tag_status = TagStatus(
            id=tag_id,
            description=tag_info.get("description", ""),
            last_cnt=tag_state.get("last_cnt"),
            last_seen=tag_state.get("last_seen")
        )
        
        return {
            "tag": tag_status,
            "registered_at": tag_info.get("registered_at"),
            "is_active": tag_state.get("last_seen") is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)