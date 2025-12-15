import React, { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { useAuth } from "../context/AuthProvider";

export default function FaceSession() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const webcamRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const API = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  // -----------------------------
  // CAPTURE IMAGE FROM CAMERA
  // -----------------------------
  const capturePhoto = () => {
    const imgSrc = webcamRef.current.getScreenshot();
    setImagePreview(imgSrc);
  };

  // -----------------------------
  // UPLOAD IMAGE FROM STORAGE
  // -----------------------------
  const onUpload = (e) => {
    const file = e.target.files[0];
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  // -----------------------------
  // SEND image → BACKEND
  // -----------------------------
  const sendForRecognition = async () => {
    if (!imagePreview) {
      alert("Capture or upload an image first.");
      return;
    }

    const blob = await fetch(imagePreview).then((res) => res.blob());

    const formData = new FormData();
    formData.append("file", blob, "classroom.png");
    formData.append("class_id", id);

    const res = await fetch(`${API}/attendance/face-session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    console.log("Face session response:", data);

    if (data.success) {
      alert(`Attendance updated! Present students: ${data.present.length}`);
      navigate(`/teacher/class/${id}`);
    } else {
      alert(data.message || "Error processing attendance.");
    }
  };

  return (
    <div className="p-8 bg-[#f8db5a] min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Face Attendance Session</h1>

      {/* Webcam */}
      {!imagePreview && (
        <div className="w-[600px] bg-black rounded-xl overflow-hidden">
          <Webcam ref={webcamRef} screenshotFormat="image/png" />
        </div>
      )}

      {/* Preview */}
      {imagePreview && (
        <img
          src={imagePreview}
          className="w-[600px] rounded-xl shadow-xl"
          alt="Preview"
        />
      )}

      <div className="flex gap-4 mt-6">
        {!imagePreview && (
          <button
            className="px-6 py-3 bg-green-600 text-white rounded-xl"
            onClick={capturePhoto}
          >
            Capture
          </button>
        )}

        {!imagePreview && (
          <label className="px-6 py-3 bg-blue-600 text-white rounded-xl cursor-pointer">
            Upload
            <input type="file" className="hidden" onChange={onUpload} />
          </label>
        )}

        {imagePreview && (
          <button
            className="px-6 py-3 bg-orange-600 text-white rounded-xl"
            onClick={() => setImagePreview(null)}
          >
            Retake
          </button>
        )}

        <button
          className="px-6 py-3 bg-red-600 text-white rounded-xl"
          onClick={sendForRecognition}
        >
          Run Recognition
        </button>
      </div>

      <button
        className="mt-6 text-xl underline"
        onClick={() => navigate(`/user/dashboard/teacher/class/${id}`)}
      >
        ← Back
      </button>
    </div>
  );
}
