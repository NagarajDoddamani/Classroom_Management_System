import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TabBar from "../Components/SignUp/TabBar";

export default function SignWithFace() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const videoRef = useRef(null);

  const username = state?.UserName;
  const email = state?.useremail;
  const password = state?.userpassword;
  const usn = state?.userusn;

  const [photos, setPhotos] = useState([null, null, null]);
  const [encodings, setEncodings] = useState([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");

  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = async () => {
    const container = document.getElementById("video-container");

    // Create a new video element every time
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    videoRef.current = video;
    container.appendChild(video);

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      setCameraReady(true);
      console.log("Camera ready");
    };
  };

  // -----------------------
  // STOP CAMERA PROPERLY
  // -----------------------
  const stopCamera = () => {
    try {
      const video = videoRef.current;
      if (!video) return;

      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        console.log("Tracks stopped");
      }

      // Remove video element from DOM to fully release camera
      video.srcObject = null;

      const parent = video.parentNode;
      if (parent) {
        parent.removeChild(video);
        console.log("Video element removed");
      }

      // Force Chrome to release webcam
      document.body.offsetHeight;

    } catch (err) {
      console.error("Error stopping camera:", err);
    }
  };

  // -----------------------
  // START CAMERA ON MOUNT
  // -----------------------
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) await startCamera();
    };

    init();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, []);

  const handelCancelregistration = () => {
    stopCamera();
    setTimeout(() => navigate("/"), 200);   // delay ensures camera stops first
  };

  // Convert base64 → File
  const dataURLtoFile = (dataUrl, filename) => {
    let arr = dataUrl.split(","),
      mime = arr[0].match(/:(.*?);/)[1];
    let bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  // -----------------------------------
  // CAPTURE PHOTO + SEND TO BACKEND
  // -----------------------------------
  const capturePhoto = async () => {
    setError("");

    if (!cameraReady) {
      setError("Camera is not ready!");
      return;
    }

    const video = videoRef.current;

    if (video.videoWidth < 50) {
      setError("Camera still loading… Try again.");
      return;
    }

    // Draw image
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const base64Image = canvas.toDataURL("image/png");

    // Prepare file for backend
    const formData = new FormData();
    formData.append("file", dataURLtoFile(base64Image, "face.png"));

    try {
      const res = await fetch("http://localhost:8000/generate-face-id", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Backend response:", data);

      if (!data.success) {
        setError("Face NOT detected. Try again.");
        return;
      }

      // Save photo preview
      setPhotos((prev) => {
        const updated = [...prev];
        updated[index] = base64Image;
        return updated;
      });

      // Save encoding
      setEncodings((prev) => [...prev, data.encoding]);

      // When 3 photos captured → stop camera
      setIndex((prevIndex) => {
        if (prevIndex === 2) {
          stopCamera();
          return prevIndex;
        }
        return prevIndex + 1;
      });

    } catch (err) {
      console.error("Capture failed:", err);
      setError("Capture Failed! Check console.");
    }
  };

  // -----------------------------------
  // REGISTER USER
  // -----------------------------------
  const registerUser = async () => {
    if (encodings.length !== 3) {
      setError("Capture 3 correct photos before continuing!");
      return;
    }

    const payload = {
      name: username,
      email: email,
      password: password,
      usn: usn,
      face_id: encodings,
    };

    try {
      const res = await fetch("http://localhost:8000/save-face-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("Save response:", data);

      if (res.ok && data.status === "saved") {
        alert("Registration successful!");
        stopCamera();
        setTimeout(() => navigate("/"), 200);
      } else {
        alert("Registration failed: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert("Server error. Try again.");
    }
  };

  // -----------------------------------
  // UI
  // -----------------------------------
  return (
    <div className="w-full min-h-screen bg-yellow-300 flex justify-center p-4 md:p-6">
      <div className="bg-white rounded-3xl shadow-xl p-4 md:p-6 w-full max-w-6xl 
                      grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* Sidebar */}
        <div className="order-1 md:order-none">
          <TabBar step={2} />
        </div>

        {/* Main Section */}
        <div className="col-span-3 bg-white p-4 md:p-6 rounded-3xl border">

          {/* Preview Thumbnails */}
          <div className="flex justify-center md:justify-start gap-2 md:gap-4 mb-4 flex-wrap">
            {photos.map((p, i) => (
              <div
                key={i}
                className={`w-24 h-20 md:w-32 md:h-24 border rounded-lg overflow-hidden ${
                  p ? "" : "bg-red-200"
                }`}
              >
                {p && <img src={p} className="w-full h-full object-cover" />}
              </div>
            ))}
          </div>

          {/* Camera Box */}
          <div className="w-full h-60 sm:h-64 md:h-72 lg:h-80 bg-black rounded-xl overflow-hidden mb-4">
            <div
              id="video-container"
              className="w-full h-full"
            ></div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-center text-red-600 font-semibold mb-2">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">

            {encodings.length < 3 ? (
              <button
                onClick={capturePhoto}
                className="bg-green-600 text-white px-6 py-3 rounded-xl w-full sm:w-auto"
              >
                Capture Photo {index + 1}
              </button>
            ) : (
              <button
                onClick={registerUser}
                className="bg-red-600 text-white px-6 py-3 rounded-xl w-full sm:w-auto"
              >
                Register User
              </button>
            )}

            <button
              onClick={handelCancelregistration}
              className="bg-gray-600 text-white px-6 py-3 rounded-xl w-full sm:w-auto"
            >
              Cancel Registration
            </button>

          </div>

        </div>
      </div>
    </div>
  );
  
}
