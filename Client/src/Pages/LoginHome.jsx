import React from "react";
import { Link, useNavigate } from "react-router-dom";
import googleLogo from "../assets/Google.png";


// google auth imports
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../Components/Login/firebase";


function LoginPage() {
  const [useremail, setUseremail] = React.useState("");
  const [password, setPassword] = React.useState("");
  
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!useremail || !password) {
      alert("Please fill all fields.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: useremail,
          password: password,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      // Save token for verifying user later
      sessionStorage.setItem("token", data.token);

      // Optionally store user for immediate display
      sessionStorage.setItem("user", JSON.stringify(data.user));

      alert("Login Successful!");

      navigate("/user/dashboard");
    } catch (err) {
      console.error(err);
      alert("Server error while trying to log in.");
    }
  };


  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      setUseremail(user.email);

    } catch (error) {
      console.error("Google Log-In failed:", error.message);
    }
  };


  return (
    <div className="w-full min-h-screen bg-[#f9cf57] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-[#f9cf57] border-[#005b7f] rounded-xl p-6">
        <div className="rounded-3xl shadow-xl p-10 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-10">
          
          {/* Left Section */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-bold leading-snug mb-8">
              Attendance <br />
              Management System
            </h1>

            <ul className="space-y-4 text-xl">
              {["Loram", "Loram", "Loram", "Loram"].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Login Card */}
          <div className="bg-white p-8 rounded-3xl shadow-lg border">
            <h2 className="text-2xl font-bold mb-8 text-center">
              Login To Your Account
            </h2>

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label htmlFor="email" className="block font-semibold mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full border rounded-lg p-3 bg-yellow-100 outline-none"
                  placeholder="Enter Your Email"
                  value={useremail}
                  onChange={(e) => setUseremail(e.target.value)}
                  autoComplete="off"
                  // auto fill off for email
                  required
                />

              </div>

              <div className="mb-6">
                <label htmlFor="password" className="block font-semibold mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full border rounded-lg p-3 bg-yellow-100 outline-none"
                  placeholder="Enter Your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" 
                  // for auto filling password
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg mb-4"
              >
                Login
              </button>
            </form>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-green-200 font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <img src={googleLogo} alt="Google" className="w-6 h-6" />
              <span>Login With Google</span>
            </button>

            <p className="text-xs text-center mt-4">
              Don't Have Account{" "}
              <Link to="/user/sign" className="text-red-600 font-semibold">
                Sign up...
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
