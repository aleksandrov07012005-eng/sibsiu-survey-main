import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthUser } from "../../shared/types";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";

export default function AdminUsersPage() {
  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery<AuthUser[]>({
    queryKey: ["authUsers"],
    queryFn: () => api<AuthUser[]>("/api/auth/users"),
  });
  const normalizedUsers = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
      })),
    [users],
  );

  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "admin",
  });
  const [creating, setCreating] = useState(false);
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const sortedUsers = useMemo(
    () =>
      [...normalizedUsers].sort(
        (a, b) => a.created_at.getTime() - b.created_at.getTime(),
      ),
    [normalizedUsers],
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      if (!newUser.password) {
        toast.error("Введите пароль");
        return;
      }
      await api("/api/auth/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      });
      toast.success("Пользователь создан");
      setNewUser({ email: "", full_name: "", password: "", role: "admin" });
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Не удалось создать пользователя");
    } finally {
      setCreating(false);
    }
  };

  const handlePassword = async (id: number) => {
    if (!passwords[id]) {
      toast.error("Введите пароль");
      return;
    }
    setUpdatingId(id);
    try {
      await api(`/api/auth/users/${id}/password`, {
        method: "PUT",
        body: JSON.stringify({ password: passwords[id] }),
      });
      toast.success("Пароль обновлён");
      setPasswords((prev) => ({ ...prev, [id]: "" }));
    } catch (error: any) {
      toast.error(error?.message || "Не удалось обновить пароль");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (user: AuthUser) => {
    setTogglingId(user.id);
    try {
      await api(`/api/auth/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      toast.success(
        user.is_active
          ? "Пользователь деактивирован"
          : "Пользователь активирован",
      );
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Не удалось обновить статус");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
        <Sidebar activePage="users" />
      </div>
      <div className="flex-1 lg:ml-[271px] flex flex-col">
        <div className="lg:hidden">
          <Header />
        </div>
        <div className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col gap-4 md:gap-6 lg:gap-8 overflow-y-auto pb-24">
          <div className="hidden lg:flex items-center justify-between">
            <h2 className="text-xl text-text-gray font-medium">Пользователи</h2>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl md:rounded-3xl shadow-lg p-4 md:p-6 lg:p-10 space-y-4">
            <h2 className="text-base md:text-lg font-semibold">
              Создать пользователя
            </h2>
            <form
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2"
              onSubmit={handleCreate}
            >
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(event) =>
                    setNewUser((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg md:rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
                  ФИО
                </label>
                <input
                  value={newUser.full_name}
                  onChange={(event) =>
                    setNewUser((prev) => ({
                      ...prev,
                      full_name: event.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg md:rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
                  Роль
                </label>
                <input
                  value={newUser.role}
                  onChange={(event) =>
                    setNewUser((prev) => ({
                      ...prev,
                      role: event.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg md:rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
                  Пароль
                </label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(event) =>
                    setNewUser((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg md:rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2 text-right">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-blue-accent text-white rounded-lg md:rounded-xl px-4 md:px-6 py-2 font-semibold text-sm shadow-sm disabled:opacity-70 hover:bg-blue-600 transition-colors"
                >
                  {creating ? "Создание…" : "Создать"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl md:rounded-3xl shadow-lg p-4 md:p-6 lg:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base md:text-lg font-semibold">
                Список пользователей
              </h2>
              <button
                onClick={() => refetch()}
                className="text-xs md:text-sm text-blue-500 font-semibold hover:underline self-start sm:self-auto"
              >
                Обновить
              </button>
            </div>
            {isLoading ? (
              <div className="text-center py-10 text-sm text-slate-500">
                Загрузка...
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0 md:overflow-x-visible">
                <div className="inline-block min-w-full md:w-full px-4 md:px-0">
                  <div className="hidden md:block overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-slate-400 border-b border-gray-100">
                          <th className="pb-3 pr-4 font-semibold">E-mail</th>
                          <th className="pb-3 pr-4 font-semibold">ФИО</th>
                          <th className="pb-3 pr-4 font-semibold">Роль</th>
                          <th className="pb-3 pr-4 font-semibold">Статус</th>
                          <th className="pb-3 pr-4 font-semibold">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="align-top hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 pr-4 font-semibold text-slate-900 break-all">
                              {user.email}
                            </td>
                            <td className="py-3 pr-4 text-slate-600">
                              {user.full_name || "—"}
                            </td>
                            <td className="py-3 pr-4 text-slate-600">
                              {user.role}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                  user.is_active
                                    ? "bg-green-50 text-green-600"
                                    : "bg-red-50 text-red-600"
                                }`}
                              >
                                {user.is_active ? "Активен" : "Отключён"}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex flex-col gap-2">
                                <div className="flex gap-1 flex-wrap">
                                  <input
                                    type="password"
                                    placeholder="Пароль"
                                    value={passwords[user.id] || ""}
                                    onChange={(event) =>
                                      setPasswords((prev) => ({
                                        ...prev,
                                        [user.id]: event.target.value,
                                      }))
                                    }
                                    className="flex-1 min-w-[100px] border border-gray-200 rounded-lg px-2 py-1 text-xs"
                                  />
                                  <button
                                    onClick={() => handlePassword(user.id)}
                                    disabled={updatingId === user.id}
                                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60 whitespace-nowrap"
                                  >
                                    {updatingId === user.id ? "…" : "Смен."}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {sortedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="border border-gray-100 rounded-lg p-3 space-y-3 bg-white"
                      >
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">
                              E-mail
                            </label>
                            <p className="text-sm font-semibold text-slate-900 break-all">
                              {user.email}
                            </p>
                          </div>
                          {user.full_name && (
                            <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase">
                                ФИО
                              </label>
                              <p className="text-sm text-slate-600">
                                {user.full_name}
                              </p>
                            </div>
                          )}
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase">
                                Роль
                              </label>
                              <p className="text-sm text-slate-600">
                                {user.role}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                user.is_active
                                  ? "bg-green-50 text-green-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {user.is_active ? "Активен" : "Отключён"}
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="password"
                              placeholder="Новый пароль"
                              value={passwords[user.id] || ""}
                              onChange={(event) =>
                                setPasswords((prev) => ({
                                  ...prev,
                                  [user.id]: event.target.value,
                                }))
                              }
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            />
                            <button
                              onClick={() => handlePassword(user.id)}
                              disabled={updatingId === user.id}
                              className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                            >
                              {updatingId === user.id ? "…" : "Смен."}
                            </button>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
