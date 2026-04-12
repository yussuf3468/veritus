"use client";
import { Suspense, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

function LoginPageContent() {
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/dashboard";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      toast.error("Sign in succeeded but no session was returned.");
      return;
    }

    const safeRedirect = redirect.startsWith("/") ? redirect : "/dashboard";
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      }),
    });

    if (!response.ok) {
      setLoading(false);
      toast.error("Could not establish a server session.");
      return;
    }

    window.location.assign(safeRedirect);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-purple/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass rounded-2xl p-8 relative"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center glow-cyan">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-gradient-cyan">VERITUS</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
        <p className="text-slate-400 text-sm mb-6">Sign in to your life OS</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-medium text-slate-400 mb-1.5"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
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
            <label
              className="block text-xs font-medium text-slate-400 mb-1.5"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-secondary border border-surface-border rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-600 focus:border-brand-cyan/50 focus:bg-brand-cyan/5 transition-colors outline-none"
                placeholder="••••••••"
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-slate-500 text-sm text-center mt-6">
          No account?{" "}
          <Link href="/register" className="text-brand-cyan hover:underline">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-purple/5 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-md glass rounded-2xl p-8 relative">
        <div className="h-6 w-32 skeleton mb-8" />
        <div className="h-8 w-40 skeleton mb-2" />
        <div className="h-4 w-48 skeleton mb-6" />
        <div className="space-y-4">
          <div className="h-14 skeleton" />
          <div className="h-14 skeleton" />
          <div className="h-11 skeleton" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
