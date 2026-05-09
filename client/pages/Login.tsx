import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, login, processing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, from, navigate]);

  if (user) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await login(email.trim(), password);
      toast.success("Вы успешно вошли");
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error(error?.message || "Не удалось войти");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Вход для авторов
          </h1>
          <p className="text-sm text-slate-500">
            Введите свои учетные данные, чтобы продолжить.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="admin@demo.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Пароль
            </label>
            <input
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={processing}
            className="w-full bg-blue-accent text-white font-semibold py-3 rounded-xl shadow-sm disabled:opacity-70"
          >
            {processing ? "Вход…" : "Войти"}
          </button>
        </form>
        <div className="text-center text-sm text-slate-500">
          <Link to="/password-reset" className="text-blue-accent font-semibold">
            Забыли пароль?
          </Link>
        </div>
      </div>
    </div>
  );
}
