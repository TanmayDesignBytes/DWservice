import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { forgotPassword, loginUser, resetPassword, signupUser } from "@/lib/api";

const KNOWN_USERS_KEY = "dws.known.users";
const EMPTY_RESET_VALUES = {
  token: "",
  newPassword: "",
};

const EMPTY_SIGNUP_VALUES = {
  username: "",
  email: "",
  password: "",
};

const VIEW_COPY = {
  login: {
    title: "Log in to your account",
    description: "Welcome back! Please enter your details.",
    submitLabel: "Sign in",
  },
  signup: {
    title: "Create your account",
    description: "Enter your details to create a new account.",
    submitLabel: "Sign up",
  },
  forgot: {
    title: "Forgot your password?",
    description: "Enter your email and we will trigger the reset flow.",
    submitLabel: "Send reset token",
  },
  reset: {
    title: "Reset your password",
    description: "Enter the reset token and choose a new password.",
    submitLabel: "Reset password",
  },
};

function BrandMark() {
  return (
    <img
      src="/DB_Logo.svg"
      alt="Design Bytes"
      className="h-[1.75rem] sm:h-[2.3125rem] w-auto max-w-full object-contain"
    />
  );
}

function getViewFromPathname(pathname) {
  if (pathname.startsWith("/signup")) {
    return "signup";
  }

  if (pathname.startsWith("/forgot-password")) {
    return "forgot";
  }

  if (pathname.startsWith("/reset-password")) {
    return "reset";
  }

  return "login";
}

function getResetTokenFromLocation(pathname, search) {
  const params = new URLSearchParams(search || "");
  const queryToken =
    params.get("token") || params.get("code") || params.get("resetToken");

  if (queryToken) {
    return queryToken;
  }

  const segments = String(pathname || "")
    .split("/")
    .filter(Boolean);

  if (segments[0] === "reset-password" && segments[1]) {
    return decodeURIComponent(segments.slice(1).join("/"));
  }

  return "";
}

function readKnownUsers() {
  try {
    const rawValue = window.localStorage.getItem(KNOWN_USERS_KEY);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
  } catch {
    return {};
  }
}

function rememberKnownUser(email, profile) {
  if (!email || !profile?.username) {
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return;
  }

  const knownUsers = readKnownUsers();
  knownUsers[normalizedEmail] = profile;
  window.localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify(knownUsers));
}

function buildProfileFromAuth(response, fallbackEmail) {
  const profileSource =
    response?.data?.user ||
    response?.data ||
    response?.user ||
    response ||
    {};
  const normalizedEmail = fallbackEmail.trim().toLowerCase();
  const rememberedProfile = readKnownUsers()[normalizedEmail] || {};
  const username =
    profileSource.username ||
    profileSource.name ||
    profileSource.fullName ||
    rememberedProfile.username ||
    rememberedProfile.name ||
    "User";
  const email =
    profileSource.email ||
    rememberedProfile.email ||
    fallbackEmail.trim() ||
    "No email available";

  return {
    username,
    email,
    firstLetter:
      profileSource.firstLetter ||
      rememberedProfile.firstLetter ||
      username.trim().charAt(0).toUpperCase() ||
      "U",
    profileImage:
      profileSource.profileImage ||
      profileSource.avatarUrl ||
      profileSource.photoUrl ||
      rememberedProfile.profileImage ||
      rememberedProfile.avatarUrl ||
      rememberedProfile.photoUrl ||
      "",
  };
}

function Login({ pathname = "/", search = "", onNavigate, onSignIn }) {
  const initialView = useMemo(() => getViewFromPathname(pathname), [pathname]);
  const resetTokenFromUrl = useMemo(
    () => getResetTokenFromLocation(pathname, search),
    [pathname, search],
  );
  const hasResetToken = Boolean(resetTokenFromUrl);
  const [view, setView] = useState(initialView);
  const [loginValues, setLoginValues] = useState({
    email: "",
    password: "",
    rememberMe: true,
  });
  const [signupValues, setSignupValues] = useState(EMPTY_SIGNUP_VALUES);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetValues, setResetValues] = useState(EMPTY_RESET_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (initialView !== "reset" || !resetTokenFromUrl) {
      return;
    }

    setResetValues((current) => ({
      ...current,
      token: resetTokenFromUrl,
    }));
    setStatusMessage("Reset token detected from your email link. Enter a new password.");
  }, [initialView, resetTokenFromUrl]);

  const content = VIEW_COPY[view];

  const updateLoginField = (field) => (event) => {
    const value =
      field === "rememberMe" ? event.target.checked : event.target.value;

    setLoginValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateResetField = (field) => (event) => {
    setResetValues((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateSignupField = (field) => (event) => {
    setSignupValues((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const switchView = (nextView, options = {}) => {
    const { preserveStatus = false, nextStatusMessage = "" } = options;

    setErrorMessage("");

    if (nextView === "login" && !preserveStatus) {
      setStatusMessage("");
    } else if (preserveStatus) {
      setStatusMessage(nextStatusMessage);
    }

    const nextPath =
      nextView === "signup"
        ? "/signup"
        : nextView === "forgot"
          ? "/forgot-password"
          : nextView === "reset"
            ? "/reset-password"
            : "/";

    onNavigate?.(nextPath);
    setView(nextView);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      if (view === "login") {
        const response = await loginUser({
          email: loginValues.email.trim(),
          password: loginValues.password,
        });
        const profile = buildProfileFromAuth(response, loginValues.email);

        onSignIn?.({
          token: response.token,
          rememberMe: loginValues.rememberMe,
          profile,
        });
        return;
      }

      if (view === "signup") {
        const response = await signupUser({
          username: signupValues.username.trim(),
          email: signupValues.email.trim(),
          password: signupValues.password,
        });

        rememberKnownUser(signupValues.email, {
          username: signupValues.username.trim(),
          email: signupValues.email.trim(),
          firstLetter: signupValues.username.trim().charAt(0).toUpperCase() || "U",
          profileImage: "",
        });

        setStatusMessage(response.message || "Signup successful. Please sign in.");
        setLoginValues((current) => ({
          ...current,
          email: signupValues.email.trim(),
          password: "",
        }));
        setSignupValues(EMPTY_SIGNUP_VALUES);
        setView("login");
        return;
      }

      if (view === "forgot") {
        const response = await forgotPassword({
          email: forgotEmail.trim(),
        });

        setStatusMessage(response.message || "Reset request submitted.");

        if (response.token) {
          setResetValues((current) => ({
            ...current,
            token: response.token,
          }));
          setView("reset");
          setStatusMessage(
            "Reset token received for testing. It has been filled into the next form.",
          );
        }

        return;
      }

      if (!hasResetToken) {
        setErrorMessage("Reset link is missing or invalid. Please open the reset link from your email again.");
        return;
      }

      const response = await resetPassword({
        token: resetTokenFromUrl,
        newPassword: resetValues.newPassword,
      });

      setLoginValues((current) => ({
        ...current,
        email: forgotEmail.trim() || current.email,
        password: "",
      }));
      setResetValues(EMPTY_RESET_VALUES);
      switchView("login", {
        preserveStatus: true,
        nextStatusMessage:
          response.message || "Password reset successful. Please sign in with your new password.",
      });
    } catch (error) {
      setErrorMessage(error?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef4fb] px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_#f8fbff_0%,_#eef4fb_48%,_#dbe7f4_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,_#5973DC_0%,_rgba(89,115,220,0.75)_28%,_rgba(89,115,220,0.32)_55%,_rgba(89,115,220,0.08)_78%,_rgba(89,115,220,0)_100%)] opacity-75 mix-blend-overlay" />

      <Card className="relative -translate-y-[28px] w-full max-w-[32.125rem] rounded-[1rem] sm:rounded-[1.25rem] border-0 bg-[rgba(255,255,255,0.85)] shadow-[0_0.25rem_0.25rem_rgba(0,0,0,0.25)] backdrop-blur-[0.4063rem]">
        <CardContent className="p-5 sm:p-[3.125rem]">
          <div className="flex flex-col items-start justify-center gap-6 sm:gap-8">
            <div className="flex w-full flex-col items-start gap-4 sm:gap-6 self-stretch">
              <BrandMark />

              <div className="flex w-full flex-col items-start gap-1 sm:gap-2 self-stretch">
                <h1 className="w-full self-stretch font-['Poppins'] text-[1.125rem] sm:text-[1.25rem] font-semibold leading-[1.5rem] sm:leading-[1.875rem] tracking-normal text-[#101828]">
                  {content.title}
                </h1>
                <p className="w-full self-stretch font-['Poppins'] text-[0.8125rem] sm:text-[0.875rem] font-normal leading-[1.125rem] sm:leading-[1.25rem] text-[#475467]">
                  {content.description}
                </p>
              </div>
            </div>

            {statusMessage ? (
              <div className="w-full rounded-[0.875rem] border border-[#b2ddff] bg-[#eff8ff] px-4 py-3 text-[0.8125rem] sm:text-[0.875rem] font-medium text-[#175cd3]">
                {statusMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="w-full rounded-[0.875rem] border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-[0.8125rem] sm:text-[0.875rem] font-medium text-[#b42318]">
                {errorMessage}
              </div>
            ) : null}

            <form
              className="flex w-full flex-col gap-4 sm:gap-6 self-stretch"
              onSubmit={handleSubmit}
            >
              <div className="flex w-full flex-col gap-3 sm:gap-4 self-stretch">
                {view === "signup" ? (
                  <>
                    <div className="flex w-full flex-col items-start gap-[0.25rem] sm:gap-[0.375rem] self-stretch">
                      <label
                        htmlFor="signup-username"
                        className="font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-normal leading-[1rem] sm:leading-[1.25rem] text-[#344054]"
                      >
                        Username
                      </label>
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="Enter your username"
                        value={signupValues.username}
                        onChange={updateSignupField("username")}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="flex w-full flex-col items-start gap-[0.25rem] sm:gap-[0.375rem] self-stretch">
                      <label
                        htmlFor="signup-email"
                        className="font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-normal leading-[1rem] sm:leading-[1.25rem] text-[#344054]"
                      >
                        Email
                      </label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signupValues.email}
                        onChange={updateSignupField("email")}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="flex w-full flex-col items-start gap-[0.25rem] sm:gap-[0.375rem] self-stretch">
                      <label
                        htmlFor="signup-password"
                        className="font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-normal leading-[1rem] sm:leading-[1.25rem] text-[#344054]"
                      >
                        Password
                      </label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupValues.password}
                        onChange={updateSignupField("password")}
                        disabled={isSubmitting}
                      />
                    </div>
                  </>
                ) : null}

                {(view === "login" || view === "forgot") && (
                  <div className="flex w-full flex-col items-start gap-[0.25rem] sm:gap-[0.375rem] self-stretch">
                    <label
                      htmlFor="email"
                      className="font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-normal leading-[1rem] sm:leading-[1.25rem] text-[#344054]"
                    >
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={view === "login" ? loginValues.email : forgotEmail}
                      onChange={
                        view === "login"
                          ? updateLoginField("email")
                          : (event) => setForgotEmail(event.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {view === "login" ? (
                  <div className="flex w-full flex-col items-start gap-[0.25rem] sm:gap-[0.375rem] self-stretch">
                    <label
                      htmlFor="password"
                      className="font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-normal leading-[1rem] sm:leading-[1.25rem] text-[#344054]"
                    >
                      Password
                    </label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={loginValues.password}
                        onChange={updateLoginField("password")}
                        disabled={isSubmitting}
                    />
                  </div>
                ) : null}

                {view === "reset" ? (
                  <>
                    {hasResetToken ? (
                      <div className="w-full rounded-[0.875rem] border border-[#d5def5] bg-[#f8faff] px-4 py-3 text-[0.8125rem] sm:text-[0.875rem] font-medium text-[#475467]">
                        Reset link verified. You can enter your new password below.
                      </div>
                    ) : (
                      <div className="w-full rounded-[0.875rem] border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-[0.8125rem] sm:text-[0.875rem] font-medium text-[#b42318]">
                        This page needs a valid reset link from your email. Please open the email link again.
                      </div>
                    )}

                    <div className="flex w-full flex-col items-start gap-[0.25rem] sm:gap-[0.375rem] self-stretch">
                      <label
                        htmlFor="new-password"
                        className="font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-normal leading-[1rem] sm:leading-[1.25rem] text-[#344054]"
                      >
                        New Password
                      </label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={resetValues.newPassword}
                        onChange={updateResetField("newPassword")}
                        disabled={isSubmitting}
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div className="flex w-full flex-col items-start gap-4 sm:gap-6 self-stretch">
                {view === "login" ? (
                  <div className="flex w-full items-center justify-between gap-2 sm:gap-4 flex-col xs:flex-row">
                    <label className="flex items-center gap-2 font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-medium leading-[1rem] sm:leading-[1.375rem] text-[#344054]">
                      <input
                        type="checkbox"
                        checked={loginValues.rememberMe}
                        onChange={updateLoginField("rememberMe")}
                        className="h-4 w-4 rounded-[0.25rem] border border-[#D5DBE6] text-[#193D9E] accent-[#193D9E]"
                      />
                      <span className="truncate">Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginValues.email);
                        switchView("forgot");
                      }}
                      className="font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-medium leading-[1rem] sm:leading-[1.375rem] text-[#2970FF] transition-colors hover:text-[#175CD3] truncate"
                    >
                      Forgot password?
                    </button>
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-between gap-2 text-[0.75rem] sm:text-[0.875rem] font-medium">
                    <button
                      type="button"
                      onClick={() => switchView("login")}
                      className="font-['Poppins'] text-[#475467] transition-colors hover:text-[#101828]"
                    >
                      Back to sign in
                    </button>

                    {view !== "forgot" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(loginValues.email || forgotEmail);
                          switchView("forgot");
                        }}
                        className="font-['Poppins'] text-[#2970FF] transition-colors hover:text-[#175CD3]"
                      >
                        Need a token?
                      </button>
                    ) : null}
                  </div>
                )}

                {view === "login" ? (
                  <button
                    type="button"
                    onClick={() => switchView("signup")}
                    className="w-full text-center font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-medium text-[#2970FF] transition-colors hover:text-[#175CD3]"
                  >
                    Don&apos;t have an account? Sign up
                  </button>
                ) : null}

                {view === "signup" ? (
                  <button
                    type="button"
                    onClick={() => switchView("login")}
                    className="w-full text-center font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-medium text-[#2970FF] transition-colors hover:text-[#175CD3]"
                  >
                    Already have an account? Sign in
                  </button>
                ) : null}

                <Button
                  type="submit"
                  disabled={isSubmitting || (view === "reset" && !hasResetToken)}
                  className="h-[2.75rem] sm:h-[3.125rem] w-full items-center justify-center gap-[0.375rem] rounded-[6.25rem] border border-[#2970FF] bg-[#2970FF] px-4 py-[0.5rem] sm:py-[0.625rem] font-['Poppins'] text-[0.9375rem] sm:text-[1rem] font-medium leading-5 sm:leading-6 text-white shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] hover:bg-[#175CD3] hover:border-[#175CD3]"
                >
                  {isSubmitting
                    ? view === "login"
                      ? "Signing in..."
                      : view === "signup"
                        ? "Signing up..."
                      : view === "forgot"
                        ? "Sending..."
                        : "Resetting..."
                    : content.submitLabel}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default Login;
