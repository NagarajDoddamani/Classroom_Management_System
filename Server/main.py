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
from fastapi import Path

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
# Attendance sesstion data
attendance_col = db["attendance"] 


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

# teacher can add the notification of class any updates
class PublishNoticeRequest(BaseModel):
    notice: str

def _iso_date(dt):
    # returns YYYY-MM-DD string for date-only comparisons
    return dt.strftime("%Y-%m-%d")

class UserFaceModel(BaseModel):
    name: str
    email: str
    password: str       # plain for now (you can hash later)
    usn: str
    face_id: List[List[float]]

# GET /class/{class_id}  -> returns classroom meta (for teacher/student)
@app.get("/class/{class_id}")
async def get_classroom_for_frontend(class_id: str, authorization: str = Header(None)):
    if not authorization:
        return {"success": False, "message": "Missing Authorization header"}

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return {"success": False, "message": "Bad auth scheme"}
        payload = decode_token(token)
        email = payload.get("sub")
        if not email:
            return {"success": False, "message": "Invalid token"}
    except Exception as e:
        return {"success": False, "message": "Invalid token"}

    try:
        # fetch classroom
        classroom = classrooms_col.find_one({"_id": ObjectId(class_id)})
        if not classroom:
            return {"success": False, "message": "Classroom not found"}

        # convert ObjectId fields for safe JSON
        classroom["_id"] = str(classroom["_id"])
        # if students array contains ObjectIds convert them to strings
        if isinstance(classroom.get("students"), list):
            classroom["students"] = [str(s) for s in classroom["students"]]

        # include notice as-is (if stored)
        # We keep the same shape your frontend uses: classroom.minAttendance etc.
        return {"success": True, "classroom": classroom}

    except Exception:
        import traceback
        traceback.print_exc()
        return {"success": False, "message": "Internal server error"}

# GET /class/{class_id}/attendance/today -> returns attendance array for today
@app.get("/class/{class_id}/attendance/today")
async def get_todays_attendance(class_id: str, authorization: str = Header(None)):
    if not authorization:
        return {"success": False, "message": "Missing Authorization header"}

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return {"success": False, "message": "Bad auth scheme"}
        payload = decode_token(token)
        email = payload.get("sub")
        if not email:
            return {"success": False, "message": "Invalid token"}
    except Exception as e:
        return {"success": False, "message": "Invalid token"}

    try:
        # normalize date key (we expect attendance sessions to store "date": "YYYY-MM-DD")
        today_key = _iso_date(datetime.utcnow())

        # find attendance doc for class_id + date
        att_doc = attendance_col.find_one({
            "class_id": ObjectId(class_id),
            "date": today_key
        })

        if not att_doc:
            # not found → return empty attendance array
            return {"success": True, "attendance": []}

        # expected att_doc shape:
        # {
        #   _id, class_id, date, present: [{student_id:ObjectId, usn, name, timestamp}], absent: [...]
        # }
        # We'll merge present + absent into one array with status flag for frontend convenience.
        attendance_list = []

        for p in att_doc.get("present", []):
            attendance_list.append({
                "student_id": str(p.get("student_id")) if p.get("student_id") else None,
                "usn": p.get("usn"),
                "name": p.get("name"),
                "status": "present",
                "timestamp": p.get("timestamp")  # should be ISO string or datetime
            })

        for a in att_doc.get("absent", []):
            attendance_list.append({
                "student_id": str(a.get("student_id")) if a.get("student_id") else None,
                "usn": a.get("usn"),
                "name": a.get("name"),
                "status": "absent",
                "timestamp": a.get("timestamp")
            })

        return {"success": True, "attendance": attendance_list}

    except Exception:
        import traceback
        traceback.print_exc()
        return {"success": False, "message": "Internal server error"}

# teacre post an notice for class (teacher)
# POST /class/{class_id}/notice -> teacher publishes a notice to classroom
@app.post("/class/{class_id}/notice")
async def publish_notice(class_id: str, payload: dict = Body(...), authorization: str = Header(None)):
    """
    payload expected: { "notice": "text to publish" }
    """
    if not authorization:
        return {"success": False, "message": "Missing Authorization header"}

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return {"success": False, "message": "Bad auth scheme"}
        token_payload = decode_token(token)
        email = token_payload.get("sub")
        if not email:
            return {"success": False, "message": "Invalid token"}
    except Exception as e:
        return {"success": False, "message": "Invalid token"}

    try:
        user = users_col.find_one({"email": email})
        if not user:
            return {"success": False, "message": "User not found"}

        notice_text = (payload.get("notice") or "").strip()
        if not notice_text:
            return {"success": False, "message": "Empty notice"}

        notice_obj = {
            "notice": notice_text,
            "publishedAt": datetime.utcnow(),
            "publishedBy": str(user["_id"]),
            "publishedByName": user.get("name")
        }

        # store notice into classroom doc (overwrite latest notice)
        classrooms_col.update_one(
            {"_id": ObjectId(class_id)},
            {"$set": {"notice": notice_obj}}
        )

        # return the saved notice (converted)
        # re-fetch classroom to return updated notice if you want
        return {"success": True, "notice": notice_obj}

    except Exception:
        import traceback
        traceback.print_exc()
        return {"success": False, "message": "Internal server error"}
    
# create the user account with face and basic data
@app.post("/save-face-id")
async def save_face_id(data: UserFaceModel):
    # check duplicate email
    if users_col.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": data.name,
        "email": data.email,
        "password": data.password,          # TODO: replace with hash later
        "usn": data.usn,
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

        if not authorization:
            return {"success": False, "message": "Missing Authorization header"}

        # Validate token - expect "Bearer <token>"
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

        # coerce numeric fields safely
        try:
            min_att = int(data.minAttendance)
        except Exception:
            try:
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

        # push string id into user.createdClassrooms (use addToSet if you want dedupe)
        users_col.update_one({"email": email}, {"$addToSet": {"createdClassrooms": str(classroom_id)}})

        print("DEBUG /class/create - created:", classroom_doc)
        return {"success": True, "message": "Classroom created successfully", "classroom": classroom_doc}

    except Exception:
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
    
# the user as student, classroom data code
@app.get("/class/{class_id}")
async def get_classroom(class_id: str, authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Missing token")

    try:
        scheme, token = authorization.split()
        payload = decode_token(token)
        email = payload["sub"]
    except:
        raise HTTPException(401, "Invalid token")

    user = users_col.find_one({"email": email})
    if not user:
        raise HTTPException(404, "User not found")

    classroom = classrooms_col.find_one({"_id": ObjectId(class_id)})
    if not classroom:
        raise HTTPException(404, "Classroom not found")

    # convert id
    classroom["_id"] = str(classroom["_id"])

    # example: compute student's attendance
    attendance = attendance_col.find_one({
        "student_id": user["_id"],
        "class_id": ObjectId(class_id)
    }) or {"percentage": 0}

    return {
        "success": True,
        "classroom": classroom,
        "attendance": attendance
    }

# ---------------------------
# dev server entrypoint
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
