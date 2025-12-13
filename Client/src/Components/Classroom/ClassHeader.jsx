import React from "react";

export default function ClassHeader({ subjectName, teacherName }) {
  return (
    <div className="bg-[#dfffad] rounded-b-3xl text-center py-6 shadow-md">
      <h1 className="text-3xl font-bold">{subjectName}</h1>
      <p className="text-lg mt-1">~ {teacherName}</p>
    </div>
  );
}
