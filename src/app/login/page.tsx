"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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
          setError("Email ya Password galat hai!");
        } else {
          setError(
            "Login nahi ho saka. Meharbani karke dubara koshish karein.",
          );
        }
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("System mein koi masla hua hai.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          School Login
        </h1>

        {error && (
          <p className="bg-red-100 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="email"
            placeholder="Email Address"
            className="w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg disabled:bg-gray-400"
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
