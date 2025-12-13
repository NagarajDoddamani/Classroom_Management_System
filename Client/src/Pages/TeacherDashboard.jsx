import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../Components/Dasboard/Sidebar"; // adjust path if needed
import ClassHeader from "../Components/Classroom/ClassHeader";
import { useAuth } from "../context/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function AttendanceCircle({ percent, eligible }) {
  // small svg circle used as ratio indicator
  const dash = Math.round((percent / 100) * 283);

  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full">
        <circle cx="50%" cy="50%" r="45%" stroke="#eee" strokeWidth="12" fill="none" />
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          stroke={eligible ? "#16a34a" : "#dc2626"}
          strokeWidth="12"
          fill="none"
          strokeDasharray={`${dash} 283`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${eligible ? "text-green-700" : "text-red-700"}`}>
        {percent}%
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const { id } = useParams(); // class id
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [classData, setClassData] = useState(null);
  const [attendance, setAttendance] = useState([]); // array of { usn, name, status, timestamp }
  const [loading, setLoading] = useState(true);

  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeText, setNoticeText] = useState("");
  const [publishing, setPublishing] = useState(false);

  const sidebarData = {
    profileImage:
      user.profileImage ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    name: user.name || "Unknown User",
    email: user.email || "No Email Found",
    usn: user.usn || "No USN Found",  
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      // fetch classroom meta
      const clsRes = await fetch(`${API_BASE}/class/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!clsRes.ok) {
        console.error("Failed to load class meta", await clsRes.text());
        setClassData(null);
      } else {
        const clsJson = await clsRes.json();
        if (clsJson.success) setClassData(clsJson.classroom);
        else setClassData(null);
      }

      // fetch today's attendance
      const attRes = await fetch(`${API_BASE}/class/${id}/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!attRes.ok) {
        console.warn("No attendance or failed to load today's attendance");
        setAttendance([]);
      } else {
        const attJson = await attRes.json();
        if (attJson.success && Array.isArray(attJson.attendance)) {
          setAttendance(attJson.attendance);
        } else {
          setAttendance([]);
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setClassData(null);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [id, token, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePublishNotice = async () => {
    if (!noticeText || noticeText.trim().length < 3) {
      alert("Enter a short notice before publishing");
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/class/${id}/notice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notice: noticeText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Notice published");
        // attach notice into local classData for immediate UI update
        setClassData((prev) => ({ ...(prev || {}), notice: data.notice }));
        setNoticeText("");
        setNoticeOpen(false);
      } else {
        alert(data.message || "Failed to publish notice");
      }
    } catch (err) {
      console.error("Publish error:", err);
      alert("Server error. Check console.");
    } finally {
      setPublishing(false);
    }
  };

  const presentCount = attendance.filter((r) => r.status === "present").length;
  const totalRoster = (classData?.students && classData.students.length) || (attendance.length || 0);
  const percent = totalRoster === 0 ? 0 : Math.round((presentCount / totalRoster) * 100);
  const eligible = classData ? percent >= (classData.minAttendance || 0) : false;

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-lg">Loading Teacher Dashboard...</div>;
  }

  if (!classData) {
    return <div className="p-10 text-xl">No class found (or you are not authorized)</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#f8db5a]">
      {/* LEFT SIDEBAR */}
      <Sidebar
        profileImage={sidebarData.profileImage}
        name={sidebarData.name}
        email={sidebarData.email}
        usn={sidebarData.usn}
      />

      <div className="flex-1 p-8">
        {/* -------- Header section -------- */}
        <ClassHeader 
          subjectName={classData.subjectName}
          teacherName={classData.teacherName}
        />

        {/* Back */}
        <button className="text-3xl mt-6 ml-2" onClick={() => navigate("/user/dashboard")}>←</button>

        {/* NOTICE & Attendance row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Notice Card */}
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Notice Board</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNoticeOpen((s) => !s)}
                  className="px-3 py-1 bg-blue-200 rounded-full hover:bg-blue-300"
                >
                  {noticeOpen ? "Close" : "Write Notice"}
                </button>
              </div>
            </div>

            {noticeOpen ? (
              <div className="mt-4">
                <label className="block font-semibold mb-2">Notice Info</label>
                <textarea
                  rows={3}
                  className="w-full p-3 rounded-xl bg-[#f7ffcf] border mb-3"
                  placeholder="Enter notice to publish..."
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handlePublishNotice}
                    disabled={publishing}
                    className={`px-6 py-2 rounded-full font-semibold ${publishing ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"} text-white`}
                  >
                    {publishing ? "Publishing..." : "Publish Notice"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-gray-700">{classData.notice?.notice || "No updates available"}</p>
                {classData.notice && (
                  <p className="text-xs text-gray-500 mt-2">Published: {new Date(classData.notice.publishedAt).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>

          {/* Attendance + Ratio Card */}
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Attendance Summary</h2>

            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-3xl font-bold">{presentCount}</p>

                <p className="text-sm text-gray-600 mt-3">Total (roster)</p>
                <p className="text-3xl font-bold">{totalRoster}</p>

                <div className="mt-6">
                  <button
                    onClick={() => fetchData()}
                    className="px-4 py-2 bg-blue-200 hover:bg-blue-300 rounded-full"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="flex-shrink-0">
                <AttendanceCircle percent={percent} eligible={eligible} />
              </div>
            </div>

            <div className="mt-6">
              <p className={`font-semibold ${eligible ? "text-green-700" : "text-red-700"}`}>
                {eligible ? "Class is above minimum attendance" : "Class below minimum attendance"}
              </p>
            </div>
          </div>
        </div>

        {/* Today's attendance list */}
        <div className="bg-[#f3ffd4] p-6 rounded-2xl mt-8 max-w-3xl shadow-md">
          <h2 className="text-xl font-bold mb-3">Today's Attendance</h2>

          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="p-2">USN</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Seen At</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td className="p-4" colSpan={4}>No attendance recorded yet</td></tr>
                ) : (
                  attendance.map((r) => (
                    <tr key={r.student_id || r.usn} className="align-top">
                      <td className="p-2 font-semibold">{r.usn}</td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">
                        <span className={`font-semibold ${r.status === "present" ? "text-green-600" : "text-red-600"}`}>
                          {r.status === "present" ? "Present" : "Absent"}
                        </span>
                      </td>
                      <td className="p-2 text-sm text-gray-600">{r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating action buttons: Report + Camera */}
        <div className="fixed right-6 bottom-6 flex gap-4">
          {/* <button
            onClick={() => navigate(`/class/${id}/report`)}
            className="bg-white p-4 rounded-xl shadow-md"
            title="Report"
          >
            📋
          </button> */}

          <button
            onClick={() => navigate(`/class/${id}/face-session`)}
            className="bg-white p-6 rounded-xl shadow-md text-6xl"
            title="Open camera session"
          >
            📷
          </button>
        </div>
      </div>
    </div>
  );
}
