import { useEffect } from "react";

export default function DeleteModal({ open, onClose, onConfirm }) {
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none transition-all duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`w-full max-w-sm bg-white rounded-[12px] shadow-lg p-6 pointer-events-auto transform transition-all duration-300 ${
            open
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0"
          }`}
          role="alertdialog"
          aria-labelledby="delete-modal-title"
          aria-describedby="delete-modal-description"
        >
          {/* Header */}
          <div className="mb-4">
            <h2
              id="delete-modal-title"
              className="text-xl font-semibold text-[#1f2937]"
            >
              Delete Confirmation
            </h2>
          </div>

          {/* Message */}
          <p
            id="delete-modal-description"
            className="mb-6 text-[14px] font-medium text-[#6b7280] leading-6"
          >
            Do you want to delete it permanently?
          </p>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] font-medium text-[14px] text-[#6b7280] bg-[#f3f4f6] border border-[#e5e7eb] transition-colors hover:bg-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d1d5db]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-[8px] font-medium text-[14px] text-white bg-red-600 transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
