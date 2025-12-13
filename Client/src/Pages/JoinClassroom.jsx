import React, { useState } from "react";
import Sidebar from "../Components/Dasboard/Sidebar";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function JoinClassroom() {
  const { user, token, fetchMe } = useAuth();
  const navigate = useNavigate();

  const [classCode, setClassCode] = useState("");
  const [joinedClass, setJoinedClass] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_SAFE = (import.meta.env.VITE_API_BASE && import.meta.env.VITE_API_BASE.trim())
    ? import.meta.env.VITE_API_BASE.replace(/\/+$/, "")
    : "http://localhost:8000";

  const url = `${API_BASE_SAFE}/class/join`;

  const handleJoin = async () => {
    if (!classCode || !classCode.trim()) {
      alert("Enter class code");
      return;
    }
    if (!token) {
      alert("You are not authenticated. Please login again.");
      navigate("/", { replace: true });
      return;
    }

    setLoading(true);
    try {
      const payload = { classCode: String(classCode).trim() };
      console.log("JOIN payload:", payload, "POST URL ->", url);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        alert("Session expired. Please login again.");
        navigate("/", { replace: true });
        return;
      }
      if (res.status === 404) {
        alert("Server endpoint not found (404). Check API path.");
        return;
      }

      const text = await res.text();
      console.log("RAW RESPONSE:", text);

      if (!text || text.trim() === "") {
        alert("Server returned empty response. Check server logs.");
        return;
      }

      const data = JSON.parse(text);

      if (!data.success) {
        alert(data.message || "Failed to join class");
        return;
      }

      setJoinedClass(data.classroom);
      // refresh auth user data so dashboard shows joined class immediately (if fetchMe exists)
      if (fetchMe) {
        try { await fetchMe(); } catch (e) { console.warn("fetchMe failed", e); }
      }

      alert("Joined classroom successfully!");
    } catch (err) {
      console.error("JOIN CLASS ERROR:", err);
      alert("Server error — check browser console and server logs.");
    } finally {
      setLoading(false);
    }
  };

  const sidebarData = {
    profileImage: user?.profileImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    name: user?.name || "Unknown User",
    email: user?.email || "No Email Found",
    usn: user.usn || "No USN Found",
  };

  return (
    <div className="flex min-h-screen bg-[#f8db5a]">

      {/* LEFT SIDEBAR */}
      <Sidebar
        profileImage={sidebarData.profileImage}
        name={sidebarData.name}
        email={sidebarData.email}
        usn={sidebarData.usn}
      />

      {/* RIGHT CONTENT */}
      <div className="flex-1 flex justify-center items-start p-6 md:p-10">
        {joinedClass ? (
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl text-center w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">Joined Classroom</h2>

            <div className="text-left mx-auto w-full max-w-xl">
              <p className="font-semibold">Class Name</p>
              <p className="mb-3">{joinedClass.subjectName || joinedClass.title || joinedClass.name}</p>

              <p className="font-semibold">Teacher</p>
              <p className="mb-3">{joinedClass.teacherName}</p>

              <p className="font-semibold">Class Code</p>
              <div className="flex items-center gap-3">
                <div className="bg-[#f3ffd4] p-3 rounded-lg font-bold">{joinedClass.classCode}</div>
                <button
                  className="text-xl"
                  onClick={() => {
                    navigator.clipboard.writeText(joinedClass.classCode);
                    alert(`Class code "${joinedClass.classCode}" copied to clipboard!`);
                  }}
                >
                  📋
                </button>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => navigate("/user/dashboard")}
                className="bg-gray-200 hover:bg-gray-300 px-6 py-2 text-lg rounded-2xl"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl w-full max-w-3xl">
            <h1 className="text-3xl font-bold text-center mb-8">Join Classroom</h1>

            <label className="font-semibold block mb-1">Class Code</label>
            <input
              className="w-full p-3 rounded-xl bg-[#f7ffcf] border mb-4"
              placeholder="Enter Classroom Code (e.g. ab12cd34)"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              aria-label="Class code"
            />

            <button
              onClick={handleJoin}
              disabled={loading}
              className={`w-full ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"} text-white text-lg font-semibold py-3 rounded-xl`}
            >
              {loading ? "Joining..." : "Join"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
