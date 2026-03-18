import { useState } from "react";
import AddGroupModal from "@/components/dashboard/AddGroupModal";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import GroupCardGrid from "@/components/GroupCard";

export default function Group({ pathname, onNavigate }) {
  const [showAddGroup, setShowAddGroup] = useState(false);

  const toolbar = (
    <div className="flex w-full items-center justify-between gap-4">
      <h1 className="text-[18px] font-semibold leading-[19.002px] text-[rgba(0,0,0,0.75)]">
        Group Details
      </h1>

      <button
        type="button"
        onClick={() => setShowAddGroup(true)}
        className="flex h-[56px] w-[148px] items-center justify-start gap-[6px] rounded-[28px] bg-[linear-gradient(118deg,#2970FF_9.79%,#193D9E_97.55%)] pl-4 pr-[14px] text-[16px] font-semibold leading-[19.002px] text-white"
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
      >
        <div className="-mt-[16px] pl-[43px] pr-[41px] pt-0">
          <GroupCardGrid />
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
