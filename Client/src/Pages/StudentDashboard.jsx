import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../Components/Dasboard/Sidebar";
import { useAuth } from "../context/AuthProvider";
import ClassHeader from "../Components/Classroom/ClassHeader";

export default function StudentDashboard() {
  const { id } = useParams();                     // classroom ID
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [classData, setClassData] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = import.meta.env.VITE_API_BASE;


  // FETCH CLASSROOM + ATTENDANCE FROM BACKEND
  const fetchClassData = useCallback(async () => {
    setLoading(true);
    try {
      const API_BASE_SAFE = (import.meta.env.VITE_API_BASE && import.meta.env.VITE_API_BASE.trim())
        ? import.meta.env.VITE_API_BASE.replace(/\/+$/, "")
        : "http://localhost:8000";

      const url = `${API_BASE_SAFE}/class/${id}`;
      console.log("FETCH CLASS URL ->", url);
      console.log("token ->", token);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("HTTP status:", res.status, "ok:", res.ok);

      // if server returned error status, read its text and show
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("Server returned error:", res.status, errText);
        // show friendly message on screen by setting classData to null and loading false
        setClassData(null);
        setLoading(false);
        return;
      }

      const text = await res.text();
      console.log("RAW RESPONSE text:", text);

      if (!text || text.trim() === "") {
        console.error("Empty response body from server");
        setClassData(null);
        setLoading(false);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        setClassData(null);
        setLoading(false);
        return;
      }

      console.log("PARSED RESPONSE:", data);

      // expected shape: { success: true, classroom: {...}, attendance: {...} }
      if (!data || data.success === false || !data.classroom) {
        console.warn("No classroom returned or success=false", data);
        setClassData(null);
        setLoading(false);
        return;
      }

      setClassData(data.classroom);
      if (data.attendance && typeof data.attendance.percentage !== "undefined") {
        setAttendance(Number(data.attendance.percentage) || 0);
      } else {
        setAttendance(0);
      }
      setLoading(false);
    } catch (err) {
      console.error("ERROR loading classroom:", err);
      setClassData(null);
      setLoading(false);
    }
  }, [id, token]);


  useEffect(() => {
    const loadData = async () => {
      await fetchClassData();
    };
    loadData();
  }, [fetchClassData]);

  if (loading) return <div className="p-10 text-xl">Loading Dashboard…</div>;

  if (!classData) return <div>No class found</div>;

  const ratio = attendance ?? 0;
  const eligible = ratio >= classData.minAttendance;

  const sidebarData = {
    profileImage:
      user?.profileImage ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    name: user?.name || "Unknown User",
    email: user?.email || "No Email Found",
    usn: user?.usn || "No USN Found",  
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

      {/* ---------------- Main Content ---------------- */}
      <div className="flex-1 p-8">

        {/* -------- Header section -------- */}
        <ClassHeader 
          subjectName={classData.subjectName}
          teacherName={classData.teacherName}
          collegeName={classData.collegeName}
          subjectCode={classData.subjectCode}
        />

        {/* Back button */}
        <button
          className="text-3xl mt-6 ml-2"
          onClick={() => navigate("/user/dashboard")}
        >
          ←
        </button>

        {/* -------- Notice Board -------- */}
        <div className="bg-[#4f7653] text-white p-6 rounded-3xl mt-4 shadow-lg">
          <h2 className="text-xl font-bold text-center mb-2">Notice Board</h2>
          <div>
            <p className="text-lg">• {classData.notice?.notice || "No updates available"}</p>

            {classData.notice && (
              <p className="text-sm text-gray-300 mt-1">
                Published by: {classData.notice.publishedByName} on{" "}
                {new Date(classData.notice.publishedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* -------- Attendance Card -------- */}
        <div className="bg-white p-6 rounded-3xl mt-6 shadow-xl w-[420px]">
          <h2 className="text-xl font-bold mb-4">Attendance Ratio</h2>

          <div className="flex items-center gap-6">
            {/* Circle */}
            <div className="relative w-32 h-32">
              <svg className="w-full h-full">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  stroke="#d9d9d9"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  stroke={eligible ? "#0fa80f" : "#ff0000"}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(ratio / 100) * 283} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90, 55, 55)"
                />
              </svg>

              <div
                className={`absolute inset-0 flex items-center justify-center 
                  text-2xl font-bold 
                  ${eligible ? "text-green-600" : "text-red-600"}`}
              >
                {ratio}%
              </div>
            </div>

            {/* Eligibility text */}
            {!eligible && (
              <p className="text-red-600 font-semibold text-lg">
                You are not Eligible
              </p>
            )}
            {eligible && (
              <p className="text-green-700 font-semibold text-lg">
                You are Eligible
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
