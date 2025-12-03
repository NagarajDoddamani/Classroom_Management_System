import React from "react";

export default function TabBar({ step }) {
  return (
    <div className="w-[280px] bg-[#d9efff] rounded-3xl shadow-xl p-6 flex flex-col gap-10 border border-blue-300">

      {/* Personal Info */}
      <div className={`flex flex-col items-center ${step === 1 ? "opacity-100" : "opacity-70"}`}>
        <div
          className={`w-[110px] h-[110px] rounded-full flex items-center justify-center border-4 ${
            step === 1 ? "border-green-500" : "border-gray-400"
          } bg-white shadow`}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/595/595748.png"
            className="w-16"
          />
        </div>
        <p className="font-semibold text-center mt-2">Personal Info</p>
      </div>

      {/* Face ID */}
      <div className={`flex flex-col items-center ${step === 2 ? "opacity-100" : "opacity-70"}`}>
        <div
          className={`w-[110px] h-[110px] rounded-full flex items-center justify-center border-4 ${
            step === 2 ? "border-green-500" : "border-gray-400"
          } bg-white shadow`}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/2922/2922510.png"
            className="w-16"
          />
        </div>
        <p className="font-semibold text-center mt-2">Face ID Info</p>
      </div>
    </div>
  );
}
