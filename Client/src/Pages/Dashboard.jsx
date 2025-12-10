import React, { useState } from "react";
import Sidebar from "../Components/Dasboard/Sidebar.jsx";
import Tabs from "../Components/Dasboard/Tabs.jsx";
import SubjectCard from "../Components/Dasboard/SubjectCard.jsx";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("All");

  // sidebar data
  const sidebarData = {
    profileImage: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    name: "Nagaraj Doddamani",
    info: "other infos"
  };

  // card data
  const subjects = [
    { title: "Computer Networks", teacher: "Vadavi", type: "Student" },
    { title: "OOP’s In Java", teacher: "Indira R U", type: "Student" },
    { title: "Web Tec", teacher: "Chetali C", type: "Student" },
    { title: "Minor Project", teacher: "Nagaraj D", type: "Teacher" },
  ];

  const filteredSubjects =
    activeTab === "All"
      ? subjects
      : subjects.filter((s) => s.type === activeTab);

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
          className="absolute bottom-10 right-10 bg-gray-200 rounded-2xl p-6 
                     text-4xl shadow-lg hover:bg-gray-300"
        >
          +
        </button>

      </div>
    </div>
  );
}
