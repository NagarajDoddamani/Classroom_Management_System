# Classroom Attendance Backend (Flask + OpenCV + face_recognition)
This project is a minimal Flask backend + face-authentication module (MVP).
It provides:
- User signup/login (JWT)
- Face enrollment (upload images -> embeddings stored in MongoDB)
- Attendance session: start, upload frame (match), finalize
- Uses `face_recognition` for embeddings and OpenCV for image handling.

**NOTES**
- This is an MVP starter. For production, harden security, use HTTPS, and improve anti-spoofing.
- Installing `face_recognition` / dlib can be platform-specific; preferred via Docker image with prebuilt deps.

## Quick start (development)
1. Create virtualenv: `python -m venv .venv && source .venv/bin/activate`
2. Install: `pip install -r requirements.txt`
3. Run MongoDB locally (or update MONGO_URI in .env)
4. Run: `python app.py`

## Files
- app.py : Flask application + routes
- face_service.py : face embedding & matching utilities
- models.py : MongoDB helpers (pymongo)
- utils.py : security (password hashing, jwt)
- requirements.txt : Python deps
- .env.example : environment variables example
- docker-compose.yml / Dockerfile : development compose
