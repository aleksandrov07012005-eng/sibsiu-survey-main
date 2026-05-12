import logoImg from "@/assets/Logo.png";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type NavKey = "oprosi" | "ssylki" | "ankety" | "otchety" | "users";

interface SidebarProps {
  activePage?: NavKey;
}

const baseNavItems = [
  {
    key: "oprosi" as const,
    to: "/",
    label: "Опросы",
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6 flex-shrink-0"
        viewBox="0 0 25 25"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9.375 21.875H5.20833C4.0625 21.875 3.125 20.9375 3.125 19.7917V5.20833C3.125 4.0625 4.0625 3.125 5.20833 3.125H9.375C10.5208 3.125 11.4583 4.0625 11.4583 5.20833V19.7917C11.4583 20.9375 10.5208 21.875 9.375 21.875ZM15.625 21.875H19.7917C20.9375 21.875 21.875 20.9375 21.875 19.7917V14.5833C21.875 13.4375 20.9375 12.5 19.7917 12.5H15.625C14.4792 12.5 13.5417 13.4375 13.5417 14.5833V19.7917C13.5417 20.9375 14.4792 21.875 15.625 21.875ZM21.875 8.33333V5.20833C21.875 4.0625 20.9375 3.125 19.7917 3.125H15.625C14.4792 3.125 13.5417 4.0625 13.5417 5.20833V8.33333C13.5417 9.47917 14.4792 10.4167 15.625 10.4167H19.7917C20.9375 10.4167 21.875 9.47917 21.875 8.33333Z"
          fill={active ? "white" : "#0078FF"}
        />
      </svg>
    ),
  },
  {
    key: "ssylki" as const,
    to: "/ssylki",
    label: "Программы",
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6 flex-shrink-0"
        viewBox="0 0 26 25"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12.9167 22.9167C12.2258 22.914 11.5641 22.694 11.0744 22.3041C10.5847 21.9143 10.3063 21.386 10.2995 20.8334H15.5078C15.5106 21.1119 15.4442 21.3881 15.3125 21.6459C15.1441 21.955 14.8863 22.2276 14.5603 22.4413C14.2343 22.6551 13.8495 22.8037 13.4375 22.875H13.3763C13.225 22.9002 13.0712 22.9142 12.9167 22.9167ZM23.3334 19.7917H2.5V17.7084L5.10417 16.6667V10.9375C5.03557 9.46787 5.45044 8.00955 6.3073 6.70837C6.72896 6.11178 7.30395 5.59349 7.99434 5.18769C8.68473 4.7819 9.47483 4.49782 10.3125 4.35421V2.08337H15.5208V4.35421C18.8789 4.99379 20.7292 7.33129 20.7292 10.9375V16.6667L23.3334 17.7084V19.7917Z"
          fill={active ? "white" : "#0078FF"}
        />
      </svg>
    ),
  },
  {
    key: "ankety" as const,
    to: "/ankety",
    label: "Анкеты",
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 13H2C1.73478 13 1.48043 13.1054 1.29289 13.2929C1.10536 13.4804 1 13.7348 1 14V22C1 22.2652 1.10536 22.5196 1.29289 22.7071C1.48043 22.8946 1.73478 23 2 23H6C6.26522 23 6.51957 22.8946 6.70711 22.7071C6.89464 22.5196 7 22.2652 7 22V14C7 13.7348 6.89464 13.4804 6.70711 13.2929C6.51957 13.1054 6.26522 13 6 13ZM5 21H3V15H5V21ZM22 9H18C17.7348 9 17.4804 9.10536 17.2929 9.29289C17.1054 9.48043 17 9.73478 17 10V22C17 22.2652 17.1054 22.5196 17.2929 22.7071C17.4804 22.8946 17.7348 23 18 23H22C22.2652 23 22.5196 22.8946 22.7071 22.7071C22.8946 22.5196 23 22.2652 23 22V10C23 9.73478 22.8946 9.48043 22.7071 9.29289C22.5196 9.10536 22.2652 9 22 9ZM21 21H19V11H21V21ZM14 1H10C9.73478 1 9.48043 1.10536 9.29289 1.29289C9.10536 1.48043 9 1.73478 9 2V22C9 22.2652 9.10536 22.5196 9.29289 22.7071C9.48043 22.8946 9.73478 23 10 23H14C14.2652 23 14.5196 22.8946 14.7071 22.7071C14.8946 22.5196 15 22.2652 15 22V2C15 1.73478 14.8946 1.48043 14.7071 1.29289C14.5196 1.10536 14.2652 1 14 1ZM13 21H11V3H13V21Z"
          fill={active ? "white" : "#0078FF"}
        />
      </svg>
    ),
  },
  {
    key: "otchety" as const,
    to: "/otchety",
    label: "Отчёты",
    icon: (active: boolean) => (
      <svg
        className="w-7 h-7"
        viewBox="0 0 28 29"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14.25 2.75C11.2663 2.75 8.40483 3.93526 6.29505 6.04505C4.18526 8.15483 3 11.0163 3 14H-0.75L4.1125 18.8625L4.2 19.0375L9.25 14H5.5C5.5 9.1625 9.4125 5.25 14.25 5.25C19.0875 5.25 23 9.1625 23 14C23 18.8375 19.0875 22.75 14.25 22.75C11.8375 22.75 9.65 21.7625 8.075 20.175L6.3 21.95C7.34177 22.9975 8.58061 23.8284 9.94508 24.3948C11.3095 24.9612 12.7726 25.2518 14.25 25.25C17.2337 25.25 20.0952 24.0647 22.205 21.955C24.3147 19.8452 25.5 16.9837 25.5 14C25.5 11.0163 24.3147 8.15483 22.205 6.04505C20.0952 3.93526 17.2337 2.75 14.25 2.75ZM13 9V15.25L18.3125 18.4L19.275 16.8L14.875 14.1875V9H13Z"
          fill={active ? "white" : "#0078FF"}
        />
      </svg>
    ),
  },
];

const adminNavItems = [
  {
    key: "users" as const,
    to: "/admin/users",
    label: "Пользователи",
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 11.5C12.4853 11.5 14.5 9.48529 14.5 7C14.5 4.51472 12.4853 2.5 10 2.5C7.51472 2.5 5.5 4.51472 5.5 7C5.5 9.48529 7.51472 11.5 10 11.5Z"
          stroke={active ? "white" : "#0078FF"}
          strokeWidth="1.5"
        />
        <path
          d="M3.75 16C3.75 13.9289 6.15326 12.5 10 12.5C13.8467 12.5 16.25 13.9289 16.25 16"
          stroke={active ? "white" : "#0078FF"}
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
];

export default function Sidebar({
  activePage = "oprosi",
  isMobile,
  onClose,
}: SidebarProps & { isMobile?: boolean; onClose?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = [
    ...baseNavItems,
    ...(user?.role === "admin" ? adminNavItems : []),
  ];
  const content = (
    <div className="w-full lg:w-[271px] bg-white flex flex-col gap-8 lg:gap-[34px] p-4 lg:p-0 lg:pt-8 lg:pl-8 lg:min-h-screen">
      <div className="flex items-center gap-3">
        <img
          src={logoImg}
          alt="Логотип СибГИУ"
          className="w-[43px] h-[43px] flex-shrink-0"
        />
        <div>
          <h2 className="text-text-gray font-bold text-lg lg:text-2xl tracking-[0.48px]">
            СибГИУ
          </h2>
          <p className="text-text-gray font-bold text-xs lg:text-sm tracking-[0.28px]">
            Первый вуз Кузбасса
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-4 lg:gap-8 flex-1">
        {navItems.map((item) => {
          const isActive = activePage === item.key;
          return (
            <Link
              key={item.key}
              to={item.to}
              onClick={onClose}
              className={`flex items-center gap-3 ${
                isActive
                  ? "bg-blue-accent h-16 text-white rounded-[10px] px-4 lg:px-10"
                  : "text-text-gray px-4 lg:px-0"
              }`}
            >
              {item.icon(isActive)}
              <span className="font-semibold text-lg lg:text-xl">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 mt-auto mb-4 lg:mb-8 px-4 lg:px-0">
        <button
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
          className="flex items-center gap-2 text-sm font-semibold text-blue-accent"
        >
          <span>Выход</span>
          <svg
            className="w-6 h-6"
            viewBox="0 0 25 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.20841 2.58337H19.7917C20.068 2.58337 20.333 2.69312 20.5283 2.88847C20.7237 3.08382 20.8334 3.34877 20.8334 3.62504V22.375C20.8334 22.6513 20.7237 22.9163 20.5283 23.1116C20.333 23.307 20.068 23.4167 19.7917 23.4167H5.20841C4.93215 23.4167 4.6672 23.307 4.47185 23.1116C4.27649 22.9163 4.16675 22.6513 4.16675 22.375V3.62504C4.16675 3.34877 4.27649 3.08382 4.47185 2.88847C4.6672 2.69312 4.93215 2.58337 5.20841 2.58337ZM9.37508 11.9584V8.83337L4.16675 13L9.37508 17.1667V14.0417H15.6251V11.9584H9.37508Z"
              fill="#0078FF"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white w-72 h-full shadow-xl">
          <div className="p-4 flex items-center justify-between">
            <div className="text-lg font-semibold">Меню</div>
            <button
              className="text-gray-600"
              onClick={onClose}
              aria-label="Закрыть меню"
            >
              ✕
            </button>
          </div>
          <div className="p-0 overflow-auto h-[calc(100%-56px)]">{content}</div>
        </div>
      </div>
    );
  }

  return <div className="hidden lg:flex">{content}</div>;
}
