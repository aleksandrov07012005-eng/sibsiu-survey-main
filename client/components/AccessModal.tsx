import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { AuthUser } from "@shared/types";

interface AccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number;
  itemType: "questionnaire" | "survey" | "program";
  itemName: string;
  onAccessChanged?: () => void;
}

export default function AccessModal({
  isOpen,
  onClose,
  itemId,
  itemType,
  itemName,
  onAccessChanged,
}: AccessModalProps) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [usersData, accessData] = await Promise.all([
          api<AuthUser[]>("/api/auth/users"),
          api<number[]>(`/api/access/${itemType}s/${itemId}/users`),
        ]);

        setUsers(usersData);
        setSelectedUserIds(new Set(accessData));
      } catch (error: any) {
        toast.error(error?.message || "Ошибка при загрузке данных");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, itemId, itemType]);

  const handleToggleUser = (userId: number) => {
    // Prevent current user from removing their own access
    if (userId === currentUser?.id) {
      toast.error("Вы не можете отозвать доступ у себя");
      return;
    }

    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const endpoint = `/api/access/${itemType}s/${itemId}`;
      const currentUserIds = new Set(selectedUserIds);

      // Find which users to add and which to remove
      const oldUserIds = new Set(selectedUserIds);

      // Get current users from the API (in case changed by another user)
      const currentAccess = await api<number[]>(
        `/api/access/${itemType}s/${itemId}/users`,
      );
      oldUserIds.clear();
      currentAccess.forEach((id) => oldUserIds.add(id));

      // Users to grant access to
      for (const userId of currentUserIds) {
        if (!oldUserIds.has(userId)) {
          await api(`${endpoint}/grant`, {
            method: "POST",
            body: JSON.stringify({ user_id: userId }),
          });
        }
      }

      // Users to revoke access from
      for (const userId of oldUserIds) {
        if (!currentUserIds.has(userId)) {
          await api(`${endpoint}/revoke`, {
            method: "DELETE",
            body: JSON.stringify({ user_id: userId }),
          });
        }
      }

      toast.success("Доступ обновлён");
      setTimeout(() => {
        onAccessChanged?.();
        onClose();
      }, 150);
    } catch (error: any) {
      toast.error(error?.message || "Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-[500px] max-h-[600px] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Управление доступом</h2>
            <p className="text-sm text-gray-500 mt-1">{itemName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Загрузка пользователей...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Нет доступных пользователей
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                const hasAccess = selectedUserIds.has(user.id);

                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isCurrentUser
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-gray-50"
                    } ${!isCurrentUser ? "cursor-pointer" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={hasAccess}
                      onChange={() => handleToggleUser(user.id)}
                      disabled={isCurrentUser}
                      className={`w-5 h-5 rounded border-2 accent-blue-accent ${
                        isCurrentUser
                          ? "border-blue-accent cursor-not-allowed opacity-100"
                          : "border-gray-300"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                        {user.full_name || "Без имени"}
                        {isCurrentUser && (
                          <span className="text-xs bg-blue-accent text-white px-2 py-0.5 rounded">
                            Вы
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      {isCurrentUser && hasAccess && (
                        <div className="text-xs text-blue-600 mt-1">
                          ✓ Доступ не может быть отозван
                        </div>
                      )}
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {user.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-60 transition-colors font-semibold text-sm"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
