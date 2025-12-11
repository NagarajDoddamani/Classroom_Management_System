import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Components/Dasboard/Sidebar.jsx";
import Tabs from "../Components/Dasboard/Tabs.jsx";
import SubjectCard from "../Components/Dasboard/SubjectCard.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function Dashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("All");
  const [user, setUser] = useState(null);
  const [joinedClasses, setJoinedClasses] = useState([]);
  const [createdClasses, setCreatedClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------
  // FUNCTION: Fetch user via token -> /me endpoint
  // --------------------------------------------------
  const fetchUser = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        sessionStorage.removeItem("token");
        navigate("/", { replace: true });
        return;
      }

      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  // --------------------------------------------------
  // FUNCTION: Fetch user's classrooms -> /classes/my
  // --------------------------------------------------
  const fetchClasses = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/classes/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setJoinedClasses(data.joined || []);
        setCreatedClasses(data.created || []);
      }
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
  };

  // --------------------------------------------------
  // ON MOUNT → Fetch user + classes + start interval
  // --------------------------------------------------
  useEffect(() => {
    const init = async () => {
      await fetchUser();
      await fetchClasses();
      setLoading(false);
    };

    init();

    // Auto update every 30 sec
    const interval = setInterval(() => {
      fetchUser();
      fetchClasses();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------
  // Loading State
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg">
        Loading Dashboard...
      </div>
    );
  }

  // --------------------------------------------------
  // No user? Redirect handled already, but safe return
  // --------------------------------------------------
  if (!user) return null;

  // --------------------------------------------------
  // Create dynamic subjects list
  // --------------------------------------------------
  const mergedSubjects = [
    ...joinedClasses.map((c) => ({ ...c, type: "Student" })),
    ...createdClasses.map((c) => ({ ...c, type: "Teacher" })),
  ];

  const subjects =
    activeTab === "All"
      ? mergedSubjects
      : mergedSubjects.filter((s) => s.type === activeTab);

  // --------------------------------------------------
  // Sidebar user details
  // --------------------------------------------------
  const sidebarData = {
    profileImage:
      user.profileImage ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    name: user.name || "Unknown User",
    email: user.email || "No Email Found",
  };

  return (
    <div className="flex h-screen bg-[#f8db5a]">

      {/* LEFT SIDEBAR */}
      <Sidebar
        profileImage={sidebarData.profileImage}
        name={sidebarData.name}
        email={sidebarData.email}

      />

      {/* RIGHT CONTENT */}
      <div className="flex-1 px-10 pt-10 relative">

        {/* Tabs: All / Student / Teacher */}
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Class Cards */}
        <div className="grid grid-cols-2 gap-10 mt-6">
          {subjects.length === 0 ? (
            <p className="text-lg text-gray-700 col-span-2">
              No classes available.
            </p>
          ) : (
            subjects.map((sub) => (
              <SubjectCard
                key={sub._id}
                title={sub.title}
                teacher={sub.teacherName || sub.teacher}
              />
            ))
          )}
        </div>

        {/* Create Class Button */}
        <button
          className="absolute bottom-10 right-10 bg-gray-200 rounded-2xl p-6 
                     text-4xl shadow-lg hover:bg-gray-300"
          onClick={() => {
            // open modal for creating and joining class
            console.log("Open Create/Join Class Modal");
            navigate("/user/class/join-create");
            // The path for page that used for create or join calssroom
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
