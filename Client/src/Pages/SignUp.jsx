import React from "react";
import { Link, useNavigate } from "react-router-dom";
import TabBar from "../Components/SignUp/TabBar";
import googleLogo from "../assets/Google.png";

// google auth imports
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../Components/Login/firebase";

export default function SignUp() {
  const navigate = useNavigate();

  const [UserName, setUserName] = React.useState("");
  const [useremail, setUseremail] = React.useState("");
  const [userpassword, setUserpassword] = React.useState("");
  const [userConfirmpassword, setUserConfirmpassword] = React.useState("");

  const handelstep2 = () => {
    if (!UserName || !useremail || !userpassword || !userConfirmpassword) {
      alert("Please fill in all fields.");
      return;
    }
    if (userpassword !== userConfirmpassword) {
      alert("Passwords do not match!");
      return;
    }

    navigate("/user/sign/face", {
      state: { UserName, useremail, userpassword },
    });
  };

  const handelGoogleSignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      setUseremail(user.email ?? "");
      setUserName(user.displayName ?? "");
    } catch (error) {
      console.error("Google Log-In failed:", error.message);
      alert("Google sign-in failed.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8cf57] flex items-center justify-center py-10 px-5">
      <div className="w-full max-w-6xl rounded-[40px] border-[#0071a6] flex p-6 gap-6">
        {/* Left bar */}
        <TabBar step={1} />

        {/* Right section (form) */}
        <div className="flex-1 bg-white rounded-[40px] shadow-md px-10 py-8">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              handelstep2();
            }}
          >
            {/* Name */}
            <div>
              <label className="block font-semibold mb-1">Name</label>
              <input
                type="text"
                placeholder={UserName ? UserName : "Enter Your Name"}
                className="w-full rounded-lg border border-[#c8d494] bg-[#f7ffd7] px-3 py-2 outline-none"
                value={UserName}
                onChange={(e) => setUserName(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block font-semibold mb-1">Email</label>
              <input
                type="email"
                placeholder={useremail ? useremail : "Enter Your Email"}
                className="w-full rounded-lg border border-[#c8d494] bg-[#f7ffd7] px-3 py-2 outline-none"
                value={useremail}
                onChange={(e) => setUseremail(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block font-semibold mb-1">Password</label>
              <input
                type="password"
                placeholder={
                  userpassword ? userpassword : "Enter Your Password"
                }
                className="w-full rounded-lg border border-[#c8d494] bg-[#f7ffd7] px-3 py-2 outline-none"
                value={userpassword}
                onChange={(e) => setUserpassword(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block font-semibold mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm Your Password"
                className="w-full rounded-lg border border-[#c8d494] bg-[#f7ffd7] px-3 py-2 outline-none"
                value={userConfirmpassword}
                onChange={(e) => setUserConfirmpassword(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            {/* Google Login */}
            <button
              onClick={handelGoogleSignin}
              type="button"
              className="w-fit mx-auto bg-[#d8ff9b] text-black border border-[#b3d972] font-semibold py-2 px-5 rounded-full flex items-center justify-center gap-2"
            >
              <img src={googleLogo} className="w-5" />
              Login With Google
            </button>
          </form>

          {/* Already have account */}
          <p className="text-xs text-center mt-4">
            Already Have Account?{" "}
            <Link to="/" className="text-red-600 font-semibold">
              Login...
            </Link>
          </p>

          {/* Step button */}
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={handelstep2}
              className="bg-red-500 text-white font-semibold py-3 px-10 rounded-full flex items-center gap-2"
            >
              Step 2 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
