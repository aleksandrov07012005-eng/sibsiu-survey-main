import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function PasswordResetConfirm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      await api(`/api/auth/password-reset/${token}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      toast.success("Пароль обновлён. Войдите заново.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error?.message || "Не удалось сбросить пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Подтвердите токен
        </h1>
        <p className="text-sm text-slate-500">
          Вставьте новый пароль для администратора. Токен действует 1 час.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Новый пароль
            </label>
            <input
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-accent text-white font-semibold py-3 rounded-xl shadow-sm disabled:opacity-70"
          >
            {loading ? "Сброс…" : "Обновить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
