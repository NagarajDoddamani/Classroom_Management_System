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

  const [photos, setPhotos] = useState([null, null, null]);
  const [encodings, setEncodings] = useState([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");

  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();   // release camera on page exit
    };
  }, []);
  
  // take camera input
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;

      // Wait for video metadata
      videoRef.current.onloadedmetadata = () => {
        console.log("Camera ready:", videoRef.current.videoWidth, videoRef.current.videoHeight);
        setCameraReady(true);
      };

    } catch (err) {
      console.error("Camera Error:", err);
      setError("Camera access denied!");
    }
  };

  // relese camera on unmount
  const stopCamera = () => {
    try {
      const stream = videoRef.current?.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      videoRef.current.srcObject = null;
    } catch (err) {
      console.error("Error stopping camera:", err);
    }
  };

  // Convert base64 → File (fully fixed)
  const dataURLtoFile = (dataUrl, filename) => {
    let arr = dataUrl.split(","), mime = arr[0].match(/:(.*?);/)[1];
    let bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const capturePhoto = async () => {
    setError("");

    try {
      // Ensure camera loaded
      if (!videoRef.current || !cameraReady) {
        setError("Camera is not ready!");
        return;
      }

      const video = videoRef.current;

      // Fix for videoWidth = 0 issue
      if (video.videoWidth < 50 || video.videoHeight < 50) {
        setError("Camera still loading… Try again.");
        console.warn("Video dimensions:", video.videoWidth, video.videoHeight);
        return;
      }

      // Create canvas from video
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const base64Image = canvas.toDataURL("image/png");

      console.log("Sending image to backend…");

      // Prepare multipart upload
      const formData = new FormData();
      formData.append("file", dataURLtoFile(base64Image, "face.png"));

      // Call backend
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

      // Save preview image
      const updatedPhotos = [...photos];
      updatedPhotos[index] = base64Image;
      setPhotos(updatedPhotos);

      // Save encoding
      setEncodings([...encodings, data.encoding]);

      if (index < 2) setIndex(index + 1);

    } catch (err) {
      console.error("Capture failed:", err);
      setError("Capture Failed! Check console for details.");
    }
  };

  const registerUser = async () => {
    if (encodings.length !== 3) {
      setError("Capture 3 correct photos before continuing!");
      return;
    }

    const payload = {
      name: username,
      email: email,
      password: password,
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
        navigate("/");
      } else {
        alert("Registration failed: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert("Server error. Try again.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-yellow-300 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* Sidebar */}
        <TabBar step={2} />

        {/* Right Section */}
        <div className="col-span-3 bg-white p-6 rounded-3xl border">

          {/* Preview */}
          <div className="flex gap-4 mb-4">
            {photos.map((p, i) => (
              <div key={i} className={`w-32 h-24 border rounded-lg overflow-hidden ${p ? "" : "bg-red-200"}`}>
                {p && <img src={p} className="w-full h-full object-cover" />}
              </div>
            ))}
          </div>

          {/* Live Camera */}
          <div className="w-full h-72 bg-black rounded-xl overflow-hidden mb-4">
            <video ref={videoRef} autoPlay className="w-full h-full object-cover" />
          </div>

          {/* Error */}
          {error && <p className="text-center text-red-600 font-semibold">{error}</p>}

          {/* Buttons */}
          <div className="flex justify-center">
            {encodings.length < 3 ? (
              <button
                onClick={capturePhoto}
                className="bg-green-600 text-white px-8 py-3 rounded-xl"
              >
                Capture Photo #{index + 1}
              </button>
            ) : (
              <button
                onClick={registerUser}
                className="bg-red-600 text-white px-8 py-3 rounded-xl"
              >
                Register User
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
