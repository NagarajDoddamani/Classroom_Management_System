import React, { useState } from "react";
import Sidebar from "../Components/Dasboard/Sidebar";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function CreateClassroom() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [subject, setSubject] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [semester, setSemester] = useState("");
  const [minAttendance, setMinAttendance] = useState("");
  const [createdClass, setCreatedClass] = useState(null);
  const [loading, setLoading] = useState(false);

  // safe API base (fall back to localhost)
  const API_BASE_SAFE = (import.meta.env.VITE_API_BASE && import.meta.env.VITE_API_BASE.trim())
    ? import.meta.env.VITE_API_BASE.replace(/\/+$/, "")
    : "http://localhost:8000";

  const url = `${API_BASE_SAFE}/class/create`;

  const handleCreate = async () => {
    if (!subject || !department || !section || !semester) {
      alert("Please fill all required fields!");
      return;
    }

    if (!token) {
      alert("You are not authenticated. Please login again.");
      navigate("/", { replace: true });
      return;
    }

    setLoading(true);

    try {
      // coerce numeric fields safely
      const payload = {
        subjectName: subject.trim(),
        teacherName: (teacherName.trim() || user?.name || "").trim(),
        department: department.trim(),
        section: section.trim(),
        semester: String(semester),
        minAttendance: String(minAttendance || 75) // default to 75 if empty
      };

      // quick client-side validation for numbers
      if (Number.isNaN(payload.semester) || payload.semester <= 0) {
        alert("Semester must be a positive number.");
        setLoading(false);
        return;
      }
      if (Number.isNaN(payload.minAttendance) || payload.minAttendance < 0) {
        alert("Minimum attendance must be a valid number (e.g. 75).");
        setLoading(false);
        return;
      }

      console.log("SENDING PAYLOAD:", payload);
      console.log("POST URL ->", url);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      // handle common HTTP statuses
      if (res.status === 401) {
        alert("Session expired. Please log in again.");
        // optionally clear token via auth context (call logout if available)
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
        alert(data.message || "Failed to create class");
        return;
      }

      // success: display created data
      setCreatedClass(data.classroom);
      // optionally clear form:
      // setSubject(""); setTeacherName(""); setDepartment(""); setSection(""); setSemester(""); setMinAttendance("");
    } catch (err) {
      console.error("CREATE CLASS ERROR:", err);
      alert("Server error — check browser console and server logs.");
    } finally {
      setLoading(false);
    }
  };

  const sidebarData = {
    profileImage:
      user?.profileImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    name: user?.name || "Unknown User",
    email: user?.email || "No Email Found"
  };

  return (
    <div className="flex min-h-screen bg-[#f8db5a]">

      {/* Left Sidebar */}
      <Sidebar
        profileImage={sidebarData.profileImage}
        name={sidebarData.name}
        email={sidebarData.email}
      />

      {/* Right content */}
      <div className="flex-1 flex justify-center items-start p-6 md:p-10">
        {createdClass ? (
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl text-center w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">
              The Classroom has been Created Successfully!
            </h2>

            <div className="mx-auto bg-[#f3ffd4] p-4 rounded-xl text-3xl font-bold w-80 flex justify-center items-center gap-3">
              {createdClass.classCode}
              <button
                className="text-xl"
                onClick={() => {
                  navigator.clipboard.writeText(createdClass.classCode);
                  alert(`Class code "${createdClass.classCode}" copied to clipboard!`);
                }}
                aria-label="Copy class code"
              >
                📋
              </button>
            </div>

            <p className="mt-6 text-gray-700">
              Send this code to your students so they can join the classroom.
            </p>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => navigate("/user/dashboard")}
                className="bg-gray-200 hover:bg-gray-300 px-6 py-2 text-lg rounded-2xl"
              >
                ← Go Back
              </button>

              <button
                onClick={() => {
                  // optionally navigate into classroom details
                  navigate(`/class/${createdClass._id}`);
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-2xl"
              >
                View Classroom
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl w-full max-w-3xl">
            <h1 className="text-3xl font-bold text-center mb-8">Create Classroom</h1>

            {/* Subject */}
            <label className="font-semibold block mb-1">Subject Name</label>
            <input
              className="w-full p-3 rounded-xl bg-[#f7ffcf] border mb-4"
              placeholder="Enter Subject Name"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label="Subject name"
            />

            {/* Teacher */}
            <label className="font-semibold block mb-1">Teacher Name</label>
            <input
              className="w-full p-3 rounded-xl bg-[#f7ffcf] border mb-4"
              placeholder={user?.name || "Enter Teacher Name"}
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              onFocus={() => {
                if (!teacherName && user?.name) setTeacherName(user.name);
              }}
              aria-label="Teacher name"
            />

            {/* Department */}
            <label className="font-semibold block mb-1">Department</label>
            <input
              className="w-full p-3 rounded-xl bg-[#f7ffcf] border mb-4"
              placeholder="Enter Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              aria-label="Department"
            />

            {/* Section */}
            <label className="font-semibold block mb-1">Section</label>
            <input
              className="w-full p-3 rounded-xl bg-[#f7ffcf] border mb-4"
              placeholder="Enter Section (e.g. A)"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              aria-label="Section"
            />

            {/* Semester */}
            <label className="font-semibold block mb-1">Semester</label>
            <input
              type="number"
              min="1"
              className="w-full p-3 rounded-xl bg-[#f7ffcf] border mb-4"
              placeholder="Enter Semester (number)"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              aria-label="Semester"
            />

            {/* Min attendance */}
            <label className="font-semibold block mb-1">Minimum % Attendance</label>
            <input
              type="number"
              min="0"
              max="100"
              className="w-full p-3 rounded-xl bg-[#f7ffcf] border mb-6"
              placeholder="Enter Minimum % Attendance (e.g. 75)"
              value={minAttendance}
              onChange={(e) => setMinAttendance(e.target.value)}
              aria-label="Minimum attendance"
            />

            <button
              onClick={handleCreate}
              disabled={loading}
              className={`w-full ${loading ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"} text-white text-lg font-semibold py-3 rounded-xl`}
              aria-busy={loading}
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
