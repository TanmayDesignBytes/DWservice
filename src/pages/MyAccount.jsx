import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getUserInfo, updateEmail, updateProfile } from "@/lib/api";

const LOCAL_PROFILE_KEY = "dws.auth.profile";
const SESSION_PROFILE_KEY = "dws.auth.session.profile";
const PROFILE_UPDATED_EVENT = "dws:profile-updated";

const DEFAULT_ACCOUNT = {
  email: "",
  username: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const DEFAULT_EMAIL_MODAL = {
  newEmail: "",
  currentPassword: "",
};

function readStoredProfile() {
  const candidates = [
    window.localStorage.getItem(LOCAL_PROFILE_KEY),
    window.sessionStorage.getItem(SESSION_PROFILE_KEY),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      const parsed = JSON.parse(candidate);

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function persistProfile(profile) {
  const payload = JSON.stringify(profile);

  if (window.localStorage.getItem("dws.auth.token")) {
    window.localStorage.setItem(LOCAL_PROFILE_KEY, payload);
  }

  if (window.sessionStorage.getItem("dws.auth.session.token")) {
    window.sessionStorage.setItem(SESSION_PROFILE_KEY, payload);
  }
}

function normalizeProfile(response, fallbackProfile = null) {
  const profile =
    response?.data?.user ||
    response?.data ||
    response?.user ||
    response ||
    {};
  const fallback = fallbackProfile || {};

  const username =
    profile.username ||
    profile.name ||
    profile.fullName ||
    fallback.username ||
    "User";
  const email = profile.email || fallback.email || "";

  return {
    username,
    email,
    firstLetter:
      profile.firstLetter ||
      fallback.firstLetter ||
      username.trim().charAt(0).toUpperCase() ||
      "U",
    profileImage:
      profile.profileImage ||
      profile.avatarUrl ||
      profile.photoUrl ||
      fallback.profileImage ||
      "",
  };
}

function broadcastProfileUpdate(profile) {
  persistProfile(profile);
  window.dispatchEvent(
    new CustomEvent(PROFILE_UPDATED_EVENT, {
      detail: profile,
    }),
  );
}

function AccountField({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
}) {
  return (
    <label className="grid gap-2 md:grid-cols-[190px_minmax(0,1fr)] md:items-center">
      <span className="font-['Inter'] text-[14px] font-medium text-[#475467]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="h-[48px] rounded-[12px] border border-[#d0d5dd] bg-white px-4 font-['Inter'] text-[15px] text-[#101828] outline-none transition-colors placeholder:text-[#98a2b3] focus:border-[#84adff] focus:ring-4 focus:ring-[rgba(41,112,255,0.08)] disabled:bg-[#f8fafc] disabled:text-[#98a2b3]"
      />
    </label>
  );
}

function ChangeEmailModal({
  values,
  isLoading,
  error,
  onChange,
  onConfirm,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,23,42,0.36)] p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[560px] overflow-hidden rounded-[16px] bg-white shadow-[0_25px_50px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between border-b border-[#eaecf0] px-6 py-4">
          <h3 className="font-['Inter'] text-[18px] font-semibold text-[#101828]">
            Change email
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#475467] transition-colors hover:bg-[#f2f4f7]"
            aria-label="Close change email modal"
          >
            <span className="text-[22px] leading-none">&times;</span>
          </button>
        </div>

        <div className="grid gap-4 px-6 py-5">
          <AccountField
            label="New email"
            value={values.newEmail}
            onChange={onChange("newEmail")}
            placeholder="Enter your new email"
          />
          <AccountField
            label="Password"
            type="password"
            value={values.currentPassword}
            onChange={onChange("currentPassword")}
            placeholder="Enter current password"
          />

          {error ? (
            <div className="rounded-[12px] border border-[#fecdca] bg-[#fef3f2] px-4 py-3 font-['Inter'] text-[14px] text-[#b42318]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#eaecf0] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-[12px] border border-[#d0d5dd] bg-white px-5 py-3 font-['Inter'] text-[14px] font-semibold text-[#475467] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-[12px] bg-[linear-gradient(118deg,#2970FF_9.79%,#193D9E_97.55%)] px-5 py-3 font-['Inter'] text-[14px] font-semibold text-white shadow-[0_8px_18px_rgba(41,112,255,0.28)] transition-transform hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Confirming..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyAccount({ pathname, onNavigate, onSignOut }) {
  const storedProfile = useMemo(() => readStoredProfile(), []);
  const [accountDetails, setAccountDetails] = useState(() => ({
    ...DEFAULT_ACCOUNT,
    email: storedProfile?.email || "",
    username: storedProfile?.username || "",
  }));
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [emailModalDetails, setEmailModalDetails] = useState(DEFAULT_EMAIL_MODAL);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAccount = async () => {
      try {
        const response = await getUserInfo();
        const profile = normalizeProfile(response, storedProfile);

        if (!isMounted) {
          return;
        }

        setAccountDetails((current) => ({
          ...current,
          email: profile.email,
          username: profile.username,
        }));
        broadcastProfileUpdate(profile);
      } catch {
        // Keep stored profile fallback only.
      }
    };

    loadAccount();

    return () => {
      isMounted = false;
    };
  }, [storedProfile]);

  const updateField = (field) => (event) => {
    setAccountDetails((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateEmailModalField = (field) => (event) => {
    setEmailModalDetails((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const resetProfileMessages = () => {
    setProfileError("");
    setProfileSuccess("");
  };

  const handleUpdateCredentials = async () => {
    resetProfileMessages();
    setIsUpdatingProfile(true);

    try {
      await updateProfile({
        currentPassword: accountDetails.currentPassword,
        newPassword: accountDetails.newPassword,
        confirmNewPassword: accountDetails.confirmPassword,
        newName: accountDetails.username,
      });

      const updatedProfile = normalizeProfile(
        {
          data: {
            email: accountDetails.email,
            username: accountDetails.username,
          },
        },
        storedProfile,
      );

      broadcastProfileUpdate(updatedProfile);

      setAccountDetails((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setProfileSuccess("Profile updated successfully.");
    } catch (error) {
      setProfileError(error?.message || "Unable to update profile right now.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const openChangeEmailModal = () => {
    setEmailError("");
    setEmailModalDetails(DEFAULT_EMAIL_MODAL);
    setIsChangeEmailOpen(true);
  };

  const closeChangeEmailModal = () => {
    if (isUpdatingEmail) {
      return;
    }

    setIsChangeEmailOpen(false);
    setEmailError("");
    setEmailModalDetails(DEFAULT_EMAIL_MODAL);
  };

  const handleConfirmEmailChange = async () => {
    setEmailError("");
    setIsUpdatingEmail(true);

    try {
      const response = await updateEmail({
        newEmail: emailModalDetails.newEmail,
        currentPassword: emailModalDetails.currentPassword,
      });

      const nextEmail =
        response?.data?.email || emailModalDetails.newEmail || accountDetails.email;

      const updatedProfile = normalizeProfile(
        {
          data: {
            email: nextEmail,
            username: accountDetails.username,
          },
        },
        storedProfile,
      );

      broadcastProfileUpdate(updatedProfile);
      setAccountDetails((current) => ({
        ...current,
        email: nextEmail,
      }));
      setIsChangeEmailOpen(false);
      setEmailModalDetails(DEFAULT_EMAIL_MODAL);
    } catch (error) {
      setEmailError(error?.message || "Unable to update email right now.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const toolbar = (
    <div className="flex w-full items-center justify-between gap-3">
      <div>
        <h1 className="font-['Inter'] text-[22px] font-semibold text-[#101828]">
          My Account
        </h1>
        <p className="mt-1 font-['Inter'] text-[14px] text-[#667085]">
          Manage your profile and credential details in one place.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <DashboardLayout
        toolbar={toolbar}
        pathname={pathname}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
      >
        <div className="px-4 pb-6 pt-1 sm:px-6 md:px-8 lg:px-[43px] lg:pr-[41px]">
          <div className="overflow-hidden rounded-[24px] border border-[#e4e7ec] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-[#eaecf0] bg-[linear-gradient(90deg,#f8fbff_0%,#eef4ff_100%)] px-6 py-5">
              <h2 className="font-['Inter'] text-[20px] font-semibold text-[#101828]">
                Credentials
              </h2>
            </div>

            <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="border-b border-[#eaecf0] bg-[#f8fbff] px-5 py-5 lg:border-b-0 lg:border-r">
                <nav className="space-y-2">
                  <button
                    type="button"
                    className="flex w-full items-center rounded-[12px] bg-[rgba(41,112,255,0.12)] px-4 py-3 text-left font-['Inter'] text-[14px] font-medium text-[#2970ff]"
                  >
                    Account
                  </button>
                </nav>
              </div>

              <div className="px-5 py-6 sm:px-6 sm:py-7">
                <div className="grid gap-4">
                  <AccountField
                    label="Email address"
                    value={accountDetails.email}
                    onChange={updateField("email")}
                    placeholder="Enter your email"
                    disabled
                  />

                  <AccountField
                    label="Name"
                    value={accountDetails.username}
                    onChange={updateField("username")}
                    placeholder="Enter your name"
                  />

                  <AccountField
                    label="Current password"
                    type="password"
                    value={accountDetails.currentPassword}
                    onChange={updateField("currentPassword")}
                    placeholder="Enter current password"
                  />

                  <AccountField
                    label="New password"
                    type="password"
                    value={accountDetails.newPassword}
                    onChange={updateField("newPassword")}
                    placeholder="Enter new password"
                  />

                  <AccountField
                    label="Retype new password"
                    type="password"
                    value={accountDetails.confirmPassword}
                    onChange={updateField("confirmPassword")}
                    placeholder="Confirm new password"
                  />
                </div>

                {profileError ? (
                  <div className="mt-5 rounded-[12px] border border-[#fecdca] bg-[#fef3f2] px-4 py-3 font-['Inter'] text-[14px] text-[#b42318]">
                    {profileError}
                  </div>
                ) : null}

                {profileSuccess ? (
                  <div className="mt-5 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 font-['Inter'] text-[14px] text-[#067647]">
                    {profileSuccess}
                  </div>
                ) : null}

                <div className="mt-8 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={openChangeEmailModal}
                    className="rounded-[12px] border border-[#d0d5dd] bg-white px-5 py-3 font-['Inter'] text-[14px] font-semibold text-[#475467] transition-colors hover:bg-[#f8fafc]"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateCredentials}
                    disabled={isUpdatingProfile}
                    className="rounded-[12px] bg-[linear-gradient(118deg,#2970FF_9.79%,#193D9E_97.55%)] px-5 py-3 font-['Inter'] text-[14px] font-semibold text-white shadow-[0_8px_18px_rgba(41,112,255,0.28)] transition-transform hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingProfile ? "Updating..." : "Update Credentials"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>

      {isChangeEmailOpen ? (
        <ChangeEmailModal
          values={emailModalDetails}
          isLoading={isUpdatingEmail}
          error={emailError}
          onChange={updateEmailModalField}
          onConfirm={handleConfirmEmailChange}
          onClose={closeChangeEmailModal}
        />
      ) : null}
    </>
  );
}
