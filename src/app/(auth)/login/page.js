"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    if (res?.error) setError("Invalid email or password");
    else router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-96 space-y-4"
      >
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-indigo-600">🧠 NeuroFlip</h1>
          <p className="text-gray-400 text-sm mt-1">Welcome back!</p>
        </div>
        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>
        )}
        <input
          className="w-full border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="w-full border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 font-medium transition">
          Login
        </button>
        <p className="text-center text-sm text-gray-500">
          No account?{" "}
          <Link href="/signup" className="text-indigo-600 font-medium">
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}
