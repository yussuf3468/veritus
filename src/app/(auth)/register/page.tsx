"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          }),
        });

        if (!response.ok) {
          toast.error("Account created, but session sync failed.");
          return;
        }

        toast.success("Account created! Redirecting…");
        window.location.assign("/dashboard");
        return;
      }

      toast.success("Account created! Check your email to verify, then sign in.");
      window.location.assign("/login");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-brand-purple/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-brand-cyan/5  rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass rounded-2xl p-8 relative"
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center glow-cyan">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-gradient-cyan">VERITUS</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
        <p className="text-slate-400 text-sm mb-6">
          Start your personal life OS
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Full name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-bg-secondary border border-surface-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-cyan/50 focus:bg-brand-cyan/5 transition-colors outline-none"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-secondary border border-surface-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-cyan/50 focus:bg-brand-cyan/5 transition-colors outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-secondary border border-surface-border rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-600 focus:border-brand-cyan/50 focus:bg-brand-cyan/5 transition-colors outline-none"
                placeholder="Min 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-brand-cyan to-brand-purple text-white font-semibold text-sm transition-opacity disabled:opacity-60 hover:opacity-90 mt-2"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-slate-500 text-sm text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-cyan hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
