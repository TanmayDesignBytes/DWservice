import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import DeviceCard from "@/components/DeviceCard";
import AddDeviceModal from "@/components/dashboard/AddDeviceModal";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { cn } from "@/lib/utils";
import { devices, filterTabs } from "@/data/dashboard";

const groupOptions = [
  { id: "GCU", label: "GCU" },
  { id: "Microgrid", label: "Microgrid" },
  { id: "Koel", label: "Koel" },
];

export default function Dashboard({ pathname, onNavigate }) {
  // Tab state - manages which tab is selected
  const [selectedTab, setSelectedTab] = useState("all");
  const [showAddDevice, setShowAddDevice] = useState(false);

  // Filter state - manages selected group filter
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  const groupMenuRef = useRef(null);
  const tabRefs = useRef({});

  const [activeTabStyle, setActiveTabStyle] = useState({
    width: 0,
    left: 0,
    visible: false,
  });

  // Close group menu when clicking outside
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

  // Apply the selected group without forcing a tab change
  const handleGroupSelect = useCallback((groupId) => {
    setSelectedGroup(groupId);
    setGroupMenuOpen(false);
  }, []);

  // Clear the group filter and keep the current tab unchanged
  const handleClearFilter = useCallback(() => {
    setSelectedGroup(null);
    setGroupMenuOpen(false);
  }, []);

  // Animate active tab indicator
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

  // Memoized filtered data - efficiently compute based on both tab and filter
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // Apply group filter first (if selected)
      if (selectedGroup && device.group !== selectedGroup) {
        return false;
      }

      // Then apply status filter based on selected tab
      if (selectedTab === "available") {
        return device.status === "online";
      }

      if (selectedTab === "unavailable") {
        return device.status === "offline";
      }

      // "all" tab shows everything (or everything in selected group)
      return true;
    });
  }, [selectedTab, selectedGroup]);

  // Empty state rendering
  const emptyStateMessage = useMemo(() => {
    if (filteredDevices.length === 0) {
      if (selectedGroup && selectedTab === "available") {
        return `No available devices in ${selectedGroup}`;
      }
      if (selectedGroup && selectedTab === "unavailable") {
        return `No unavailable devices in ${selectedGroup}`;
      }
      if (selectedTab === "available") {
        return "No available devices";
      }
      if (selectedTab === "unavailable") {
        return "No unavailable devices";
      }
    }
    return null;
  }, [filteredDevices.length, selectedTab, selectedGroup]);

  const toolbar = (
    <div className="flex w-full min-w-0 flex-col items-center gap-2 sm:gap-3 md:gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative mx-auto inline-flex h-[57px] w-full min-w-0 max-w-full sm:max-w-[500px] items-center rounded-[79.177px] border border-[#f0f0f0] bg-white p-[6px] shadow-[0_3.167px_12.668px_rgba(0,0,0,0.05)] lg:mx-0 lg:max-w-[500px]">
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
              "relative z-[1] flex min-w-0 flex-1 h-[44px] items-center justify-center rounded-[21.774px] text-[14px] sm:text-[16px] md:text-[18px] font-semibold leading-[19.002px] transition-colors duration-300 ease-out px-1 sm:px-2",
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
              "flex h-[56px] w-full sm:w-auto sm:min-w-[200px] lg:w-[234px] items-center justify-between rounded-[10px] border px-4 sm:px-[30px] text-[14px] sm:text-[16px] font-semibold leading-[19.002px]",
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
              {selectedGroup && (
                <button
                  type="button"
                  onClick={handleClearFilter}
                  className="flex w-full items-center px-4 py-2 text-left text-[14px] font-medium text-[#ef4444] transition-colors hover:bg-[#f8f9fc]"
                >
                  ✕ Clear Filter
                </button>
              )}
              {selectedGroup && <div className="h-px bg-[#ececec]" />}
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
          onClick={() => setShowAddDevice(true)}
          className="flex h-[56px] w-full sm:w-auto sm:min-w-[140px] lg:w-[148px] items-center justify-center sm:justify-start gap-[6px] rounded-[28px] bg-[linear-gradient(118deg,#2970FF_9.79%,#193D9E_97.55%)] px-4 sm:pl-4 sm:pr-[14px] text-[14px] sm:text-[16px] font-semibold leading-[19.002px] text-white"
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
      >
        <div className="shrink-0 pb-4 sm:pb-6 md:pb-7 pl-4 sm:pl-6 md:pl-8 lg:pl-[43px] pr-4 sm:pr-6 md:pr-8 lg:pr-[41px] pt-1 sm:pt-3 md:pt-4 lg:pt-[6px]">
          {emptyStateMessage ? (
            <div className="flex h-[300px] sm:h-[400px] items-center justify-center">
              <div className="text-center px-4">
                <p className="text-[16px] sm:text-[18px] font-semibold text-[#6b7280]">
                  {emptyStateMessage}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-4 lg:gap-x-[15px] lg:gap-y-[15px]">
              {filteredDevices.map((device) => (
                <DeviceCard key={device.id} {...device} />
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>

      <AddDeviceModal
        open={showAddDevice}
        onClose={() => setShowAddDevice(false)}
        onConfirm={() => setShowAddDevice(false)}
      />
    </>
  );
}
