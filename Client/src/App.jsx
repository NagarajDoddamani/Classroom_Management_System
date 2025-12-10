import React from "react";
import { Routes, Route } from "react-router-dom";

import LoginPage from "./Pages/LoginHome.jsx";
import SignUp from "./Pages/SignUp.jsx";
import SignWithFace from "./Pages/SignWithFace.jsx";
import Dashboard from "./Pages/Dashboard.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/user/sign" element={<SignUp />} />
      <Route path="/user/sign/face" element={<SignWithFace />} />
      <Route path="/user/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
