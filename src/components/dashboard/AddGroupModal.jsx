import { useEffect, useState } from "react";

function Field({ label, children }) {
  return (
    <div className="flex w-full flex-col gap-[0.375rem] self-stretch">
      <label
        className="text-[14px] font-normal leading-[20px] text-[#344054]"
        style={{ fontFamily: "Poppins, sans-serif", fontStyle: "normal" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const EMPTY_VALUES = {
  name: "",
  description: "",
};

export default function AddGroupModal({
  open,
  onClose,
  onConfirm,
  initialValues = EMPTY_VALUES,
  title = "Add Group",
  confirmLabel = "Confirm",
}) {
  const [formValues, setFormValues] = useState(EMPTY_VALUES);

  useEffect(() => {
    if (open) {
      setFormValues({
        name: initialValues?.name ?? "",
        description: initialValues?.description ?? "",
      });
    }
  }, [initialValues, open]);

  if (!open) {
    return null;
  }

  const handleChange = (field) => (event) => {
    setFormValues((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleConfirm = () => {
    onConfirm?.(formValues);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-[0.125rem]"
      onClick={onClose}
    >
      <div
        className="flex w-[514px] max-w-full flex-col items-center rounded-[20px] bg-white p-[50px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] backdrop-blur-[6.5px]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          className="w-full self-stretch text-[20px] font-semibold leading-[30px] text-[#101828]"
          style={{ fontFamily: "Poppins, sans-serif", fontStyle: "normal" }}
        >
          {title}
        </h2>

        <div className="mt-8 flex w-full flex-col gap-5 self-stretch">
          <Field label="Group Name">
            <input
              type="text"
              placeholder="Enter Group Name"
              className="h-[55px] w-full rounded-[8px] border border-[#D0D5DD] bg-white px-[14px] py-[10px] text-[16px] font-normal leading-6 text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#2970FF]/25"
              style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal" }}
              value={formValues.name}
              onChange={handleChange("name")}
            />
          </Field>

          <Field label="Description">
            <input
              type="text"
              placeholder="Enter Description"
              className="h-[55px] w-full rounded-[8px] border border-[#D0D5DD] bg-white px-[14px] py-[10px] text-[16px] font-normal leading-6 text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#2970FF]/25"
              style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal" }}
              value={formValues.description}
              onChange={handleChange("description")}
            />
          </Field>
        </div>

        <div className="mt-[76px] flex w-full items-start justify-start gap-[76px] self-stretch">
          <button
            type="button"
            onClick={onClose}
            className="flex h-[44px] w-[169px] items-center justify-center gap-[0.375rem] rounded-[100px] border border-[#33363F] bg-white px-4 py-[10px] text-[16px] font-semibold leading-6 text-[#33363F] shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
            style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex h-[44px] w-[169px] items-center justify-center gap-[0.375rem] rounded-[100px] border border-[#2970FF] bg-[#2970FF] px-4 py-[10px] text-[16px] font-semibold leading-6 text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:bg-[#193D9E]"
            style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
