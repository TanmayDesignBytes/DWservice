import { useEffect, useRef, useState } from "react";
import AddDeviceModal from "@/components/dashboard/AddDeviceModal";
import DeviceTerminalModal from "@/components/dashboard/DeviceTerminalModal";
import {
  deleteDevice,
  rebootAgent,
  rebootOperatingSystem,
  toggleDevice,
  updateDeviceDetails,
} from "@/lib/api";
import DeleteModal from "./DeleteModal";

function DeviceGlyph({ statusColor, isInstallCard = false }) {
  return (
    <div className="relative flex h-[33px] w-[33px] items-center justify-center rounded-[7px] bg-[#f4f7fe]">
      <span
        className={
          isInstallCard
            ? "absolute left-0 top-[4px] h-[24px] w-[5px] rounded-[2.5px]"
            : "absolute left-0 top-1/2 h-[27.364px] w-[4.5px] -translate-y-1/2 rounded-[4px]"
        }
        style={{ backgroundColor: statusColor }}
      />
      <img
        src="/respberry.png"
        alt=""
        className={`aspect-[7/9] h-[18px] w-[14px] shrink-0 object-contain ${statusColor === "#d1d5db" ? "grayscale opacity-60" : ""}`}
        aria-hidden="true"
      />
    </div>
  );
}

function MarkerPinIcon() {
  return (
    <img
      src="/marker-pin-01.svg"
      alt=""
      className="h-[18px] w-[18px] shrink-0 object-contain"
      aria-hidden="true"
    />
  );
}

function ClockIcon() {
  return (
    <img
      src="/Time_duotone.svg"
      alt=""
      className="h-6 w-6 shrink-0 object-contain"
      aria-hidden="true"
    />
  );
}

function getStatusLabel(status, isDisabled) {
  if (isDisabled || status === "disabled") {
    return "Disabled";
  }

  if (status === "online") {
    return "Available";
  }

  if (status === "offline") {
    return "Unavailable";
  }

  return "To Install";
}

function CodeFooter({ code, status, isDisabled }) {
  return (
    <div className="flex h-[58px] items-start gap-[10px] self-stretch rounded-[8px] border border-[#e5e7eb] bg-gradient-to-r from-[#f0f4f8] to-[#f9fafb] pb-[13px] pl-[15px] pr-[14px] pt-[12px]">
      <div className="flex h-[32px] min-w-0 w-[150px] items-center">
        <span
          className={`min-w-0 truncate text-[14px] font-medium ${
            isDisabled ? "text-[#9ca3af]" : "text-[#1f2937]"
          }`}
        >
          {code}
        </span>
      </div>

      <div className="h-[28px] w-px shrink-0 bg-[#d1d5db]" />

      <div className="flex h-[32px] w-[117px] shrink-0 items-center">
        <span
          className={`truncate text-[14px] font-medium ${
            isDisabled ? "text-[#9ca3af]" : "text-[#1f2937]"
          }`}
        >
          {getStatusLabel(status, isDisabled)}
        </span>
      </div>
    </div>
  );
}

function resolveDisabledState(response, fallbackValue) {
  const candidates = [
    response?.is_disabled,
    response?.data?.is_disabled,
    response?.isDisable,
    response?.data?.isDisable,
    response?.disabled,
    response?.data?.disabled,
    response?.is_disabled === false ? false : undefined,
    response?.data?.is_disabled === false ? false : undefined,
  ];

  for (const value of candidates) {
    if (typeof value === "boolean") {
      return value;
    }
  }

  const onlineCandidates = [
    response?.is_online,
    response?.data?.is_online,
    response?.device?.is_online,
    response?.data?.device?.is_online,
  ];

  for (const value of onlineCandidates) {
    if (typeof value === "boolean") {
      return !value;
    }
  }

  return fallbackValue;
}

function RebootCommandModal({
  open,
  title,
  message,
  errorMessage,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && open && !isSubmitting) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={() => {
          if (!isSubmitting) {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-[480px] rounded-[18px] bg-white px-8 py-9 shadow-[0_24px_64px_rgba(15,23,42,0.18)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reboot-command-title"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2
              id="reboot-command-title"
              className="font-['Inter'] text-[22px] font-semibold leading-[1.2] text-[#1f2937]"
            >
              {title}
            </h2>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="mt-0.5 text-[24px] leading-none text-[#94a3b8] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close reboot dialog"
            >
              ×
            </button>
          </div>

          <p className="mb-7 font-['Inter'] text-[16px] font-medium leading-7 text-[#667085]">
            {message}
          </p>

          {errorMessage ? (
            <div className="mb-6 rounded-[10px] border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-[13px] font-medium text-[#b42318]">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-[12px] border border-[#d0d5dd] bg-[#f9fafb] px-6 py-3 font-['Inter'] text-[14px] font-semibold text-[#667085] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="min-w-[96px] rounded-[12px] bg-[#2855cb] px-6 py-3 font-['Inter'] text-[14px] font-semibold text-white transition-colors hover:bg-[#234ab2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "..." : "Yes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ContextMenu({
  isInstallCard,
  isDisabled,
  onClose,
  onEdit,
  onDisable,
  onDelete,
  onRebootOs,
  onRebootAgent,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const items = isInstallCard
    ? [
        { icon: "/edit-03.svg", label: "Edit", action: "edit" },
        { icon: "/trash-01.svg", label: "Delete", action: "delete" },
      ]
    : [
        { icon: "/edit-03.svg", label: "Edit", action: "edit" },
        {
          icon: "/eye-off.svg",
          label: isDisabled ? "Enable" : "Disable",
          action: "disable",
        },
        { icon: "/trash-01.svg", label: "Delete", action: "delete" },
        { icon: "/Black.svg", label: "Reboot OS", action: "reboot-os" },
        {
          icon: "/victor.svg",
          label: "Reboot Agent",
          action: "reboot-agent",
          iconClassName: "h-[18px] w-[18px]",
          iconWrapperClassName: "h-[18px] w-[18px]",
        },
      ];

  return (
    <div
      ref={menuRef}
      onClick={(event) => event.stopPropagation()}
      className="absolute left-1/2 top-full z-50 mt-2 w-[184px] -translate-x-1/2 rounded-[8px] border border-[rgba(234,236,240,0.5)] bg-white py-1 shadow-[0_4px_4px_rgba(0,0,0,0.25),0_12px_20px_rgba(7,6,18,0.25)]"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (item.action === "edit") {
              onEdit();
            } else if (item.action === "disable") {
              onDisable();
            } else if (item.action === "delete") {
              onDelete();
            } else if (item.action === "reboot-os") {
              onRebootOs();
            } else if (item.action === "reboot-agent") {
              onRebootAgent();
            }
            onClose();
          }}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] font-medium leading-5 text-[#101728] transition-colors hover:bg-[#f8f9fc]"
        >
          <span
            className={`flex shrink-0 items-center justify-center ${
              item.iconWrapperClassName || "h-4 w-[14.17px]"
            }`}
          >
            <img
              src={item.icon}
              alt=""
              className={`${item.iconClassName || "h-4 w-[14.17px]"} object-contain`}
              aria-hidden="true"
            />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function DeviceCard({
  id,
  deviceIdentifier,
  name,
  group,
  description,
  location,
  date,
  status,
  generatedCode,
  isPendingOnly,
  onDelete,
  onDisable,
  onUpdate,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(status === "disabled");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingDisable, setIsTogglingDisable] = useState(false);
  const [rebootOsModalOpen, setRebootOsModalOpen] = useState(false);
  const [isRebootingOs, setIsRebootingOs] = useState(false);
  const [rebootOsError, setRebootOsError] = useState("");
  const [rebootAgentModalOpen, setRebootAgentModalOpen] = useState(false);
  const [isRebootingAgent, setIsRebootingAgent] = useState(false);
  const [rebootAgentError, setRebootAgentError] = useState("");
  const [deviceData, setDeviceData] = useState({
    name,
    group,
    description,
    generatedCode,
  });

  useEffect(() => {
    setDeviceData({
      name,
      group,
      description,
      generatedCode,
    });
    setIsDisabled(status === "disabled");
    setEditError("");
  }, [description, generatedCode, group, name, status]);

  const hasGeneratedCode = Boolean(deviceData.generatedCode);
  const isInstallCard = status === "to-install" || hasGeneratedCode;

  const statusColor = isDisabled
    ? "#d1d5db"
    : status === "online"
      ? "#60FAC4"
      : status === "to-install"
        ? "#D6DAE5"
        : "#FF7373";

  const handleDelete = () => {
    if (isPendingOnly) {
      onDelete?.(id);
      setDeleteModalOpen(false);
      return;
    }

    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    deleteDevice(id)
      .then(() => {
        onDelete?.(id);
        setDeleteModalOpen(false);
      })
      .catch(() => {
        setDeleteModalOpen(false);
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  const handleToggleDisable = async () => {
    if (isTogglingDisable) {
      return;
    }

    setIsTogglingDisable(true);

    try {
      const response = await toggleDevice(id, {
        action: isDisabled ? "enable" : "disable",
      });
      const resolvedIsDisabled = resolveDisabledState(response, !isDisabled);

      setIsDisabled(resolvedIsDisabled);
      onDisable?.(id, resolvedIsDisabled);
    } finally {
      setIsTogglingDisable(false);
    }
  };

  const handleRebootAgent = async () => {
    if (!deviceIdentifier || isRebootingAgent) {
      setRebootAgentError("Device agent id is missing.");
      return;
    }

    setIsRebootingAgent(true);
    setRebootAgentError("");

    try {
      await rebootAgent(deviceIdentifier);
      setRebootAgentModalOpen(false);
    } catch (error) {
      setRebootAgentError(error?.message || "Failed to reboot agent");
    } finally {
      setIsRebootingAgent(false);
    }
  };

  const handleRebootOs = async () => {
    if (!deviceIdentifier || isRebootingOs) {
      setRebootOsError("Device agent id is missing.");
      return;
    }

    setIsRebootingOs(true);
    setRebootOsError("");

    try {
      await rebootOperatingSystem(deviceIdentifier);
      setRebootOsModalOpen(false);
    } catch (error) {
      setRebootOsError(error?.message || "Failed to reboot operating system");
    } finally {
      setIsRebootingOs(false);
    }
  };

  const terminalDevice = {
    id,
    deviceIdentifier,
    name: deviceData.name,
    group: deviceData.group,
    location,
    date,
    status: isDisabled ? "disabled" : status,
  };

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setTerminalOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setTerminalOpen(true);
          }
        }}
        className={`flex h-[223px] w-full cursor-pointer items-center justify-center rounded-[15px] border p-[28px_20px_12px_17px] transition-all duration-300 ease-out ${
          isDisabled
            ? "border-[#d1d5db] bg-black/10"
            : "border-[#e5e7eb] bg-white hover:shadow-[0_20px_40px_rgba(0,0,0,0.15),0_8px_16px_rgba(0,0,0,0.10)]"
        }`}
      >
        <div className="flex h-[183px] w-[278px] flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 items-start gap-[12px]">
              <DeviceGlyph statusColor={statusColor} isInstallCard={isInstallCard} />

              <div className="min-w-0">
                <div className="flex h-[39.884px] flex-col justify-center self-stretch">
                  <h3
                    className={`truncate font-['DM_Sans'] text-[22px] font-bold leading-[42px] tracking-[-0.44px] ${
                      isDisabled ? "text-[#9ca3af]" : "text-[#1f2937]"
                    }`}
                  >
                    {deviceData.name}
                  </h3>
                </div>
                <p
                  className={`h-[21.936px] text-[14px] font-medium leading-6 tracking-[-0.28px] ${
                    isDisabled ? "text-[#6b7280]" : "text-[#6b7280]"
                  }`}
                >
                  {deviceData.group}
                </p>
                <p
                  className={`h-[21.936px] truncate text-[14px] font-medium leading-6 tracking-[-0.28px] ${
                    isDisabled ? "text-[#9ca3af]" : "text-[#9ca3af]"
                  }`}
                >
                  {deviceData.description}
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((value) => !value);
                }}
                className="flex h-[27.364px] w-[26.984px] items-center justify-center transition-opacity hover:opacity-70"
                aria-label="Device actions"
              >
                <span
                  className="flex h-[17.989px] w-[4.5px] flex-col items-center justify-between"
                  aria-hidden="true"
                >
                  <span className="h-[4.5px] w-[4.5px] rounded-full bg-[#3a3a3e] transition-colors" />
                  <span className="h-[4.5px] w-[4.5px] rounded-full bg-[#3a3a3e] transition-colors" />
                  <span className="h-[4.5px] w-[4.5px] rounded-full bg-[#3a3a3e] transition-colors" />
                </span>
              </button>
              {menuOpen ? (
                <ContextMenu
                  isInstallCard={isInstallCard}
                  isDisabled={isDisabled}
                  onClose={() => setMenuOpen(false)}
                  onEdit={() => setEditModalOpen(true)}
                  onDisable={handleToggleDisable}
                  onDelete={() => setDeleteModalOpen(true)}
                  onRebootOs={() => {
                    setRebootOsError("");
                    setRebootOsModalOpen(true);
                  }}
                  onRebootAgent={() => {
                    setRebootAgentError("");
                    setRebootAgentModalOpen(true);
                  }}
                />
              ) : null}
            </div>
          </div>

          {hasGeneratedCode ? (
            <CodeFooter
              code={deviceData.generatedCode}
              status={status}
              isDisabled={isDisabled}
            />
          ) : (
            <div
              className={`flex h-[58px] items-start gap-[10px] self-stretch rounded-[8px] border pb-[13px] pl-[15px] pr-[14px] pt-[12px] ${
                isDisabled
                  ? "border-[#d1d5db] bg-black/10"
                  : "border-[#e5e7eb] bg-gradient-to-r from-[#f0f4f8] to-[#f9fafb]"
              }`}
            >
              <div className="flex h-[32px] min-w-0 w-[150px] items-center gap-[10px]">
                <MarkerPinIcon />
                <span
                  className={`min-w-0 truncate text-[14px] font-medium ${
                    isDisabled ? "text-[#9ca3af]" : "text-[#1f2937]"
                  }`}
                >
                  {location}
                </span>
              </div>

              <div className={`h-[28px] w-px shrink-0 ${isDisabled ? "bg-[#d1d5db]" : "bg-[#d1d5db]"}`} />

              <div className="flex h-[32px] w-[117px] shrink-0 items-center gap-[10px]">
                <ClockIcon />
                <span
                  className={`truncate text-[14px] font-medium ${
                    isDisabled ? "text-[#9ca3af]" : "text-[#1f2937]"
                  }`}
                >
                  {date}
                </span>
              </div>
            </div>
          )}
        </div>
      </article>

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />

      <RebootCommandModal
        open={rebootOsModalOpen}
        title="Agent"
        message={`Reboot the operating system of agent '${deviceData.group} - ${deviceData.name}'?`}
        errorMessage={rebootOsError}
        isSubmitting={isRebootingOs}
        onClose={() => {
          if (isRebootingOs) {
            return;
          }

          setRebootOsError("");
          setRebootOsModalOpen(false);
        }}
        onConfirm={handleRebootOs}
      />

      <RebootCommandModal
        open={rebootAgentModalOpen}
        title="Agent"
        message={`Reboot agent '${deviceData.group} - ${deviceData.name}'?`}
        errorMessage={rebootAgentError}
        isSubmitting={isRebootingAgent}
        onClose={() => {
          if (isRebootingAgent) {
            return;
          }

          setRebootAgentError("");
          setRebootAgentModalOpen(false);
        }}
        onConfirm={handleRebootAgent}
      />

      <AddDeviceModal
        open={editModalOpen}
        onClose={() => {
          if (isSavingEdit) {
            return;
          }

          setEditError("");
          setEditModalOpen(false);
        }}
        onConfirm={async (values) => {
          if (isSavingEdit) {
            return;
          }

          if (isPendingOnly) {
            const nextDeviceData = {
              name: values.name,
              group: values.group,
              description: values.description,
            };

            setDeviceData((current) => ({
              ...current,
              ...nextDeviceData,
            }));
            onUpdate?.(id, nextDeviceData);
            setEditError("");
            setEditModalOpen(false);
            return;
          }

          setIsSavingEdit(true);
          setEditError("");

          const payload = {
            name: values.name,
            group: values.group,
            description: values.description,
          };

          try {
            const response = await updateDeviceDetails(id, payload);
            const savedDevice = response?.device ?? response?.data?.device ?? null;
            const nextDeviceData = {
              name:
                savedDevice?.name != null ? savedDevice.name : payload.name,
              group:
                savedDevice?.group != null ? savedDevice.group : payload.group,
              description:
                savedDevice?.description != null
                  ? savedDevice.description
                  : payload.description,
            };

            setDeviceData((current) => ({
              ...current,
              ...nextDeviceData,
            }));
            onUpdate?.(id, nextDeviceData);
            setEditModalOpen(false);
          } catch (error) {
            setEditError(error?.message || "Failed to update device");
          } finally {
            setIsSavingEdit(false);
          }
        }}
        initialValues={deviceData}
        title="Edit Device Details"
        confirmLabel="Save"
        isSubmitting={isSavingEdit}
        errorMessage={editError}
      />

      <DeviceTerminalModal
        open={terminalOpen}
        device={terminalDevice}
        onClose={() => setTerminalOpen(false)}
      />
    </>
  );
}
