import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Components/Dasboard/Sidebar";

export default function SelectClassAction() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="flex h-screen bg-[#f8db5a]">

      <Sidebar
        profileImage={user.profileImage}
        name={user.name}
        info="other infos"
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <button
          className="bg-gray-300 px-10 py-4 rounded-xl text-xl font-semibold"
          onClick={() => navigate("/user/class/create")}
        >
          Create Classroom
        </button>

        <button
          className="bg-gray-300 px-10 py-4 rounded-xl text-xl font-semibold"
          onClick={() => navigate("/user/class/join")}
        >
          Join Classroom
        </button>
      </div>

    </div>
  );
}
