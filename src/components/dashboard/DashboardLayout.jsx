import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import DashboardLogo from "@/components/dashboard/DashboardLogo";
import { getUserInfo } from "@/lib/api";

const SEARCH_BUTTON_SIZE = 36;
const SEARCH_EXPANDED_WIDTH = 250;
const CUSTOM_SCROLLBAR_WIDTH = 10;
const CUSTOM_SCROLLBAR_THUMB_HEIGHT = 364;

const DEFAULT_USER_PROFILE = {
  username: "Olivia Rhye",
  email: "olivia@untitledui.com",
  firstLetter: "O",
  profileImage: "",
};

function AvatarFace({ userProfile, className = "" }) {
  const profileImage =
    userProfile.profileImage || userProfile.avatarUrl || userProfile.photoUrl || "";
  const firstLetter = (userProfile.firstLetter || userProfile.username || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={userProfile.username || "User avatar"}
        className={className}
      />
    );
  }

  return (
    <div
      aria-label={userProfile.username || "User avatar"}
      className={[
        "flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#2970ff_0%,#6aa4ff_100%)]",
        "font-['Satoshi'] font-bold text-white",
        className,
      ].join(" ")}
    >
      {firstLetter}
    </div>
  );
}

function UserAvatar({ userProfile }) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffffff_0%,#e7efff_48%,#ffffff_100%)] p-[2px] shadow-[0_8px_18px_rgba(34,82,214,0.18)]">
      <AvatarFace
        userProfile={userProfile}
        className="h-full w-full rounded-full object-cover text-[15px]"
      />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-[14px] w-[14px]"
    >
      <path
        d="M1.16675 4.49266C1.16675 3.62224 1.87236 2.91663 2.74279 2.91663C3.19504 2.91663 3.59655 2.62723 3.73956 2.19819L3.79175 2.04163C3.81636 1.96779 3.82866 1.93088 3.84183 1.89813C4.00994 1.47995 4.40389 1.19601 4.85377 1.16876C4.889 1.16663 4.92792 1.16663 5.00575 1.16663H8.99442C9.07225 1.16663 9.11116 1.16663 9.14639 1.16876C9.59627 1.19601 9.99022 1.47995 10.1583 1.89813C10.1715 1.93088 10.1838 1.96779 10.2084 2.04163L10.2606 2.19819C10.4036 2.62723 10.8051 2.91663 11.2574 2.91663C12.1278 2.91663 12.8334 3.62224 12.8334 4.49266V9.44996C12.8334 10.4301 12.8334 10.9201 12.6427 11.2944C12.4749 11.6237 12.2072 11.8914 11.8779 12.0592C11.5036 12.25 11.0135 12.25 10.0334 12.25H3.96675C2.98666 12.25 2.49661 12.25 2.12226 12.0592C1.79298 11.8914 1.52527 11.6237 1.35749 11.2944C1.16675 10.9201 1.16675 10.4301 1.16675 9.44996V4.49266Z"
        stroke="black"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.00008 9.62496C8.44983 9.62496 9.62508 8.44971 9.62508 6.99996C9.62508 5.55021 8.44983 4.37496 7.00008 4.37496C5.55033 4.37496 4.37508 5.55021 4.37508 6.99996C4.37508 8.44971 5.55033 9.62496 7.00008 9.62496Z"
        stroke="black"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="14"
      height="11"
      viewBox="0 0 14 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-[11px] w-[14px]"
    >
      <path
        d="M11.9 0H2.1C0.91 0 0 0.794444 0 1.83333V9.16667C0 10.2056 0.91 11 2.1 11H11.9C13.09 11 14 10.2056 14 9.16667V1.83333C14 0.794444 13.09 0 11.9 0ZM11.9 1.22222C12.04 1.22222 12.11 1.28333 12.18 1.28333L7 5.86667L1.75 1.28333C1.89 1.28333 1.96 1.22222 2.1 1.22222H11.9ZM12.6 9.16667C12.6 9.53333 12.32 9.77778 11.9 9.77778H2.1C1.68 9.77778 1.4 9.53333 1.4 9.16667V2.68889L6.51 7.15C6.79 7.39444 7.21 7.39444 7.49 7.15L12.6 2.68889V9.16667Z"
        fill="#2970FF"
      />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M10.6667 11.3333L14 8M14 8L10.6667 4.66667M14 8H6M6 2H5.2C4.0799 2 3.51984 2 3.09202 2.21799C2.7157 2.40973 2.40973 2.71569 2.21799 3.09202C2 3.51984 2 4.07989 2 5.2V10.8C2 11.9201 2 12.4802 2.21799 12.908C2.40973 13.2843 2.71569 13.5903 3.09202 13.782C3.51984 14 4.0799 14 5.2 14H6"
        stroke="#344054"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileCard({ onSignOut, userProfile }) {
  return (
    <div className="absolute right-0 top-full z-[60] -mt-[7px] flex w-full sm:w-[250px] flex-col overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-white shadow-[0_25px_50px_rgba(0,0,0,0.15),0_10px_20px_rgba(0,0,0,0.1)]">
      <div className="flex h-[94px] w-full shrink-0 flex-col items-start border-b border-[#e5e7eb] bg-gradient-to-r from-[#ede9fe] to-[#e0e7ff] px-4 py-3">
        <div className="flex h-full w-full sm:w-[203px] flex-1 items-center justify-center gap-3 self-center">
          <div className="relative flex h-[65px] w-[65px] items-center justify-center">
            <div className="absolute inset-0 rounded-[200px] border-[0.75px] border-[rgba(3,15,14,0.08)] opacity-[0.08]" />
            <AvatarFace
              userProfile={userProfile}
              className="h-full w-full rounded-full object-cover text-[28px] shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            />
            <button
              type="button"
              className="absolute bottom-0 right-0 flex h-[21px] w-[21px] items-center justify-center rounded-[100px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-transform hover:scale-110"
              aria-label="Change profile photo"
            >
              <CameraIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-start bg-white">
        <div className="flex min-h-[100px] self-stretch flex-col items-center gap-[18px] border-b border-[#eaecf0] px-4 sm:px-0 py-5">
          <div className="flex w-full flex-col items-start sm:px-5">
            <div className="self-stretch font-['Satoshi'] text-[14px] font-bold leading-5 text-[#475467]">
              {userProfile.username}
            </div>

            <div className="mt-[10px] flex items-center gap-[5px] self-stretch">
              <div className="flex h-5 w-5 shrink-0 items-start rounded-[100px] bg-[rgba(19,90,83,0.06)] p-[4px_3px]">
                <MailIcon />
              </div>
              <div className="w-[201px] font-['Satoshi'] text-[14px] font-normal leading-5 text-[#475467]">
                {userProfile.email}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="flex min-h-[54px] self-stretch items-center bg-white px-4 sm:px-0 py-1 text-left transition-all duration-200 hover:bg-[#f9fafb]"
        >
          <div className="flex flex-1 items-center gap-2 sm:pl-5 pr-[6px] py-[2px]">
            <LogOutIcon />
            <div className="flex-1 font-['Inter'] text-[14px] font-medium leading-5 text-[#344054] transition-colors duration-200">
              Log out
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function ExpandableSearchButton() {
  const [query, setQuery] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const collapse = useCallback(() => {
    setIsExpanded(false);
    setIsFocused(false);
    setIsHovered(false);
  }, []);

  const open = useCallback(() => {
    setIsExpanded(true);
  }, []);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        collapse();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [collapse, isExpanded]);

  const handleBlur = (event) => {
    const nextFocused = event.relatedTarget;
    if (!rootRef.current?.contains(nextFocused)) {
      collapse();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      collapse();
    }
  };

  const shellWidth = isExpanded
    ? SEARCH_EXPANDED_WIDTH
    : isHovered
      ? SEARCH_EXPANDED_WIDTH
      : SEARCH_BUTTON_SIZE;

  return (
    <div
      ref={rootRef}
      className="relative h-9 w-9 shrink-0 overflow-visible"
      onMouseEnter={() => {
        if (!isExpanded) setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (!isExpanded) setIsHovered(false);
      }}
    >
      <div
        className={[
          "absolute right-0 top-0 h-9 overflow-hidden rounded-full bg-white",
          "border transition-[width,border-color,box-shadow] duration-300 ease-in-out",
          isFocused
            ? "border-[#bfdbfe] shadow-[0_10px_30px_rgba(15,23,42,0.10),0_0_0_4px_rgba(59,130,246,0.08)]"
            : "border-[#d1d5db] shadow-[0_2px_4px_rgba(0,0,0,0.05)]",
        ].join(" ")}
        style={{ width: `${shellWidth}px` }}
      >
        <Search
          className={[
            "pointer-events-none absolute top-1/2 z-10 h-4 w-4 text-[#6b7280] transition-all duration-300 ease-in-out",
            isExpanded || isHovered
              ? "left-3 -translate-y-1/2"
              : "left-1/2 -translate-x-1/2 -translate-y-1/2",
          ].join(" ")}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search..."
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            open();
            setIsFocused(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={[
            "h-full w-full bg-transparent pr-4 text-sm text-slate-900 outline-none",
            "transition-opacity duration-200 ease-in-out placeholder:text-slate-400",
            isExpanded
              ? "cursor-text pl-10 opacity-100"
              : "pointer-events-none cursor-pointer pl-10 opacity-0",
          ].join(" ")}
          aria-label="Search"
        />

        {!isExpanded ? (
          <button
            type="button"
            aria-label="Open search"
            aria-expanded={isExpanded}
            onClick={open}
            className="absolute inset-0 rounded-full"
          />
        ) : null}
      </div>
    </div>
  );
}

function CustomScrollbar({ children }) {
  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const dragStateRef = useRef({
    pointerId: null,
    startY: 0,
    startScrollTop: 0,
  });

  const [scrollState, setScrollState] = useState({
    isScrollable: false,
    thumbHeight: 0,
    thumbTop: 0,
  });
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);

  const scheduleScrollbarHide = useCallback((delay = 700) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsScrollbarVisible(false);
    }, delay);
  }, []);

  const showScrollbar = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setIsScrollbarVisible(true);
  }, []);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;

    if (!element) return;

    const { clientHeight, scrollHeight, scrollTop } = element;
    const isScrollable = scrollHeight > clientHeight + 1;

    if (!isScrollable) {
      setIsScrollbarVisible(false);
      setScrollState({
        isScrollable: false,
        thumbHeight: 0,
        thumbTop: 0,
      });
      return;
    }

    const trackHeight = clientHeight;
    const thumbHeight = Math.min(CUSTOM_SCROLLBAR_THUMB_HEIGHT, trackHeight);
    const maxThumbTravel = trackHeight - thumbHeight;
    const maxScrollTop = scrollHeight - clientHeight;
    const thumbTop =
      maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTravel : 0;

    setScrollState({
      isScrollable: true,
      thumbHeight,
      thumbTop,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateScrollState();

    const element = scrollRef.current;
    if (!element) return;

    const handleScroll = () => {
      showScrollbar();
      scheduleScrollbarHide();
      updateScrollState();
    };
    const resizeObserver = new ResizeObserver(() => updateScrollState());

    element.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver.observe(element);

    Array.from(element.children).forEach((child) =>
      resizeObserver.observe(child),
    );

    window.addEventListener("resize", updateScrollState);

    return () => {
      element.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [children, scheduleScrollbarHide, showScrollbar, updateScrollState]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const element = scrollRef.current;
      const track = trackRef.current;
      const dragState = dragStateRef.current;

      if (
        !element ||
        !track ||
        dragState.pointerId === null ||
        event.pointerId !== dragState.pointerId
      ) {
        return;
      }

      const deltaY = event.clientY - dragState.startY;
      const maxScrollTop = element.scrollHeight - element.clientHeight;
      const maxThumbTravel = track.clientHeight - scrollState.thumbHeight;

      if (maxScrollTop <= 0 || maxThumbTravel <= 0) return;

      const scrollRatio = maxScrollTop / maxThumbTravel;
      element.scrollTop = dragState.startScrollTop + deltaY * scrollRatio;
    };

    const handlePointerUp = (event) => {
      if (dragStateRef.current.pointerId !== event.pointerId) return;
      dragStateRef.current.pointerId = null;
      scheduleScrollbarHide();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [scheduleScrollbarHide, scrollState.thumbHeight]);

  const handleThumbPointerDown = (event) => {
    const element = scrollRef.current;
    if (!element) return;

    showScrollbar();

    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: element.scrollTop,
    };
  };

  const handleTrackPointerDown = (event) => {
    const element = scrollRef.current;
    const track = trackRef.current;

    if (!element || !track) return;

    const rect = track.getBoundingClientRect();
    const clickOffset = event.clientY - rect.top - scrollState.thumbHeight / 2;
    const maxThumbTravel = rect.height - scrollState.thumbHeight;
    const boundedOffset = Math.max(0, Math.min(clickOffset, maxThumbTravel));
    const maxScrollTop = element.scrollHeight - element.clientHeight;

    if (maxScrollTop <= 0 || maxThumbTravel <= 0) return;

    element.scrollTop = (boundedOffset / maxThumbTravel) * maxScrollTop;
  };

  return (
    <div className="relative mr-[13px] min-h-0 flex-1">
      <div
        ref={scrollRef}
        className="dashboard-panel-scroll flex h-full min-h-0 flex-col overflow-y-auto overscroll-y-contain overflow-x-hidden"
      >
        {children}
      </div>

      {scrollState.isScrollable ? (
        <div
          ref={trackRef}
          className={[
            "absolute right-0 top-0 h-full rounded-[5px] bg-transparent transition-opacity duration-300 ease-in-out",
            isScrollbarVisible
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          ].join(" ")}
          style={{ width: `${CUSTOM_SCROLLBAR_WIDTH}px` }}
          onPointerDown={handleTrackPointerDown}
        >
          <div
            role="presentation"
            className="absolute left-0 cursor-grab rounded-[5px] bg-[#d9d9d9] active:cursor-grabbing"
            style={{
              height: `${scrollState.thumbHeight}px`,
              width: `${CUSTOM_SCROLLBAR_WIDTH}px`,
              transform: `translateY(${scrollState.thumbTop}px)`,
            }}
            onPointerDown={handleThumbPointerDown}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardLayout({
  toolbar,
  children,
  pathname,
  onNavigate,
  onSignOut,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(DEFAULT_USER_PROFILE);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUserProfile = async () => {
      try {
        const response = await getUserInfo();
        const profile = response?.data;

        if (!isMounted || !profile) {
          return;
        }

        setUserProfile({
          username: profile.username || DEFAULT_USER_PROFILE.username,
          email: profile.email || DEFAULT_USER_PROFILE.email,
          firstLetter: profile.firstLetter || DEFAULT_USER_PROFILE.firstLetter,
          profileImage:
            profile.profileImage ||
            profile.avatarUrl ||
            profile.photoUrl ||
            DEFAULT_USER_PROFILE.profileImage,
        });
      } catch {
        // Keep the existing profile placeholder when the backend/token is unavailable.
      }
    };

    loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="dashboard-stage min-h-[100dvh] px-3 py-3 sm:px-4 sm:py-4 lg:px-0 lg:py-0 -ml-[5px]">
      <div className="flex w-full flex-col">
        <div className="dashboard-shell flex h-[calc(100dvh-24px)] min-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden rounded-none bg-white sm:h-[calc(100dvh-32px)] sm:min-h-[calc(100dvh-32px)] lg:h-[100dvh] lg:min-h-[100dvh]">
          <header className="relative z-[30] flex h-[74px] min-h-[74px] items-center justify-between bg-gradient-to-r from-white to-[#fafbfc] px-4 py-4 sm:px-6 lg:px-5">
            <DashboardLogo />

            <div className="flex items-center gap-3">
              <ExpandableSearchButton />
              <div ref={profileMenuRef} className="relative z-[40]">
                <button
                  type="button"
                  onClick={() => setProfileOpen((value) => !value)}
                  aria-label="Open profile menu"
                >
                  <UserAvatar userProfile={userProfile} />
                </button>
                {profileOpen ? (
                  <ProfileCard
                    userProfile={userProfile}
                    onSignOut={() => {
                      setProfileOpen(false);
                      onSignOut?.();
                    }}
                  />
                ) : null}
              </div>
            </div>
          </header>

          <div className="dashboard-body relative z-[1] flex min-h-0 flex-1 gap-0 px-3 pb-3 pt-0 sm:px-4 sm:pb-4 lg:px-0 lg:pb-0">
            <div className="hidden w-auto md:block lg:w-[98px] lg:pl-[18px]">
              <Sidebar pathname={pathname} onNavigate={onNavigate} />
            </div>

            <div className="dashboard-panel flex min-h-0 w-full flex-1 flex-col self-stretch rounded-lg sm:rounded-[21px] border-t border-[#d7dee8] bg-white lg:mt-0 lg:max-w-full lg:flex-1 lg:min-h-[600px]">
              {toolbar ? (
                <div className="z-20 px-4 sm:px-6 md:px-6 lg:px-10 pb-5 pt-5">
                  {toolbar}
                  <div className="mt-5 h-px bg-[#eef1f5]" />
                </div>
              ) : null}
              <CustomScrollbar>{children}</CustomScrollbar>
            </div>

            <div className="hidden lg:block lg:w-[24px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
