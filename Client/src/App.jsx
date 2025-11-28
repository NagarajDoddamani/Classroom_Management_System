import React from "react";
import { Routes, Route } from "react-router-dom";

import LoginPage from "./Pages/LoginHome.jsx";
import SignUp from "./Pages/SignUp.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/user/sign" element={<SignUp />} />
    </Routes>
  );
}
