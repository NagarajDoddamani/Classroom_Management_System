import React, { useRef, useEffect, useState, useMemo } from "react";

export default function Tabs({ activeTab, setActiveTab }) {
  const tabs = useMemo(() => ["All", "Student", "Teacher"], []);
  const tabRefs = useRef([]);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const index = tabs.indexOf(activeTab);
    const current = tabRefs.current[index];
    if (current) {
      const rect = current.getBoundingClientRect();
      const parentRect = current.parentElement.getBoundingClientRect();

      setSliderStyle({
        left: rect.left - parentRect.left,
        width: rect.width,
      });
    }
  }, [activeTab, tabs]);

  return (
    <div className="relative flex gap-4 justify-center mb-10 bg-blue-200 p-2 rounded-full">

      {/* Sliding active background rectangle */}
      <div
        className="absolute top-0 bottom-0 bg-blue-300 rounded-full transition-all duration-500 ease-in-out"
        style={{
          width: sliderStyle.width,
          left: sliderStyle.left,
        }}
      />

      {tabs.map((tab, i) => (
        <button
          key={tab}
          ref={(el) => (tabRefs.current[i] = el)}
          onClick={() => setActiveTab(tab)}
          className={`relative px-10 py-2 rounded-full text-lg font-semibold transition`
            + ` ${activeTab === tab ? "text-blue-900" : "text-gray-700"}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
