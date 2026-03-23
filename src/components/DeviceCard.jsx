import { useEffect, useRef, useState } from "react";
import AddDeviceModal from "@/components/dashboard/AddDeviceModal";
import DeviceTerminalModal from "@/components/dashboard/DeviceTerminalModal";
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

function InstallInfoIcon() {
  return (
    <img
      src="/Info_alt_duotone.svg"
      alt=""
      className="h-6 w-6 shrink-0 object-contain"
      aria-hidden="true"
    />
  );
}

function DownloadInstallIcon() {
  return (
    <img
      src="/download-04.svg"
      alt=""
      className="h-[14px] w-[14px] shrink-0 object-contain"
      aria-hidden="true"
    />
  );
}

function InstallFooter({ location, date }) {
  return (
    <div className="flex h-[58px] items-start gap-[10px] self-stretch rounded-[8px] border border-[#e5e7eb] bg-gradient-to-r from-[#f0f4f8] to-[#f9fafb] pb-[13px] pl-[15px] pr-[14px] pt-[12px]">
      <div className="flex h-[32px] w-[150px] items-center gap-[10px]">
        <MarkerPinIcon />
        <span className="truncate text-[14px] font-medium text-[#1f2937]">
          {location}
        </span>
      </div>

      <div className="h-[28px] w-px bg-[#d1d5db]" />

      <div className="flex h-[32px] w-[117px] items-center gap-[10px]">
        <ClockIcon />
        <span className="truncate text-[14px] font-medium text-[#1f2937]">
          {date}
        </span>
      </div>
    </div>
  );
}

function ContextMenu({ isInstallCard, onClose, onEdit, onDisable, onDelete }) {
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
        { icon: "/eye-off.svg", label: "Disable", action: "disable" },
        { icon: "/trash-01.svg", label: "Delete", action: "delete" },
        { icon: "/Black.svg", label: "Reboot", action: null },
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
            }
            onClose();
          }}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] font-medium leading-5 text-[#101728] transition-colors hover:bg-[#f8f9fc]"
        >
          <span className="flex h-4 w-[14.17px] shrink-0 items-center justify-center">
            <img
              src={item.icon}
              alt=""
              className="h-4 w-[14.17px] object-contain"
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
  name,
  group,
  description,
  location,
  date,
  status,
  generatedCode,
  onDelete,
  onUpdate,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
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
  }, [description, generatedCode, group, name]);

  const isInstallCard = status === "to-install";

  const statusColor = isDisabled
    ? "#d1d5db"
    : status === "online"
      ? "#60FAC4"
      : status === "to-install"
        ? "#D6DAE5"
        : "#FF7373";

  const handleDelete = () => {
    onDelete?.(id);
    setDeleteModalOpen(false);
  };

  const terminalDevice = {
    id,
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
                  onClose={() => setMenuOpen(false)}
                  onEdit={() => setEditModalOpen(true)}
                  onDisable={() => setIsDisabled(true)}
                  onDelete={() => setDeleteModalOpen(true)}
                />
              ) : null}
            </div>
          </div>

          {isInstallCard ? (
            <InstallFooter
              location={location || "Pune"}
              date={date || "23 Mar 26"}
            />
          ) : (
            <div
              className={`flex h-[58px] items-start gap-[10px] self-stretch rounded-[8px] border pb-[13px] pl-[15px] pr-[14px] pt-[12px] ${
                isDisabled
                  ? "border-[#d1d5db] bg-black/10"
                  : "border-[#e5e7eb] bg-gradient-to-r from-[#f0f4f8] to-[#f9fafb]"
              }`}
            >
              <div className="flex h-[32px] w-[150px] items-center gap-[10px]">
                <MarkerPinIcon />
                <span
                  className={`truncate text-[14px] font-medium ${
                    isDisabled ? "text-[#9ca3af]" : "text-[#1f2937]"
                  }`}
                >
                  {location}
                </span>
              </div>

              <div className={`h-[28px] w-px ${isDisabled ? "bg-[#d1d5db]" : "bg-[#d1d5db]"}`} />

              <div className="flex h-[32px] w-[117px] items-center gap-[10px]">
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

      <AddDeviceModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onConfirm={(values) => {
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
          setEditModalOpen(false);
        }}
        initialValues={deviceData}
        title="Edit Device Details"
        confirmLabel="Save"
      />

      <DeviceTerminalModal
        open={terminalOpen}
        device={terminalDevice}
        onClose={() => setTerminalOpen(false)}
      />
    </>
  );
}


