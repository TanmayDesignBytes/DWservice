import { useEffect, useRef, useState } from "react";
import AddGroupModal from "@/components/dashboard/AddGroupModal";
import DeleteModal from "./DeleteModal";

const groupCards = [
  { id: 1, name: "Group 1", label: "GCU", description: "I've updated the user interface" },
  { id: 2, name: "Group 2", label: "GCU", description: "I've updated the user interface" },
  { id: 3, name: "Group 3", label: "GCU", description: "I've updated the user interface" },
  { id: 4, name: "Group 4", label: "GCU", description: "I've updated the user interface" },
  { id: 5, name: "Group 5", label: "GCU", description: "I've updated the user interface" },
  { id: 6, name: "Group 6", label: "GCU", description: "I've updated the user interface" },
  { id: 7, name: "Group 7", label: "GCU", description: "I've updated the user interface" },
  { id: 8, name: "Group 8", label: "GCU", description: "I've updated the user interface" },
];

const groupMenuItems = [
  { icon: "/edit-03.svg", label: "Edit" },
  { icon: "/trash-01.svg", label: "Delete" },
  { icon: "/star-04.svg", label: "Agents" },
  { icon: "/contact.svg", label: "Contacts" },
  { icon: "/share-06.svg", label: "Share" },
];

function GroupCardMenu({ onClose, onEdit, onDelete }) {
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

  return (
    <div
      ref={menuRef}
      className="absolute left-1/2 top-full z-50 mt-2 w-[184px] -translate-x-1/2 rounded-[8px] border border-[rgba(234,236,240,0.5)] bg-white py-1 shadow-[0_4px_4px_rgba(0,0,0,0.25),0_12px_20px_rgba(7,6,18,0.25)]"
    >
      {groupMenuItems.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            if (item.label === "Edit") {
              onEdit();
            } else if (item.label === "Delete") {
              onDelete();
            }
            onClose();
          }}
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-medium leading-5 text-[#101728] transition-colors hover:bg-[#f8f9fc]"
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            <img
              src={item.icon}
              alt=""
              className="h-4 w-4 object-contain"
              aria-hidden="true"
            />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function GroupCardMenuButton({ onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        className="flex h-[27.364px] w-[26.984px] items-center justify-center"
        aria-label="Group actions"
      >
        <span
          className="flex h-[17.989px] w-[4.5px] flex-col items-center justify-between"
          aria-hidden="true"
        >
          <span className="h-[4.5px] w-[4.5px] rounded-full bg-[#3a3a3e]" />
          <span className="h-[4.5px] w-[4.5px] rounded-full bg-[#3a3a3e]" />
          <span className="h-[4.5px] w-[4.5px] rounded-full bg-[#3a3a3e]" />
        </span>
      </button>
      {menuOpen ? (
        <GroupCardMenu
          onClose={() => setMenuOpen(false)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : null}
    </div>
  );
}

function GroupCardGlyph() {
  return (
    <div className="flex h-[33px] w-[33px] items-center justify-center rounded-[7px] bg-[#f4f7fe] p-[8px_9px_7px_10px]">
      <img
        src="/respberry.png"
        alt=""
        className="h-[18px] w-[14px] shrink-0 object-contain"
        aria-hidden="true"
      />
    </div>
  );
}

function GroupCardItem({ group, onDelete }) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [groupData, setGroupData] = useState({
    name: group.name,
    description: group.description,
  });

  return (
    <>
      <article
        key={group.id}
        className="flex h-[150px] w-full rounded-[15px] border border-[rgba(217,217,217,0.5)] bg-white p-[28px_20px_24.243px_17px]"
      >
        <div className="flex w-full items-start gap-[8px]">
          <GroupCardGlyph />

          <div className="flex min-w-0 flex-1 flex-col items-start gap-[7px]">
            <h2 className="h-[39.884px] self-stretch truncate font-['DM_Sans'] text-[22px] font-bold leading-[42px] tracking-[-0.44px] text-black">
              {groupData.name}
            </h2>
            <p className="h-[21.936px] self-stretch text-[14px] font-medium leading-6 tracking-[-0.28px] text-[#5d657d]">
              {group.label}
            </p>
            <p className="h-[21.936px] self-stretch truncate text-[14px] font-medium leading-6 tracking-[-0.28px] text-[#5d657d]">
              {groupData.description}
            </p>
          </div>

          <GroupCardMenuButton
            onEdit={() => setEditModalOpen(true)}
            onDelete={() => setDeleteModalOpen(true)}
          />
        </div>
      </article>

      <AddGroupModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onConfirm={(values) => {
          setGroupData(values);
          setEditModalOpen(false);
        }}
        initialValues={groupData}
        title="Edit Group"
        confirmLabel="Save"
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => onDelete(group.id)}
      />
    </>
  );
}

export default function GroupCardGrid() {
  const [groups, setGroups] = useState(groupCards);

  return (
    <div className="pt-[24.5px]">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[15px]">
        {groups.map((group) => (
          <GroupCardItem
            key={group.id}
            group={group}
            onDelete={(groupId) => {
              setGroups((current) => current.filter((item) => item.id !== groupId));
            }}
          />
        ))}
      </div>
    </div>
  );
}
