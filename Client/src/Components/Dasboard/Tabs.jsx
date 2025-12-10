import React from "react";

export default function Tabs({ activeTab, setActiveTab }) {
  const tabs = ["All", "Student", "Teacher"];

  return (
    <div className="flex gap-4 justify-center mb-10">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-10 py-2 rounded-full text-lg font-semibold transition 
            ${activeTab === tab ? "bg-blue-300" : "bg-blue-200"}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
