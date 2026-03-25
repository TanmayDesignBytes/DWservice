import { useEffect, useState } from "react";
import AddGroupModal from "@/components/dashboard/AddGroupModal";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import GroupCardGrid from "@/components/GroupCard";
import { devices as initialDevices } from "@/data/dashboard";
import { getMyDevices } from "@/lib/api";

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

function mapApiDevice(device) {
  return {
    id: device.id ?? device.device_id ?? Date.now(),
    name: device.name || device.hostname || "Unnamed Device",
    group: device.os || "Device",
    description: device.device_id || device.hostname || "",
    location: device.hostname || device.ip_address || "",
    date: formatDeviceDate(device.last_connected || device.created_at),
    status: device.is_online ? "online" : "offline",
  };
}

function buildGroupsFromDevices(deviceList) {
  const groupsByName = new Map();

  deviceList.forEach((device, index) => {
    const groupName = String(device.group || "").trim();

    if (!groupName || groupsByName.has(groupName)) {
      return;
    }

    groupsByName.set(groupName, {
      id: `${groupName}-${index}`,
      name: groupName,
      label: `${deviceList.filter((item) => item.group === groupName).length} device${deviceList.filter((item) => item.group === groupName).length === 1 ? "" : "s"}`,
      description: device.description || `Devices running ${groupName}`,
    });
  });

  return Array.from(groupsByName.values());
}

export default function Group({ pathname, onNavigate, onSignOut }) {
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groups, setGroups] = useState(() => buildGroupsFromDevices(initialDevices));

  useEffect(() => {
    let isMounted = true;

    const loadDevices = async () => {
      try {
        const response = await getMyDevices();
        const apiDevices = Array.isArray(response?.all)
          ? response.all.map(mapApiDevice)
          : [];

        if (isMounted && apiDevices.length > 0) {
          setGroups(buildGroupsFromDevices(apiDevices));
        }
      } catch {
        // Keep the existing static fallback when the backend is unavailable.
      }
    };

    loadDevices();

    return () => {
      isMounted = false;
    };
  }, []);

  const toolbar = (
    <div className="flex w-full items-center justify-between gap-3 sm:gap-4 flex-col sm:flex-row">
      <h1 className="text-[16px] sm:text-[18px] font-semibold leading-[19.002px] text-[rgba(0,0,0,0.75)] truncate">
        Group Details
      </h1>

      <button
        type="button"
        onClick={() => setShowAddGroup(true)}
        className="flex h-[56px] w-full sm:w-auto sm:min-w-[140px] lg:w-[148px] items-center justify-center sm:justify-start gap-[6px] rounded-[28px] bg-[linear-gradient(118deg,#2970FF_9.79%,#193D9E_97.55%)] px-4 sm:pl-4 sm:pr-[14px] text-[14px] sm:text-[16px] font-semibold leading-[19.002px] text-white"
      >
        <img
          src="/plus.svg"
          alt=""
          className="h-[21px] w-[21px] shrink-0 object-contain"
          aria-hidden="true"
        />
        <span>Add Group</span>
      </button>
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
        <div className="-mt-12 sm:-mt-6 pl-4 sm:pl-6 md:pl-8 lg:pl-[43px] pr-4 sm:pr-6 md:pr-8 lg:pr-[41px] pt-0">
          <GroupCardGrid initialGroups={groups} />
        </div>
      </DashboardLayout>

      <AddGroupModal
        open={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onConfirm={() => setShowAddGroup(false)}
      />
    </>
  );
}
