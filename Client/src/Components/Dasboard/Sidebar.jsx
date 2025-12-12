import React from "react";
import { useAuth } from "../../context/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ profileImage, name, email }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="w-[260px] bg-[#c7e7fa] rounded-r-3xl flex flex-col items-center py-10">
      
      {/* Profile Image */}
      <img
        src={profileImage}
        alt="profile"
        className="w-24 h-24 mb-4 rounded-full"
      />

      {/* Name */}
      <p className="font-semibold text-lg">{name}</p>

      {/* Email */}
      <p className="text-sm mt-1">{email}</p>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="mt-8 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-semibold shadow-md transition"
      >
        Logout
      </button>
    </div>
  );
}
