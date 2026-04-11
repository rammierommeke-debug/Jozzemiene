"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Verkeerde gebruikersnaam of wachtwoord.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="text-rose fill-rose" size={28} />
            <span className="font-handwriting text-4xl text-brown">Jozzemiene</span>
          </div>
          <p className="text-brown-light text-sm font-body">want iemand moet dit bijhouden</p>
        </div>

        {/* Card */}
        <div className="bg-warm rounded-3xl p-8 shadow-sm">
          <h1 className="font-display text-2xl text-brown mb-6 text-center">Welkom terug</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brown-light uppercase tracking-wide">
                Gebruikersnaam
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="emma of roel"
                autoComplete="username"
                className="bg-cream border border-warm/80 rounded-2xl px-4 py-3 text-sm text-brown focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brown-light uppercase tracking-wide">
                Wachtwoord
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-cream border border-warm/80 rounded-2xl px-4 py-3 text-sm text-brown focus:outline-none focus:border-sage transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-light hover:text-brown transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="mt-2 bg-terracotta text-cream rounded-2xl py-3 font-semibold text-sm hover:bg-terracotta/80 transition-colors disabled:opacity-50"
            >
              {loading ? "Inloggen..." : "Inloggen"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
