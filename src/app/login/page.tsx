"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        if (
          res.error.includes("User nahi mila") ||
          res.error.includes("Password galat")
        ) {
          notify.error("Login Failed", "Email ya Password galat hai!");
        } else {
          notify.error(
            "Login Error",
            "Login nahi ho saka. Meharbani karke dubara koshish karein.",
          );
        }
        setLoading(false);
      } else {
        // 1. Success message show karein
        notify.success("Welcome!", "Login Successfully.");

        router.push("/");
        router.refresh();
      }
    } catch (err) {
      notify.error("System Error", "System mein koi masla hua hai.");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .login-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 14px;
          color: #fff;
          outline: none;
          transition: all 0.25s ease;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.25); }
        .login-input:hover {
          background: rgba(255,255,255,0.10);
          border-color: rgba(251,146,60,0.5);
        }
        .login-input:focus {
          background: rgba(255,255,255,0.13);
          border-color: rgba(251,146,60,0.9);
          box-shadow: 0 0 0 3px rgba(251,146,60,0.15);
        }
        .login-btn {
          width: 100%;
          background: linear-gradient(135deg, #fb923c, #f59e0b);
          color: #fff;
          font-size: 16px;
          padding: 13px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 18px rgba(251,146,60,0.4);
        }
        .login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #fdba74, #fb923c);
          box-shadow: 0 8px 28px rgba(251,146,60,0.6);
          transform: translateY(-2px);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .eye-btn {
          position: absolute; right: 11px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.35);
          display: flex; align-items: center;
          padding: 4px; border-radius: 6px;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: #fb923c; }
        .badge-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #fb923c;
          animation: pulseGlow 2s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(251,146,60,0.9); }
          50% { box-shadow: 0 0 3px rgba(251,146,60,0.3); opacity: 0.7; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=85')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 z-0" />

        {/* Amber blobs */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(circle, rgba(251,146,60,0.2) 0%, transparent 70%)",
            filter: "blur(32px)",
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.16) 0%, transparent 70%)",
            filter: "blur(32px)",
          }}
        />

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center w-full px-4">
          {/* Badge */}
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div className="badge-dot" />
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              School Management System
            </span>
          </div>

          {/* Card — fixed width, centered */}
          <div
            className="w-full rounded-3xl p-8"
            style={{
              maxWidth: "450px",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255,255,255,0.11)",
              boxShadow:
                "0 28px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #fb923c, #f59e0b)",
                  boxShadow: "0 6px 24px rgba(251,146,60,0.45)",
                }}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-3xl text-white mb-3">Welcome Back</h1>
              <p
                className="text-[14px] font-medium mb-6"
                style={{ color: "#fb923c" }}
              >
                Please login to your School Account
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 mb-4"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.28)",
                  color: "#fca5a5",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5 mb-4">
                <label
                  className="text-[12px] uppercase tracking-widest mb-2"
                  style={{ color: "#fb923c" }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="admin@school.com"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5 mb-4">
                <label
                  className="text-[12px] uppercase tracking-widest mb-2"
                  style={{ color: "#fb923c" }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="login-input"
                    style={{ paddingRight: "44px" }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="eye-btn"
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    {showPassword ? (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Button */}
              <button
                type="submit"
                disabled={loading}
                className="login-btn mt-1"
              >
                {loading ? (
                  <>
                    <svg
                      style={{ animation: "spin 0.7s linear infinite" }}
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="4"
                      />
                      <path
                        fill="white"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                      />
                    </svg>
                    Checking...
                  </>
                ) : (
                  <>
                    Login to Dashboard
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="flex justify-center items-center gap-1.5 mt-6">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span
                className="text-[14px]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Secured Login &bull; &copy; {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
