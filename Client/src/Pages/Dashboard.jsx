import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Components/Dasboard/Sidebar.jsx";
import Tabs from "../Components/Dasboard/Tabs.jsx";
import SubjectCard from "../Components/Dasboard/SubjectCard.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // sample subject cards (you can replace with API data later)
  const subjects = [
    { title: "Computer Networks", teacher: "Vadavi", type: "Student" },
    { title: "OOP’s In Java", teacher: "Indira R U", type: "Student" },
    { title: "Web Tec", teacher: "Chetali C", type: "Student" },
    { title: "Minor Project", teacher: "Nagaraj D", type: "Teacher" },
  ];

  useEffect(() => {
    // Load logged-in user from localStorage
    const s = localStorage.getItem("user");
    if (!s) {
      // not logged in — redirect to login
      navigate("/", { replace: true });
      return;
    }
    try {
      const parsed = JSON.parse(s);
      setUser(parsed);
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      localStorage.removeItem("user");
      navigate("/", { replace: true });
      return;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // if somehow still null (safety)
  if (!user) {
    return null;
  }

  const filteredSubjects = activeTab === "All"
    ? subjects
    : subjects.filter((s) => s.type === activeTab);

  // prepare sidebar data from user
  const sidebarData = {
    profileImage: user.profileImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    name: user.name || "Unknown User",
    email: user.email || "No Email"
  };

  return (
    <div className="flex h-screen bg-[#f8db5a]">
      <Sidebar
        profileImage={sidebarData.profileImage}
        name={sidebarData.name}
        info={sidebarData.info}
      />

      <div className="flex-1 px-10 pt-10 relative">
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="grid grid-cols-2 gap-10">
          {filteredSubjects.map((sub, idx) => (
            <SubjectCard key={idx} title={sub.title} teacher={sub.teacher} />
          ))}
        </div>

        <button
          className="absolute bottom-10 right-10 bg-gray-200 rounded-2xl p-6 text-4xl shadow-lg hover:bg-gray-300"
          onClick={() => {/* open create class modal */}}
        >
          +
        </button>
      </div>
    </div>
  );
}
