import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    iconSrc: "/Icon.svg",
    match: (pathname) => pathname === "/dashboard" || pathname === "/dashboard/",
  },
  {
    href: "/dashboard/group",
    label: "Group",
    iconSrc: "/group_share.svg",
    match: (pathname) => pathname.startsWith("/dashboard/group"),
  },
];

export default function Sidebar({ pathname, onNavigate }) {
  return (
    <aside className="hidden w-[80px] shrink-0 md:block">
      <nav className="flex w-[62px] flex-col items-center gap-[60px] pt-[31px]">
        {navItems.map((item) => {
          const isActive = item.match(pathname);

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => onNavigate(item.href)}
              className="flex w-full flex-col items-center gap-1 text-center"
            >
              <span
                className={cn(
                  "flex h-[50px] w-[50px] items-center justify-center rounded-[40px] bg-[#f3f3f4] p-4 transition-all",
                  isActive && "bg-[rgba(41,112,255,0.2)]",
                )}
              >
                <img
                  src={item.iconSrc}
                  alt=""
                  className="h-6 w-6 shrink-0 object-contain"
                  aria-hidden="true"
                />
              </span>

              <span
                className={cn(
                  "w-full text-center text-[12px] font-medium leading-6 tracking-[-0.03em] text-[#33363f]",
                  isActive && "font-bold text-[#2970ff]",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
