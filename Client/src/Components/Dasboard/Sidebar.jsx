import React from "react";

export default function Sidebar({ profileImage, name, info }) {
  return (
    <div className="w-[260px] bg-[#c7e7fa] rounded-r-3xl flex flex-col items-center py-10">
      <img
        src={profileImage}
        alt="profile"
        className="w-24 h-24 mb-4 rounded-full"
      />
      <p className="font-semibold text-lg">{name}</p>
      <p className="text-sm mt-1">{info}</p>
    </div>
  );
}
