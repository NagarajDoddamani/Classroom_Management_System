import React from "react";
import { Routes, Route } from "react-router-dom";

import LoginPage from "./Pages/LoginHome.jsx";
import SignUp from "./Pages/SignUp.jsx";
import SignWithFace from "./Pages/SignWithFace.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import JoinCreateClassroom from "./Pages/join_create_classroom.jsx";
import CreateClassroom from "./Pages/CreateClassroom.jsx";
import JoinClassroom from "./Pages/JoinClassroom.jsx";
import TeacherDashboard from "./Pages/TeacherDashboard.jsx";
import StudentDashboard from "./Pages/StudentDashboard.jsx";
import FaceSession from "./Pages/FaceSession.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/user/sign" element={<SignUp />} />
      <Route path="/user/sign/face" element={<SignWithFace />} />
      <Route path="/user/dashboard" element={<Dashboard />} />
      <Route path="/user/dashboard/class/join-create" element={<JoinCreateClassroom />} />
      <Route path="/user/dashboard/class/createClassroom" element={<CreateClassroom />} />
      <Route path="/user/dashboard/class/joinClassroom" element={<JoinClassroom />} />
      
      <Route path="/user/dashboard/teacher/class/:id" element={<TeacherDashboard />} />
      <Route path="/user/dashboard/student/class/:id" element={<StudentDashboard />} />
      <Route path="/user/dashboard/teacher/class/:id/face-session" element={<FaceSession />} />
    </Routes>
  );
}
