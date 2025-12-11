from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Header
from pydantic import BaseModel
from typing import List
from datetime import timedelta
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
import jwt
import random, string
from fastapi import Body
from bson import ObjectId
import traceback


# ---------------------------
# ENV + DB SETUP
# ---------------------------
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "ClassRoom_DB")
JWT_SECRET = os.getenv("JWT_SECRET", "change_this")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI not found in .env")

# all the name of colections of DB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_col = db["users"]
classrooms_col = db["classrooms"]

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

# for createing the classroom
class CreateClassRequest(BaseModel):
    subjectName: str
    teacherName: str
    department: str
    section: str
    semester: str  # accept string here, we'll coerce
    minAttendance: str  # accept string here, we'll coerce

# for joining the classroom
class JoinClassRequest(BaseModel):
    classCode: str

# the uniq classroom code generating code
def generate_class_code(length=8):
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

# createing the classroom in db
@app.post("/class/create")
async def create_classroom(
    data: CreateClassRequest = Body(...),
    authorization: str = Header(None),
):
    try:
        print("DEBUG /class/create - received payload:", data.dict())
        # Auth header present?
        if not authorization:
            return {"success": False, "message": "Missing Authorization header"}

        # Validate token
        try:
            scheme, token = authorization.split()
            if scheme.lower() != "bearer":
                raise Exception("Bad scheme")
            payload = decode_token(token)
            email = payload.get("sub")
        except Exception as e:
            print("DEBUG token error:", e)
            return {"success": False, "message": "Invalid token"}

        # find user
        user = users_col.find_one({"email": email})
        if not user:
            return {"success": False, "message": "User not found"}

        # coerce numeric fields safely
        try:
            min_att = int(data.minAttendance)
        except Exception:
            try:
                # if provided as float string
                min_att = int(float(data.minAttendance))
            except Exception:
                min_att = 0

        try:
            sem = int(data.semester)
        except Exception:
            sem = None

        # generate unique code
        class_code = generate_class_code()

        classroom_doc = {
            "subjectName": data.subjectName,
            "teacherName": data.teacherName,
            "department": data.department,
            "section": data.section,
            "semester": sem,
            "minAttendance": min_att,
            "classCode": class_code,
            "createdBy": str(user["_id"]),
            "students": [],
            "createdAt": datetime.utcnow()
        }

        # insert and get id
        result = classrooms_col.insert_one(classroom_doc)
        classroom_id = result.inserted_id
        classroom_doc["_id"] = str(classroom_id)

        # push string id into user.createdClassrooms
        users_col.update_one({"email": email}, {"$push": {"createdClassrooms": str(classroom_id)}})

        print("DEBUG /class/create - created:", classroom_doc)
        return {"success": True, "message": "Classroom created successfully", "classroom": classroom_doc}

    except Exception as e:
        # Always return JSON on unexpected errors and log server side
        import traceback
        traceback.print_exc()
        return {"success": False, "message": "Internal server error"}

# ---------- Helpers ----------
def create_token(email: str, expires_hours: int = 8):
    payload = {"sub": email, "exp": datetime.utcnow() + timedelta(hours=expires_hours)}
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token

def decode_token(token: str):
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


# ---------------------------
# Health check
# ---------------------------
@app.get("/health")
async def health_check():
    return {"status": "My health is Fucking"}

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

# ---------- Login (returns token + user minimal info) ----------
@app.post("/login")
async def login(data: LoginRequest):
    email = data.email.strip().lower()
    password = data.password

    user = users_col.find_one({"email": email})
    if not user:
        return {"success": False, "message": "User not found"}

    stored_hash = user.get("password_hash") or user.get("password", "")
    # if bcrypt hash:
    try:
        if stored_hash.startswith("$2"):
            ok = bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
        else:
            ok = (stored_hash == password)
    except Exception:
        return {"success": False, "message": "Server error"}

    if not ok:
        return {"success": False, "message": "Incorrect password"}

    token = create_token(email)
    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": {"name": user.get("name"), "email": user.get("email")}
    }

# ---------- Protected /me endpoint ----------
@app.get("/me")
async def me(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise Exception("Bad scheme")
        payload = decode_token(token)
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = users_col.find_one({"email": email}, {"password_hash": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["_id"] = str(user["_id"])
    return {"user": user}


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


# get the class data
@app.get("/classes/my")
async def get_my_classes(authorization: str = Header(None)):
    # auth header
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # find user
    user = users_col.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # helper to convert list of ids (strings or ObjectId) -> list[ObjectId]
    def _to_objectid_list(raw_list):
        out = []
        if not raw_list:
            return out
        for item in raw_list:
            # if already ObjectId, keep it
            if isinstance(item, ObjectId):
                out.append(item)
                continue
            # if looks like string, try convert
            try:
                out.append(ObjectId(str(item)))
            except Exception:
                # ignore invalid ids (don't crash)
                continue
        return out

    joined_ids_raw = user.get("joinedClassrooms", []) or []
    created_ids_raw = user.get("createdClassrooms", []) or []

    joined_obj_ids = _to_objectid_list(joined_ids_raw)
    created_obj_ids = _to_objectid_list(created_ids_raw)

    # fetch docs (only query if list non-empty)
    joined_classes = []
    created_classes = []

    if joined_obj_ids:
        joined_classes = list(classrooms_col.find({"_id": {"$in": joined_obj_ids}}, {"students": 0}))
    if created_obj_ids:
        created_classes = list(classrooms_col.find({"_id": {"$in": created_obj_ids}}, {"students": 0}))

    # convert ObjectId to string for JSON
    for c in joined_classes:
        c["_id"] = str(c["_id"])
    for c in created_classes:
        c["_id"] = str(c["_id"])

    return {"success": True, "joined": joined_classes, "created": created_classes}

# this fetch the data from the classroom and saves in user db at joinedclass=[]
@app.post("/class/join")
async def join_classroom(data: JoinClassRequest, authorization: str = Header(None)):
    try:
        print("DEBUG /class/join - payload:", data.dict())

        if not authorization:
            return {"success": False, "message": "Missing Authorization header"}

        # validate token
        try:
            scheme, token = authorization.split()
            if scheme.lower() != "bearer":
                return {"success": False, "message": "Invalid auth scheme"}
            payload = decode_token(token)
            email = payload.get("sub")
            if not email:
                return {"success": False, "message": "Invalid token payload"}
        except Exception as e:
            print("DEBUG token error:", e)
            return {"success": False, "message": "Invalid token"}

        # find user
        user = users_col.find_one({"email": email})
        if not user:
            return {"success": False, "message": "User not found"}

        # find classroom by code (case-insensitive)
        code = data.classCode.strip()
        classroom = classrooms_col.find_one({"classCode": code})
        if not classroom:
            return {"success": False, "message": "Classroom not found"}

        # prepare ids as strings
        user_id_str = str(user["_id"])
        class_id_str = str(classroom["_id"])

        # add user to classroom.students (avoid duplicates) and push class id to user's joinedClassrooms
        classrooms_col.update_one(
            {"_id": classroom["_id"]},
            {"$addToSet": {"students": user_id_str}}
        )
        users_col.update_one(
            {"email": email},
            {"$addToSet": {"joinedClassrooms": class_id_str}}
        )

        # re-fetch classroom to return fresh data (excluding students if you prefer)
        classroom_fresh = classrooms_col.find_one({"_id": classroom["_id"]})
        classroom_fresh["_id"] = str(classroom_fresh["_id"])
        # optionally remove students array or convert entries if needed
        return {"success": True, "message": "Joined classroom", "classroom": classroom_fresh}

    except Exception:
        traceback.print_exc()
        return {"success": False, "message": "Internal server error"}
    
# ---------------------------
# dev server entrypoint
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
