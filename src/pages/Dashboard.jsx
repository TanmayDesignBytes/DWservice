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
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target)) {
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
    <div className="flex w-full min-w-0 flex-col items-center gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="relative mx-auto inline-flex h-[57px] w-full max-w-[500px] min-w-0 items-center rounded-[79.177px] border border-[#f0f0f0] bg-white p-[6px] shadow-[0_3.167px_12.668px_rgba(0,0,0,0.05)] xl:mx-0">
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
              "relative z-[1] flex h-[44px] items-center justify-center rounded-[21.774px] text-[18px] font-semibold leading-[19.002px] transition-colors duration-300 ease-out",
              tab.id === "all" && "w-[147.193px]",
              tab.id === "available" && "w-[152px]",
              tab.id === "unavailable" && "w-[170px]",
              selectedTab === tab.id && "text-white",
              selectedTab !== tab.id && "text-[rgba(0,0,0,0.75)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-3 xl:w-auto xl:shrink-0 xl:justify-end">
        <div ref={groupMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setGroupMenuOpen((value) => !value)}
            className={cn(
              "flex h-[56px] w-[234px] items-center justify-between rounded-[10px] border px-[30px] text-[16px] font-semibold leading-[19.002px]",
              selectedGroup
                ? "border-[#2970ff] bg-[#f0f4f8] text-[#2970ff]"
                : "border-[#ececec] bg-white text-[rgba(0,0,0,0.75)]"
            )}
          >
            <span>{selectedGroup ? groupOptions.find((opt) => opt.id === selectedGroup)?.label : "Group"}</span>
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
                      : "text-[#101728] hover:bg-[#f8f9fc]"
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
          className="flex h-[56px] w-[148px] items-center justify-start gap-[6px] rounded-[28px] bg-[linear-gradient(118deg,#2970FF_9.79%,#193D9E_97.55%)] pl-4 pr-[14px] text-[16px] font-semibold leading-[19.002px] text-white"
        >
          <img
            src="/plus.svg"
            alt=""
            className="h-[21px] w-[21px] shrink-0 object-contain"
            aria-hidden="true"
          />
          Add Device
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
        <div className="shrink-0 pb-[28px] pl-[43px] pr-[41px] pt-[6px]">
          {emptyStateMessage ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="text-[18px] font-semibold text-[#6b7280]">{emptyStateMessage}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-x-[15px] gap-y-[15px]">
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
