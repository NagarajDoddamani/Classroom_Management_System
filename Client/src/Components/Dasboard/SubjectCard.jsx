import React from "react";

export default function SubjectCard({ title, teacher, onClick }) {
  return (
    <div
      className="bg-white p-6 rounded-2xl shadow-md w-[330px] cursor-pointer hover:scale-105 transition"
      onClick={onClick}
    >
      <h2 className="font-bold text-xl mb-2">{title}</h2>
      <p className="text-md">~ {teacher}</p>
    </div>
  );
}

