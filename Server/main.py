from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from fastapi import APIRouter
import bcrypt
import face_recognition
import numpy as np
import base64
import cv2
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from datetime import datetime
from PIL import Image
import io
from fastapi import Query


# ---------------------------
# ENV + DB SETUP
# ---------------------------
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "ClassRoom_DB")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI not found in .env")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_col = db["users"]

# ---------------------------
# FASTAPI APP + CORS
# ---------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------
# Pydantic models
# ---------------------------
class ImagePayload(BaseModel):
    image_base64: str

class UserFaceModel(BaseModel):
    name: str
    email: str
    password: str       # plain for now (you can hash later)
    face_id: List[List[float]]

# for login verification
class LoginRequest(BaseModel):
    email: str
    password: str

# ---------------------------
# Health check
# ---------------------------
@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"message": "Backend is running"}


# ---------------------------
# Generate Face Encoding (Face ID)
# ---------------------------
@app.post("/generate-face-id")
async def generate_face_id(file: UploadFile = File(...)):
    try:
        # Read image bytes correctly
        image_bytes = await file.read()
        
        # Open image safely
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Convert to NumPy
        image_np = np.array(image)

        # Detect face encoding
        encodings = face_recognition.face_encodings(image_np)

        if len(encodings) == 0:
            return {"success": False, "message": "No face detected"}

        return {
            "success": True,
            "encoding": encodings[0].tolist()
        }

    except Exception as e:
        print("ERROR:", e)
        return {"success": False, "message": str(e)}

# check email alredy exists
@app.get("/check-user")
async def check_user(email: str = Query(...)):
    """Return exists: true/false for given email."""
    user = users_col.find_one({"email": email})
    return {"exists": user is not None}

# login verification
@app.post("/login")
async def login(data: LoginRequest):
    email = data.email
    password = data.password

    user = users_col.find_one({"email": email})
    if not user:
        return {"success": False, "message": "User not found"}

    # if you’re still using plain text (for now):
    if user["password"] != password:
        return {"success": False, "message": "Incorrect password"}
    # # compare hashed password with bcrypt
    # if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
    #     return {"success": False, "message": "Incorrect password"}

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "name": user["name"],
            "email": user["email"]
        }
    }

# ---------------------------
# Save Face ID + user to DB
# ---------------------------
@app.post("/save-face-id")
async def save_face_id(data: UserFaceModel):
    # check duplicate email
    if users_col.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": data.name,
        "email": data.email,
        "password": data.password,          # TODO: replace with hash later
        "face_id": {
            "embeddings": data.face_id,     # <--- IMPORTANT
            "enrolledAt": datetime.utcnow(),
        },
        "joinedClassrooms": [],
        "createdClassrooms": [],
        "createdAt": datetime.utcnow(),
    }

    users_col.insert_one(user_doc)
    return {"status": "saved"}
# ---------------------------
# dev server entrypoint
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
