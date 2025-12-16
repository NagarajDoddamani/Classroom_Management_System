import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Components/Dasboard/Sidebar.jsx";
import { AuthContext } from "../context/AuthProvider.jsx";

export default function ChooseClassroom() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const sidebarData = {
    profileImage:
      user?.profileImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    name: user?.name || "Unknown User",
    email: user?.email || "No Email Found",
    usn: user?.usn || "No USN Found",
  };

  return (
    <div className="min-h-screen bg-[#f8db5a] flex flex-col md:flex-row p-4 md:p-10">

      {/* LEFT SIDEBAR */}
      <div className="w-full md:w-[280px] flex-shrink-0 mb-6 md:mb-0">
        <Sidebar
          profileImage={sidebarData.profileImage}
          name={sidebarData.name}
          email={sidebarData.email}
          usn={sidebarData.usn}
        />
      </div>

      
      {/* RIGHT CONTENT */}
      <div className="flex-1 flex justify-center items-start">
          
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10 w-full max-w-4xl">

          {/* Create Classroom */}
          <div
            onClick={() => navigate("/user/dashboard/class/createClassroom")}
            className="cursor-pointer bg-white rounded-3xl shadow-xl p-8 md:p-10 
                      hover:scale-105 transition transform"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Create Classroom
            </h2>
            <p className="text-sm md:text-base">
              Create your own class and invite students using a unique class code.
            </p>
          </div>

          {/* Join Classroom */}
          <div
            onClick={() => navigate("/user/dashboard/class/joinClassroom")}
            className="cursor-pointer bg-white rounded-3xl shadow-xl p-8 md:p-10 
                      hover:scale-105 transition transform"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Join Classroom
            </h2>
            <p className="text-sm md:text-base">
              Join an existing class using the code given by your teacher.
            </p>
          </div>

        </div>

      </div>
    </div>
  );

}
