import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function PasswordResetRequest() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await api<{ token: string; expires_at: string }>(
        "/api/auth/password-reset",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      );
      setToken(data.token);
      toast.success(
        "Токен готов. Скопируйте его и перейдите в форму подтверждения.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Не удалось запросить сброс");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Сброс пароля</h1>
        <p className="text-sm text-slate-500">
          Введите e-mail администратора, чтобы получить одноразовый токен.
          Скопируйте код и откройте страницу подтверждения.
        </p>
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
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-accent text-white font-semibold py-3 rounded-xl shadow-sm disabled:opacity-70"
          >
            {loading ? "Отправка…" : "Отправить токен"}
          </button>
        </form>
        {token && (
          <div className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border border-dashed border-blue-100">
            Ваш токен:{" "}
            <code className="break-all text-blue-accent">{token}</code>
            <div>Откройте страницу подтверждения и вставьте этот токен.</div>
          </div>
        )}
      </div>
    </div>
  );
}
