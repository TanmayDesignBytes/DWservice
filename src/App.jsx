import { useEffect, useState } from "react";
import Dashboard from "@/pages/Dashboard";
import Group from "@/pages/Group";
import Login from "@/pages/Login";
import MyAccount from "@/pages/MyAccount";
import { logoutUser } from "@/lib/api";

const LOCAL_TOKEN_KEY = "dws.auth.token";
const SESSION_TOKEN_KEY = "dws.auth.session.token";
const LOCAL_TOKEN_TIME_KEY = "dws.auth.token.issuedAt";
const SESSION_TOKEN_TIME_KEY = "dws.auth.session.token.issuedAt";
const LOCAL_PROFILE_KEY = "dws.auth.profile";
const SESSION_PROFILE_KEY = "dws.auth.session.profile";
const SESSION_DURATION_MS = 60 * 60 * 1000;

function clearStorageGroup(storage, tokenKey, timeKey, profileKey) {
  storage.removeItem(tokenKey);
  storage.removeItem(timeKey);
  storage.removeItem(profileKey);
}

function parseStoredProfile(rawProfile) {
  if (!rawProfile) {
    return null;
  }

  try {
    const parsedProfile = JSON.parse(rawProfile);

    if (parsedProfile && typeof parsedProfile === "object") {
      return parsedProfile;
    }
  } catch {
    return null;
  }

  return null;
}

function clearStoredTokens() {
  clearStorageGroup(
    window.localStorage,
    LOCAL_TOKEN_KEY,
    LOCAL_TOKEN_TIME_KEY,
    LOCAL_PROFILE_KEY,
  );
  clearStorageGroup(
    window.sessionStorage,
    SESSION_TOKEN_KEY,
    SESSION_TOKEN_TIME_KEY,
    SESSION_PROFILE_KEY,
  );
}

function getStoredSession(storage, tokenKey, timeKey, profileKey) {
  const token = storage.getItem(tokenKey);
  const issuedAtRaw = storage.getItem(timeKey);
  const profile = parseStoredProfile(storage.getItem(profileKey));

  if (!token || !issuedAtRaw) {
    return null;
  }

  const issuedAt = Number(issuedAtRaw);

  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt >= SESSION_DURATION_MS) {
    clearStorageGroup(storage, tokenKey, timeKey, profileKey);
    return null;
  }

  return { token, issuedAt, profile };
}

function getStoredAuthState() {
  return (
    getStoredSession(
      window.localStorage,
      LOCAL_TOKEN_KEY,
      LOCAL_TOKEN_TIME_KEY,
      LOCAL_PROFILE_KEY,
    ) ||
    getStoredSession(
      window.sessionStorage,
      SESSION_TOKEN_KEY,
      SESSION_TOKEN_TIME_KEY,
      SESSION_PROFILE_KEY,
    )
  );
}

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);
  const [authState, setAuthState] = useState(() => getStoredAuthState());
  const authToken = authState?.token || null;

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigate = (nextPath) => {
    if (nextPath === window.location.pathname) {
      return;
    }

    window.history.pushState({}, "", nextPath);
    setPathname(window.location.pathname);
    setSearch(window.location.search);
  };

  const expireSession = () => {
    clearStoredTokens();
    setAuthState(null);
    window.history.pushState({}, "", "/");
    setPathname("/");
    setSearch("");
  };

  const handleSignIn = ({ token, rememberMe, profile = null }) => {
    clearStoredTokens();
    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    const tokenKey = rememberMe ? LOCAL_TOKEN_KEY : SESSION_TOKEN_KEY;
    const timeKey = rememberMe ? LOCAL_TOKEN_TIME_KEY : SESSION_TOKEN_TIME_KEY;
    const profileKey = rememberMe ? LOCAL_PROFILE_KEY : SESSION_PROFILE_KEY;
    const issuedAt = Date.now();

    storage.setItem(tokenKey, token);
    storage.setItem(timeKey, String(issuedAt));
    if (profile) {
      storage.setItem(profileKey, JSON.stringify(profile));
    }
    setAuthState({ token, issuedAt, profile });
    navigate("/dashboard");
  };

  const handleSignOut = async () => {
    try {
      await logoutUser(authToken || getStoredAuthState()?.token || "");
    } catch {
      // Always clear local auth so the user can still leave the session.
    } finally {
      expireSession();
    }
  };

  useEffect(() => {
    if (!authState?.issuedAt) {
      return undefined;
    }

    const checkSessionExpiry = () => {
      const latestSession = getStoredAuthState();

      if (!latestSession) {
        expireSession();
        return true;
      }

      if (Date.now() - latestSession.issuedAt >= SESSION_DURATION_MS) {
        expireSession();
        return true;
      }

      return false;
    };

    const remainingTime = authState.issuedAt + SESSION_DURATION_MS - Date.now();

    if (remainingTime <= 0) {
      expireSession();
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      checkSessionExpiry();
    }, remainingTime);

    const intervalId = window.setInterval(() => {
      checkSessionExpiry();
    }, 60 * 1000);

    const handleWindowFocus = () => {
      checkSessionExpiry();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSessionExpiry();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authState]);

  if (!authToken) {
    return (
      <Login
        pathname={pathname}
        search={search}
        onNavigate={navigate}
        onSignIn={handleSignIn}
      />
    );
  }

  if (
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname === "/dashboard/"
  ) {
    return (
      <Dashboard
        pathname="/dashboard"
        onNavigate={navigate}
        onSignOut={handleSignOut}
      />
    );
  }

  if (pathname === "/dashboard/group" || pathname === "/dashboard/group/") {
    return (
      <Group
        pathname="/dashboard/group"
        onNavigate={navigate}
        onSignOut={handleSignOut}
      />
    );
  }

  if (
    pathname === "/dashboard/account" ||
    pathname === "/dashboard/account/"
  ) {
    return (
      <MyAccount
        pathname="/dashboard/account"
        onNavigate={navigate}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <Dashboard
      pathname="/dashboard"
      onNavigate={navigate}
      onSignOut={handleSignOut}
    />
  );
}

export default App;
