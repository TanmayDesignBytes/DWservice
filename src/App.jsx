import { useEffect, useState } from "react";
import Dashboard from "@/pages/Dashboard";
import Group from "@/pages/Group";
import Login from "@/pages/Login";
import { logoutUser } from "@/lib/api";

const LOCAL_TOKEN_KEY = "dws.auth.token";
const SESSION_TOKEN_KEY = "dws.auth.session.token";

function getStoredToken() {
  return (
    window.localStorage.getItem(LOCAL_TOKEN_KEY) ||
    window.sessionStorage.getItem(SESSION_TOKEN_KEY)
  );
}

function clearStoredTokens() {
  window.localStorage.removeItem(LOCAL_TOKEN_KEY);
  window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  window.localStorage.removeItem("dws.known.users");
}

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);
  const [authToken, setAuthToken] = useState(() => getStoredToken());

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

  const handleSignIn = ({ token, rememberMe }) => {
    clearStoredTokens();
    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    storage.setItem(rememberMe ? LOCAL_TOKEN_KEY : SESSION_TOKEN_KEY, token);
    setAuthToken(token);
    navigate("/dashboard");
  };

  const handleSignOut = async () => {
    try {
      await logoutUser(authToken || getStoredToken());
    } catch {
      // Always clear local auth so the user can still leave the session.
    } finally {
      clearStoredTokens();
      setAuthToken(null);
      window.history.pushState({}, "", "/");
      setPathname("/");
    }
  };

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

  return (
    <Dashboard
      pathname="/dashboard"
      onNavigate={navigate}
      onSignOut={handleSignOut}
    />
  );
}

export default App;
