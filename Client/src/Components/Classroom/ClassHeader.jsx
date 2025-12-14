import React from "react";

export default function ClassHeader({ subjectName, teacherName, collegeName, subjectCode }) {
  return (
    <div className="bg-[#dfffad] rounded-b-3xl text-center py-6 shadow-md">
      <h1 className="text-3xl font-bold">{subjectName}</h1>
      <p className="text-lg mt-1">~ {teacherName}</p>
      <p className="text-sm mt-1">{collegeName} | {subjectCode}</p>
    </div>
  );
}
