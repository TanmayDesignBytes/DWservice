import { useCallback, useEffect, useMemo, useState } from "react";
import AddGroupModal from "@/components/dashboard/AddGroupModal";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import GroupCardGrid from "@/components/GroupCard";
import {
  createGroup,
  deleteGroup,
  getGroups,
  getMyDevices,
  updateGroup,
} from "@/lib/api";
import { defaultGroupOptions } from "@/data/dashboard";

function normalizeGroupName(value) {
  return String(value || "").trim();
}

function getGroupItems(response) {
  const rawGroups = Array.isArray(response?.groups)
    ? response.groups
    : Array.isArray(response?.data?.groups)
      ? response.data.groups
      : Array.isArray(response?.data)
        ? response.data
        : [];

  return rawGroups
    .map((group) => {
      if (typeof group === "string") {
        return {
          backendId: null,
          name: normalizeGroupName(group),
          description: "",
        };
      }

      return {
        backendId: group?.id ?? null,
        name: normalizeGroupName(group?.name),
        description: String(group?.description || "").trim(),
      };
    })
    .filter((group) => group.name);
}

function buildGroupCards(devices, backendGroups) {
  const groupMap = new Map(
    defaultGroupOptions.map((option) => [
      option.label,
      {
        id: `group:${option.label}`,
        backendId: null,
        name: option.label,
        description: "",
        count: 0,
      },
    ]),
  );

  backendGroups.forEach((group) => {
    const groupKey = normalizeGroupName(group.name);
    const existing = groupMap.get(groupKey);

    if (!groupKey) {
      return;
    }

    groupMap.set(groupKey, {
      id: group.backendId ? `group:${group.backendId}` : `group:${groupKey}`,
      backendId: group.backendId ?? null,
      name: group.name,
      description: group.description || existing?.description || "",
      count: existing?.count || 0,
    });
  });

  devices.forEach((device) => {
    const groupName = String(device?.group || "").trim();

    if (!groupName) {
      return;
    }

    const existing = groupMap.get(groupName) || {
      id: `group:${groupName}`,
      backendId: null,
      name: groupName,
      description: "",
      count: 0,
    };

    groupMap.set(groupName, {
      ...existing,
      count: existing.count + 1,
      description:
        existing.description ||
        String(device?.description || "").trim() ||
        `Devices assigned to ${groupName}`,
    });
  });

  return Array.from(groupMap.values()).map((group) => ({
    id: group.id,
    backendId: group.backendId,
    name: group.name,
    label: `${group.count} device${group.count === 1 ? "" : "s"}`,
    description: group.description || "No devices assigned yet.",
  }));
}

export default function Group({ pathname, onNavigate, onSignOut }) {
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);

  const loadDevices = useCallback(async () => {
    try {
      const response = await getMyDevices();
      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.all)
          ? response.all
          : Array.isArray(response?.data?.all)
            ? response.data.all
            : Array.isArray(response?.devices)
              ? response.devices
              : Array.isArray(response?.data?.devices)
                ? response.data.devices
                : Array.isArray(response?.data)
                  ? response.data
                  : [];

      setDevices(items);
    } catch {
      setDevices([]);
    }
  }, []);

  const loadGroups = useCallback(async (knownGroups = []) => {
    const response = await getGroups();
    const fetchedGroups = getGroupItems(response);

    setGroups((current) => {
      const knownByName = new Map(
        [...current, ...knownGroups]
          .filter(Boolean)
          .map((group) => [normalizeGroupName(group.name), group]),
      );

      return fetchedGroups.map((group) => {
        const knownGroup = knownByName.get(group.name);

        return {
          backendId: group.backendId ?? knownGroup?.backendId ?? null,
          name: group.name,
          description: group.description || knownGroup?.description || "",
        };
      });
    });
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDevices();
      void loadGroups();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDevices, loadGroups]);

  const groupCards = useMemo(
    () => buildGroupCards(devices, groups),
    [devices, groups],
  );

  const handleCreateGroup = useCallback(async (values) => {
    const trimmedName = String(values?.name || "").trim();

    if (!trimmedName) {
      setShowAddGroup(false);
      return;
    }

    const response = await createGroup({
      name: trimmedName,
      description: String(values?.description || "").trim(),
    });

    const savedGroup = response?.data || {};
    await loadGroups([
      {
        backendId: savedGroup.id ?? null,
        name: savedGroup.name || trimmedName,
        description:
          savedGroup.description ?? String(values?.description || "").trim(),
      },
    ]);

    setShowAddGroup(false);
  }, [loadGroups]);

  const handleSaveGroup = useCallback(async (group, values) => {
    const trimmedName = String(values?.name || "").trim();
    const trimmedDescription = String(values?.description || "").trim();

    if (group?.backendId != null) {
      const response = await updateGroup(group.backendId, {
        name: trimmedName,
        description: trimmedDescription,
      });

      const updatedGroup = response?.data || {
        id: group.backendId,
        name: trimmedName,
        description: trimmedDescription,
      };
      await loadGroups([
        {
          backendId: updatedGroup.id ?? group.backendId,
          name: updatedGroup.name || trimmedName,
          description: updatedGroup.description ?? trimmedDescription,
        },
      ]);

      return {
        name: updatedGroup.name || trimmedName,
        description: updatedGroup.description ?? trimmedDescription,
      };
    }

    return {
      name: trimmedName || group.name,
      description: trimmedDescription,
    };
  }, [loadGroups]);

  const handleDeleteGroup = useCallback(async (group) => {
    if (group?.backendId != null) {
      await deleteGroup(group.backendId);
      await loadGroups();
      return;
    }
  }, [loadGroups]);

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
        onAccountNavigate={() => onNavigate?.("/dashboard/account")}
      >
        <div className="-mt-12 sm:-mt-6 pl-4 sm:pl-6 md:pl-8 lg:pl-[43px] pr-4 sm:pr-6 md:pr-8 lg:pr-[41px] pt-0">
          <GroupCardGrid
            initialGroups={groupCards}
            onSaveGroup={handleSaveGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        </div>
      </DashboardLayout>

      <AddGroupModal
        open={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onConfirm={handleCreateGroup}
      />
    </>
  );
}
