import React from "react";
import { Link } from "react-router-dom";

import googleLogo from "../assets/Google.png";
import Userdashboard from "./Dashboard.jsx";

function LoginPage() {
  return (
    <div className="w-full min-h-screen bg-yellow-300 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* Left Section */}
        <div>
          <h1 className="text-4xl font-bold mb-6">Attendance<br />Management System</h1>
          <ul className="space-y-4 text-xl">
            <li className="flex items-center gap-3"><span>✔</span> x</li>
            <li className="flex items-center gap-3"><span>✔</span> y</li>
            <li className="flex items-center gap-3"><span>✔</span> z</li>
            <li className="flex items-center gap-3"><span>✔</span> a</li>
          </ul>
        </div>

        {/* Login Card */}
        <div className="bg-white p-8 rounded-3xl shadow-lg border">
          <h2 className="text-2xl font-bold mb-6 text-center">Login To Your Account</h2>

          <label className="font-semibold">Email</label>
          <input className="w-full border rounded-lg p-3 bg-yellow-100 mb-4" placeholder="Enter Your Email" />

          <label className="font-semibold">Password</label>
          <input className="w-full border rounded-lg p-3 bg-yellow-100 mb-6" type="password" placeholder="*" />

          <button className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg mb-4">Login</button>

          <button className="w-full bg-green-200 font-semibold py-3 rounded-lg flex items-center justify-center gap-2">
            <span><img src={googleLogo} alt="Google" /></span> <a href={Userdashboard}>Login With Google</a>
          </button>

          <p className="text-sm text-center mt-4">
            Don't Have Account <Link to="/user/sign" className="text-red-600"><span>Sign up...</span></Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;



