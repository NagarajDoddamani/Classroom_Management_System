import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import LoginHome from "./Pages/LoginHome";
import SignUp from "./Pages/SignUp";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginHome />} />
        <Route path="/user/sign" element={<SignUp />} />
      </Routes>
    </Router>
  );
}

export { App };
