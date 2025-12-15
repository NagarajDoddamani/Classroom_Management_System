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
from fastapi import Form
from datetime import datetime
import csv
from fastapi.responses import StreamingResponse
from io import StringIO

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


# FASTAPI APP + CORS
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _iso_date(dt):
    # returns YYYY-MM-DD string for date-only comparisons
    return dt.strftime("%Y-%m-%d")

class UserFaceModel(BaseModel):
    name: str
    email: str
    password: str       # plain for now (you can hash later)
    usn: str
    face_id: List[List[float]]

def today():
    return datetime.utcnow().strftime("%Y-%m-%d")

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

# for joining the classroom
class JoinClassRequest(BaseModel):
    classCode: str

# for createing the classroom
class CreateClassRequest(BaseModel):
    subjectName: str
    teacherName: str
    department: str
    section: str
    semester: int
    minAttendance: int
    collegeName: str   # needed for report genration
    courseCode: str         # report gen


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

        # direct Int 
        min_att = data.minAttendance
        sem = data.semester

        # generate unique code
        class_code = generate_class_code()

        classroom_doc = {
            "subjectName": data.subjectName,
            "teacherName": data.teacherName,
            "department": data.department,
            "section": data.section,
            "semester": sem,
            "minAttendance": min_att,
            "collegeName": data.collegeName,    
            "courseCode": data.courseCode,     # diffrent from class code (creater) 
            "classCode": class_code,           # this is system genarated
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

# Health check
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

# -----------------------------   
# Teacher Classroom Dashborad page data codes

# the each user face will load 
def compare_face(enc1, enc2, tolerance=0.45):
    enc1 = np.array(enc1)
    enc2 = np.array(enc2)
    dist = np.linalg.norm(enc1 - enc2)
    return dist <= tolerance

# teacher can add the notification of class any updates
class PublishNoticeRequest(BaseModel):
    notice: str

# Pydantic models
class ImagePayload(BaseModel):
    image_base64: str

# /class/${id}`  1st path check done
# GET /class/{class_id}  -> returns classroom meta (for teacher/student)
# GET /class/{class_id} -> returns classroom meta + student attendance
@app.get("/class/{class_id}")
async def get_classroom(class_id: str, authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Missing token")

    # ---------------- TOKEN CHECK ----------------
    try:
        scheme, token = authorization.split()
        payload = decode_token(token)
        email = payload["sub"]
    except:
        raise HTTPException(401, "Invalid token")

    # ---------------- USER FETCH ----------------
    user = users_col.find_one({"email": email})
    if not user:
        raise HTTPException(404, "User not found")

    # ---------------- CLASSROOM FETCH ----------------
    classroom = classrooms_col.find_one({"_id": ObjectId(class_id)})
    if not classroom:
        raise HTTPException(404, "Classroom not found")

    # Convert _id for frontend
    classroom["_id"] = str(classroom["_id"])

    # ---------------- ATTENDANCE CALCULATION ----------------
    total_sessions = attendance_col.count_documents({
        "class_id": ObjectId(class_id)
    })

    present_sessions = attendance_col.count_documents({
        "class_id": ObjectId(class_id),
        "student_id": user["_id"],
        "present": True
    })

    percentage = 0
    if total_sessions > 0:
        percentage = round((present_sessions / total_sessions) * 100)

    return {
        "success": True,
        "classroom": classroom,
        "attendance": {
            "percentage": percentage,
            "present_days": present_sessions,
            "total_days": total_sessions
        }
    }
# ${API_BASE}/class/${id}/attendance/today
# GET /class/{class_id}/attendance/today -> returns attendance array for today
# @app.get("/attendance/today/{class_id}")
@app.get("/class/{class_id}/attendance/today")
async def get_today_attendance(class_id: str, authorization: str = Header(None)):
    
    # Optional: auth check
    if not authorization:
        return {"success": False, "message": "Missing token"}

    today_date = today()

    classroom = classrooms_col.find_one({"_id": ObjectId(class_id)})
    if not classroom:
        return {"success": False, "message": "Classroom not found"}

    student_ids = classroom.get("students", [])

    result = []

    for sid in student_ids:
        student = users_col.find_one({"_id": ObjectId(sid)})
        if not student:
            continue

        # Fetch attendance record for today
        rec = attendance_col.find_one({
            "class_id": ObjectId(class_id),
            "student_id": ObjectId(sid),
            "date": today_date
        })

        if rec:
            status = "present"
            timestamp = rec.get("timestamp") or rec.get("createdAt")
        else:
            status = "absent"
            timestamp = None

        result.append({
            "student_id": str(sid),
            "name": student["name"],
            "usn": student["usn"],
            "status": status,
            "timestamp": timestamp
        })

    return {
        "success": True,
        "attendance": result,
        "count_present": sum(1 for r in result if r["status"] == "present"),
        "count_total": len(result)
    }

# ${API_BASE}/class/${id}/attendance/summary

# ${API_BASE}/class/${id}/notice
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
    
# ${API_BASE}/class/${id}/report/summary
# for total semister report generation of attendance %
@app.get("/class/{class_id}/report/summary")
async def report_summary(class_id: str):

    classroom = classrooms_col.find_one({"_id": ObjectId(class_id)})
    if not classroom:
        raise HTTPException(404, "Class not found")

    student_ids = classroom.get("students", [])

    output = StringIO()
    writer = csv.writer(output)

    # HEADER
    # writer.writerow(["College Name: XYZ COLLEGE"])
    writer.writerow([f"College Name: {classroom.get('collegeName')}"])
    writer.writerow([f"Department: {classroom.get('department')}"])
    writer.writerow([f"Semester: {classroom.get('semester')}  Section: {classroom.get('section')}"])
    writer.writerow([f"Subject: {classroom.get('subjectName')}"])
    writer.writerow([f"Class Code: {classroom.get('courseCode')}"])
    writer.writerow([])

    writer.writerow(["Full Attendance Report"])
    writer.writerow(["Sl.No", "USN", "Name", "Classes Taken", "Classes Attended", "Percentage"])

    for i, sid in enumerate(student_ids, 1):
        stu = users_col.find_one({"_id": ObjectId(sid)})
        total = attendance_col.count_documents({"class_id": ObjectId(class_id)})
        attended = attendance_col.count_documents({
            "class_id": ObjectId(class_id),
            "student_id": ObjectId(sid),
            "present": True
        })
        percent = round((attended / total)*100) if total > 0 else 0

        writer.writerow([i, stu["usn"], stu["name"], total, attended, percent])

    output.seek(0)
    return StreamingResponse(output, media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=summary_report.csv"})

# dowloads the all present + absent
@app.get("/class/{class_id}/present/report/today")
async def report_today(class_id: str):

    today_date = today()

    # fetch classroom
    classroom = classrooms_col.find_one({"_id": ObjectId(class_id)})
    if not classroom:
        raise HTTPException(404, "Class not found")

    student_ids = classroom.get("students", [])

    # prepare CSV writer
    output = StringIO()
    writer = csv.writer(output)

    # HEADER
    # writer.writerow(["College Name: XYZ COLLEGE"])
    writer.writerow([f"College Name: {classroom.get('collegeName')}"])
    writer.writerow([f"Department: {classroom.get('department')}"])
    writer.writerow([f"Semester: {classroom.get('semester')}  Section: {classroom.get('section')}"])
    writer.writerow([f"Subject: {classroom.get('subjectName')}"])
    writer.writerow([f"Class Code: {classroom.get('courseCode')}"])
    writer.writerow([])

    writer.writerow(["Today's Attendance"])
    writer.writerow(["Sl.No", "USN", "Name", "Status", "Seen At"])

    # loop through ALL students, not only present ones
    for i, sid in enumerate(student_ids, 1):
        sid_obj = ObjectId(sid)
        stu = users_col.find_one({"_id": sid_obj})

        if not stu:
            continue

        # Check if attendance exists
        rec = attendance_col.find_one({
            "class_id": ObjectId(class_id),
            "student_id": sid_obj,
            "date": today_date
        })

        if rec:
            status = "Present"
            timestamp = rec.get("createdAt") or rec.get("timestamp")
            if timestamp:
                timestamp = timestamp.strftime("%I:%M:%S %p")
            else:
                timestamp = "-"
        else:
            status = "Absent"
            timestamp = "-"

        writer.writerow([
            i,
            stu.get("usn"),
            stu.get("name"),
            status,
            timestamp
        ])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=today_attendance.csv"}
    )

@app.get("/class/{class_id}/report/today")
async def report_today(class_id: str):

    today_date = today()

    # fetch classroom
    classroom = classrooms_col.find_one({"_id": ObjectId(class_id)})
    if not classroom:
        raise HTTPException(404, "Class not found")

    # fetch attendance of today
    records = list(attendance_col.find({
        "class_id": ObjectId(class_id),
        "date": today_date
    }))

    # prepare CSV stream
    output = StringIO()
    writer = csv.writer(output)

    # HEADER
    # writer.writerow(["College Name: XYZ COLLEGE"])
    writer.writerow([f"College Name: {classroom.get('collegeName')}"])
    writer.writerow([f"Department: {classroom.get('department')}"])
    writer.writerow([f"Semester: {classroom.get('semester')}  Section: {classroom.get('section')}"])
    writer.writerow([f"Subject: {classroom.get('subjectName')}"])
    writer.writerow([f"Class Code: {classroom.get('courseCode')}"])
    writer.writerow([])

    # TITLE
    writer.writerow(["Today's Attendance"])
    writer.writerow(["Sl.No", "USN", "Name", "Status", "Seen At"])

    # data rows
    for i, rec in enumerate(records, 1):
        stu = users_col.find_one({"_id": rec["student_id"]})
        status = "Present" if rec.get("present") else "Absent"

        # FIXED TIMESTAMP LOGIC
        raw_ts = rec.get("timestamp") or rec.get("createdAt")

        if raw_ts:
            try:
                timestamp = raw_ts.strftime("%I:%M:%S %p")
            except:
                timestamp = str(raw_ts)
        else:
            timestamp = "-"

        writer.writerow([i, stu["usn"], stu["name"], status, timestamp])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=today_attendance.csv"}
    )

# -----main photo to attended 
# ${API}/attendance/face-session
# the attendance module
@app.post("/attendance/face-session")
async def attendance_face_session(
    class_id: str = Form(...),
    file: UploadFile = File(...),
    authorization: str = Header(None),
):
    # -------- TOKEN CHECK --------
    if not authorization:
        return {"success": False, "message": "Missing token"}

    try:
        scheme, token = authorization.split()
        payload = decode_token(token)
        email = payload["sub"]
    except:
        return {"success": False, "message": "Invalid token"}

    teacher = users_col.find_one({"email": email})
    if not teacher:
        return {"success": False, "message": "Teacher not found"}

    # -------- CLASSROOM CHECK --------
    classroom = classrooms_col.find_one({"_id": ObjectId(class_id)})
    if not classroom:
        return {"success": False, "message": "Classroom not found"}

    # -------- READ IMAGE --------
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    detected = face_recognition.face_encodings(np.array(image))

    if len(detected) == 0:
        return {"success": False, "message": "No faces detected"}

    detected_faces = [np.array(d) for d in detected]

    # -------- ONLY MATCH STUDENTS JOINED TO THIS CLASS --------
    present = []
    today_date = datetime.utcnow().strftime("%Y-%m-%d")

    for sid_str in classroom.get("students", []):
        sid = ObjectId(sid_str)
        student = users_col.find_one({"_id": sid})

        if not student:
            continue

        # Student encodings
        stored_encs = student.get("face_id", {}).get("embeddings", [])
        if not stored_encs:
            continue

        matched = False

        for stu_enc in stored_encs:
            stu_vec = np.array(stu_enc)

            # Compare against each detected face
            for det in detected_faces:
                dist = np.linalg.norm(stu_vec - det)
                if dist <= 0.45:
                    matched = True
                    break

            if matched:
                break

        if matched:
            present.append({
                "student_id": str(sid),
                "name": student["name"],
                "usn": student["usn"]
            })

            # Update OR insert today's attendance record
            attendance_col.update_one(
                {
                    "student_id": sid,
                    "class_id": ObjectId(class_id),
                    "date": today_date
                },
                {
                    "$set": {
                        "present": True,
                        "updatedAt": datetime.utcnow()
                    }
                },
                upsert=True
            )

    return {
        "success": True,
        "present": present,
        "count": len(present)
    }

# /API_BASE/class/${id}/attendance/summary
@app.get("/class/{class_id}/attendance/summary")
async def attendance_summary(class_id: str, authorization: str = Header(None)):
    if not authorization:
        return {"success": False, "message": "Missing token"}

    try:
        scheme, token = authorization.split()
        payload = decode_token(token)
    except:
        return {"success": False, "message": "Invalid token"}

    classroom = classrooms_col.find_one({"_id": ObjectId(class_id)})
    if not classroom:
        return {"success": False, "message": "Classroom not found"}

    student_ids = classroom.get("students", [])

    summary = []
    
    for sid in student_ids:
        student = users_col.find_one({"_id": ObjectId(sid)})
        if not student:
            continue
        
        total = attendance_col.count_documents({
            "class_id": ObjectId(class_id)
        })

        attended = attendance_col.count_documents({
            "class_id": ObjectId(class_id),
            "student_id": ObjectId(sid),
            "present": True
        })

        percent = round((attended / total) * 100) if total > 0 else 0
        eligible = percent >= (classroom.get("minAttendance") or 0)

        summary.append({
            "usn": student["usn"],
            "name": student["name"],
            "percentage": percent,
            "eligible": eligible
        })

    return {
        "success": True,
        "summary": summary
    }


# ---------------------------
# dev server entrypoint
# ---------------------------
if __name__ == "__main__":

    classroom = classrooms_col.find_one({"_id": ObjectId(class_id)})
    student_ids = classroom.get("students", [])

    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
