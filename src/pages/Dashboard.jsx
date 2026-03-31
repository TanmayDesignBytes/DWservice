import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DeviceCard from "@/components/DeviceCard";
import AddDeviceModal from "@/components/dashboard/AddDeviceModal";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  generateDeviceCode,
  getMyDevices,
  searchDevices,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { filterTabs } from "@/data/dashboard";

const defaultGroupOptions = [
  { id: "GCU", label: "GCU" },
  { id: "Microgrid", label: "Microgrid" },
  { id: "Koel", label: "Koel" },
];

function formatDeviceDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(date);
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function mapDeviceStatus(device) {
  if (device.status) {
    return device.status;
  }

  if (
    device.code &&
    !device.last_connected &&
    !device.connected_at &&
    !device.registered_at
  ) {
    return "to-install";
  }

  if (typeof device.is_disabled === "boolean") {
    return device.is_disabled ? "disabled" : device.is_online ? "online" : "offline";
  }

  if (typeof device.is_disable === "boolean") {
    return device.is_disable ? "disabled" : device.is_online ? "online" : "offline";
  }

  if (typeof device.isDisable === "boolean") {
    return device.isDisable ? "disabled" : device.is_online ? "online" : "offline";
  }

  if (typeof device.disabled === "boolean") {
    return device.disabled ? "disabled" : device.is_online ? "online" : "offline";
  }

  if (typeof device.is_online === "boolean") {
    return device.is_online ? "online" : "offline";
  }

  return "offline";
}

function mapApiDevice(device) {
  return {
    id: device.id ?? device.deviceDbId ?? device.device_id ?? Date.now(),
    deviceIdentifier: device.device_id || device.deviceId || "",
    name: device.name || device.deviceName || device.hostname || "Unnamed Device",
    group: device.group || device.os || "Device",
    description: device.description != null ? device.description : "",
    location: device.hostname || device.ip_address || "",
    date: formatDeviceDate(device.last_connected || device.created_at),
    status: mapDeviceStatus(device),
    generatedCode: device.code || "",
    isPendingOnly: Boolean(device.isPendingOnly),
  };
}

function getDeviceItems(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.all)) {
    return response.all;
  }

  if (Array.isArray(response?.data?.all)) {
    return response.data.all;
  }

  if (Array.isArray(response?.devices)) {
    return response.devices;
  }

  if (Array.isArray(response?.data?.devices)) {
    return response.data.devices;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

export default function Dashboard({
  pathname,
  onNavigate,
  onSignOut,
}) {
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deviceList, setDeviceList] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [devicesError, setDevicesError] = useState("");
  const [isSubmittingDevice, setIsSubmittingDevice] = useState(false);
  const [addDeviceError, setAddDeviceError] = useState("");

  const groupMenuRef = useRef(null);
  const tabRefs = useRef({});

  const [activeTabStyle, setActiveTabStyle] = useState({
    width: 0,
    left: 0,
    visible: false,
  });

  useEffect(() => {
    const handleClick = (event) => {
      if (
        groupMenuRef.current &&
        !groupMenuRef.current.contains(event.target)
      ) {
        setGroupMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleGroupSelect = useCallback((groupId) => {
    setSelectedGroup(groupId);
    setGroupMenuOpen(false);
  }, []);

  const handleClearFilter = useCallback(() => {
    setSelectedGroup(null);
    setGroupMenuOpen(false);
  }, []);

  const updateActiveTabStyle = useCallback(() => {
    const activeTab = tabRefs.current[selectedTab];
    if (!activeTab) return;

    setActiveTabStyle({
      width: activeTab.offsetWidth,
      left: activeTab.offsetLeft,
      visible: true,
    });
  }, [selectedTab]);

  useEffect(() => {
    updateActiveTabStyle();
  }, [updateActiveTabStyle]);

  useEffect(() => {
    window.addEventListener("resize", updateActiveTabStyle);
    return () => window.removeEventListener("resize", updateActiveTabStyle);
  }, [updateActiveTabStyle]);

  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    setDevicesError("");

    try {
      const response = await getMyDevices();
      const items = getDeviceItems(response);
      const apiDevices = items.map(mapApiDevice);
      setDeviceList(apiDevices);
    } catch (error) {
      setDeviceList([]);
      setDevicesError(error?.message || "Failed to load devices");
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();

    if (!normalizedQuery) {
      setSearchResults(null);
      return undefined;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await searchDevices(normalizedQuery);
        const items = getDeviceItems(response);
        const apiDevices = items.map(mapApiDevice);

        if (!isCancelled) {
          setSearchResults(apiDevices);
        }
      } catch {
        if (!isCancelled) {
          setSearchResults(null);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const groupOptions = useMemo(() => {
    const sourceDevices = searchResults ?? deviceList;
    const optionMap = new Map(
      defaultGroupOptions.map((option) => [option.id, option.label]),
    );

    for (const device of sourceDevices) {
      if (device.group) {
        optionMap.set(device.group, device.group);
      }
    }

    return Array.from(optionMap, ([id, label]) => ({ id, label }));
  }, [deviceList, searchResults]);

  const filteredDevices = useMemo(() => {
    const sourceDevices = searchResults ?? deviceList;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const compactQuery = normalizeSearchText(searchQuery);

    return sourceDevices.filter((device) => {
      if (selectedGroup && device.group !== selectedGroup) {
        return false;
      }

      if (selectedTab === "available") {
        return device.status === "online";
      }

      if (selectedTab === "unavailable") {
        return device.status === "offline" || device.status === "to-install";
      }

      if (selectedTab === "to-install") {
        if (device.status !== "to-install") {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableValue = [
        device.name,
        device.group,
        device.description,
        device.location,
        device.date,
        device.generatedCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (searchableValue.includes(normalizedQuery)) {
        return true;
      }

      if (!compactQuery) {
        return false;
      }

      const compactSearchableValue = normalizeSearchText([
        device.name,
        device.group,
        device.description,
        device.location,
        device.date,
        device.generatedCode,
      ].join(" "));

      return compactSearchableValue.includes(compactQuery);
    });
  }, [deviceList, searchQuery, searchResults, selectedGroup, selectedTab]);

  const emptyStateMessage = useMemo(() => {
    if (isLoadingDevices) {
      return "Loading devices...";
    }

    if (devicesError && filteredDevices.length === 0) {
      return devicesError;
    }

    if (filteredDevices.length === 0) {
      if (searchQuery.trim()) {
        return "No devices found for this search";
      }
      if (selectedGroup && selectedTab === "available") {
        return `No available devices in ${selectedGroup}`;
      }
      if (selectedGroup && selectedTab === "unavailable") {
        return `No unavailable devices in ${selectedGroup}`;
      }
      if (selectedGroup && selectedTab === "to-install") {
        return `No devices to install in ${selectedGroup}`;
      }
      if (selectedTab === "available") {
        return "No available devices";
      }
      if (selectedTab === "unavailable") {
        return "No unavailable devices";
      }
      if (selectedTab === "to-install") {
        return "No devices to install";
      }
      return "No devices found";
    }

    return null;
  }, [
    devicesError,
    filteredDevices.length,
    isLoadingDevices,
    searchQuery,
    selectedGroup,
    selectedTab,
  ]);

  const handleOpenAddDevice = useCallback(() => {
    setAddDeviceError("");
    setShowAddDevice(true);
  }, []);

  const handleConfirmAddDevice = useCallback(async (values) => {
    if (isSubmittingDevice) {
      return;
    }

    setIsSubmittingDevice(true);
    setAddDeviceError("");

    const payload = {
      deviceName: values.name.trim() || "15- HAL",
      group: values.group,
      description:
        values.description.trim() || "I've updated the user interface",
    };

    try {
      const response = await generateDeviceCode(payload);
      const backendId =
        response?.deviceDbId ??
        response?.id ??
        response?.device?.id ??
        response?.device?.deviceDbId ??
        null;
      const createdDevice = mapApiDevice({
        id: backendId ?? Date.now(),
        deviceDbId: backendId,
        deviceName:
          response?.deviceName ?? response?.device?.name ?? payload.deviceName,
        group: response?.group ?? response?.device?.group ?? payload.group,
        description:
          response?.description ??
          response?.device?.description ??
          payload.description,
        hostname: response?.hostname ?? response?.device?.hostname ?? "",
        code: response?.code ?? response?.device?.code ?? "",
        status: "to-install",
        isPendingOnly: backendId == null,
      });

      setDeviceList((current) => [createdDevice, ...current]);
      setShowAddDevice(false);
      setSelectedGroup(null);
      setSelectedTab("to-install");
      void loadDevices();
    } catch (error) {
      setAddDeviceError(error?.message || "Failed to add device");
    } finally {
      setIsSubmittingDevice(false);
    }
  }, [isSubmittingDevice, loadDevices]);

  const handleDeleteDevice = useCallback((deviceId) => {
    setDeviceList((current) =>
      current.filter((device) => device.id !== deviceId),
    );
  }, []);

  const handleDisableDevice = useCallback((deviceId, isDisabled) => {
    setDeviceList((current) =>
      current.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              status: isDisabled ? "disabled" : "offline",
            }
          : device,
      ),
    );
  }, []);

  const handleUpdateDevice = useCallback((deviceId, nextValues) => {
    setDeviceList((current) =>
      current.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              ...nextValues,
            }
          : device,
      ),
    );
  }, []);

  const toolbar = (
    <div className="flex w-full min-w-0 flex-col items-center gap-2 sm:gap-3 md:gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative mx-auto inline-flex h-[57px] w-full min-w-0 max-w-full sm:max-w-[669px] items-center rounded-[79.177px] border border-[#f0f0f0] bg-white p-[6px] shadow-[0_3.167px_12.668px_rgba(0,0,0,0.05)] lg:mx-0 lg:w-[669px] lg:max-w-[669px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[6px] top-[6px] rounded-[21.774px] bg-[#2970ff] shadow-[0_3.167px_3.167px_rgba(0,0,0,0.15)] transition-all duration-300 ease-out"
          style={{
            width: activeTabStyle.width,
            transform: `translateX(${activeTabStyle.left}px)`,
            opacity: activeTabStyle.visible ? 1 : 0,
          }}
        />
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            ref={(element) => {
              tabRefs.current[tab.id] = element;
            }}
            onClick={() => setSelectedTab(tab.id)}
            className={cn(
              "relative z-[1] flex min-w-0 h-[44px] flex-1 items-center justify-center rounded-[21.774px] px-1 text-[15px] font-semibold leading-[19.002px] transition-colors duration-300 ease-out sm:px-2 sm:text-[16px] md:text-[18px]",
              selectedTab === tab.id && "text-white",
              selectedTab !== tab.id && "text-[rgba(0,0,0,0.75)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex w-full min-w-0 flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3 lg:w-auto lg:shrink-0 lg:justify-end">
        <div ref={groupMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setGroupMenuOpen((value) => !value)}
            className={cn(
              "flex h-[56px] w-full items-center justify-between rounded-[10px] border px-4 text-[14px] font-semibold leading-[19.002px] sm:w-auto sm:min-w-[200px] sm:px-[30px] sm:text-[16px] lg:w-[234px]",
              selectedGroup
                ? "border-[#2970ff] bg-[#f0f4f8] text-[#2970ff]"
                : "border-[#ececec] bg-white text-[rgba(0,0,0,0.75)]",
            )}
          >
            <span className="truncate">
              {selectedGroup
                ? groupOptions.find((opt) => opt.id === selectedGroup)?.label
                : "Group"}
            </span>
            <img
              src="/chevron-down.svg"
              alt=""
              aria-hidden="true"
              className="h-6 w-6 shrink-0 object-contain"
            />
          </button>

          {groupMenuOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-[234px] rounded-[8px] border border-[#ececec] bg-white py-1 shadow-[0_4px_4px_rgba(0,0,0,0.25),0_12px_20px_rgba(7,6,18,0.25)]">
              {selectedGroup ? (
                <>
                  <button
                    type="button"
                    onClick={handleClearFilter}
                    className="flex w-full items-center px-4 py-2 text-left text-[14px] font-medium text-[#ef4444] transition-colors hover:bg-[#f8f9fc]"
                  >
                    × Clear Filter
                  </button>
                  <div className="h-px bg-[#ececec]" />
                </>
              ) : null}
              {groupOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleGroupSelect(option.id)}
                  className={cn(
                    "flex w-full items-center px-4 py-2 text-left text-[14px] font-medium transition-colors",
                    selectedGroup === option.id
                      ? "bg-[#f0f4f8] text-[#2970ff]"
                      : "text-[#101728] hover:bg-[#f8f9fc]",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleOpenAddDevice}
          className="flex h-[56px] w-full items-center justify-center gap-[6px] rounded-[28px] bg-[linear-gradient(118deg,#2970FF_9.79%,#193D9E_97.55%)] px-4 text-[14px] font-semibold leading-[19.002px] text-white sm:w-auto sm:min-w-[140px] sm:justify-start sm:pl-4 sm:pr-[14px] sm:text-[16px] lg:w-[148px]"
        >
          <img
            src="/plus.svg"
            alt=""
            className="h-[21px] w-[21px] shrink-0 object-contain"
            aria-hidden="true"
          />
          <span>Add Device</span>
        </button>
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
        onAccountNavigate={() => onNavigate?.("/dashboard/account")}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div className="shrink-0 pb-4 pt-1 pl-4 pr-4 sm:pb-6 sm:pt-3 sm:pl-6 sm:pr-6 md:pb-7 md:pt-4 md:pl-8 md:pr-8 lg:pt-[6px] lg:pl-[43px] lg:pr-[41px]">
          {emptyStateMessage ? (
            <div className="flex h-[300px] items-center justify-center sm:h-[400px]">
              <div className="px-4 text-center">
                <p className="text-[16px] font-semibold text-[#6b7280] sm:text-[18px]">
                  {emptyStateMessage}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 justify-items-center gap-4 sm:grid-cols-2 md:grid-cols-3 md:justify-items-center xl:[grid-template-columns:repeat(4,minmax(0,315px))] xl:justify-between xl:gap-[15px]">
              {filteredDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  {...device}
                  onDelete={handleDeleteDevice}
                  onDisable={handleDisableDevice}
                  onUpdate={handleUpdateDevice}
                />
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>

      <AddDeviceModal
        open={showAddDevice}
        onClose={() => {
          if (isSubmittingDevice) {
            return;
          }

          setAddDeviceError("");
          setShowAddDevice(false);
        }}
        onConfirm={handleConfirmAddDevice}
        groupOptions={groupOptions.map((option) => option.label)}
        isSubmitting={isSubmittingDevice}
        errorMessage={addDeviceError}
      />
    </>
  );
}
