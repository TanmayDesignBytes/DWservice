import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  API_BASE_URL,
  createFolder,
  deleteStoredFile,
  listFilesAndFolders,
  uploadFile,
} from "@/lib/api";
import DeleteModal from "@/components/DeleteModal";
import { cn } from "@/lib/utils";

const EMPTY_LISTING = {
  folder: "",
  folders: [],
  files: [],
  totalFiles: 0,
  totalFolders: 0,
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FolderIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 7.75C3 6.7835 3.7835 6 4.75 6H9.2426C9.70687 6 10.1521 6.18437 10.4804 6.51256L11.4874 7.51958C11.8156 7.84777 12.2608 8.03214 12.7251 8.03214H19.25C20.2165 8.03214 21 8.81564 21 9.78214V17.25C21 18.2165 20.2165 19 19.25 19H4.75C3.7835 19 3 18.2165 3 17.25V7.75Z"
        fill="#F4C95D"
        stroke="#A16207"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function FileIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 3.75H13.6287C14.0929 3.75 14.5382 3.93437 14.8664 4.26256L18.2374 7.63356C18.5656 7.96175 18.75 8.40699 18.75 8.87126V19.25C18.75 20.2165 17.9665 21 17 21H8C7.0335 21 6.25 20.2165 6.25 19.25V5.5C6.25 4.5335 7.0335 3.75 8 3.75Z"
        fill="#EFF4FF"
        stroke="#3B82F6"
        strokeWidth="1.4"
      />
      <path
        d="M13 4V8.25H17.25"
        stroke="#3B82F6"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M20 5V9H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.3636 15C17.3636 17.3636 14.9091 19 12.0909 19C8.45455 19 5.45455 16.0909 5.45455 12.5455C5.45455 9 8.45455 6.09091 12.0909 6.09091C14.0909 6.09091 15.9091 6.90909 17.1818 8.27273L20 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 19V5M12 5L6 11M12 5L18 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 16V6M12 6L8 10M12 6L16 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 18H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function joinFolderPath(baseFolder, nextSegment) {
  const base = String(baseFolder || "")
    .replace(/^\/+|\/+$/g, "")
    .trim();
  const next = String(nextSegment || "")
    .replace(/^\/+|\/+$/g, "")
    .trim();

  if (!base) {
    return next;
  }

  if (!next) {
    return base;
  }

  return `${base}/${next}`;
}

function stripUploadsPrefix(value) {
  return String(value || "")
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "")
    .trim();
}

function normalizeFolderPath(value) {
  const normalized = stripUploadsPrefix(value).replace(/^\/+/, "");

  if (normalized === "root") {
    return "";
  }

  return normalized;
}

function getParentFolder(folder) {
  const parts = String(folder || "")
    .split("/")
    .filter(Boolean);

  if (parts.length <= 1) {
    return "";
  }

  return parts.slice(0, -1).join("/");
}

function getFolderName(folder) {
  if (typeof folder === "string") {
    return folder.split("/").filter(Boolean).pop() || folder;
  }

  return (
    folder?.name ||
    folder?.folderName ||
    folder?.folder ||
    folder?.path?.split("/")?.filter(Boolean)?.pop() ||
    "Folder"
  );
}

function resolveCreatedFolderPath(response, fallbackName) {
  const folderName =
    typeof response?.folderName === "string" && response.folderName.trim()
      ? response.folderName.trim()
      : "";
  const path =
    typeof response?.path === "string" && response.path.trim()
      ? stripUploadsPrefix(response.path)
      : "";

  return normalizeFolderPath(folderName || path || fallbackName);
}

function normalizeFolderEntry(folder, baseFolder) {
  const name = getFolderName(folder);
  const rawPath = stripUploadsPrefix(
    typeof folder === "string"
      ? folder
      : folder?.path || folder?.folder || folder?.folderName || name,
  );

  return {
    id: `folder:${rawPath}`,
    name,
    path: normalizeFolderPath(
      rawPath.includes("/") ? rawPath : joinFolderPath(baseFolder, rawPath),
    ),
    modifiedAt: folder?.uploadDate || folder?.updatedAt || folder?.lastModified || "",
    type: "folder",
  };
}

function resolveUploadsOrigin() {
  return API_BASE_URL.replace(/\/api$/, "");
}

function resolveFileUrl(file) {
  const uploadsOrigin = resolveUploadsOrigin();
  const rawUrl = String(file?.url || "").trim();

  if (rawUrl) {
    try {
      const parsedUrl = new URL(rawUrl);

      if (
        parsedUrl.hostname === "localhost" ||
        parsedUrl.hostname === "127.0.0.1"
      ) {
        return `${uploadsOrigin}${parsedUrl.pathname}`;
      }

      return rawUrl;
    } catch {
      return `${uploadsOrigin}/${rawUrl.replace(/^\/+/, "")}`;
    }
  }

  const rawPath = stripUploadsPrefix(file?.path || "");

  if (!rawPath) {
    return "";
  }

  return `${uploadsOrigin}/uploads/${rawPath}`;
}

function normalizeFileEntry(file) {
  const path = stripUploadsPrefix(
    file?.path || file?.name || file?.fileName || file?.originalName || "file",
  );

  return {
    id: `file:${path}`,
    name: file?.originalName || file?.name || "Unnamed file",
    rawName: file?.name || file?.fileName || file?.originalName || "Unnamed file",
    path,
    size: Number(file?.size || 0),
    modifiedAt: file?.uploadDate || file?.updatedAt || file?.lastModified || "",
    url: resolveFileUrl(file),
    type: "file",
  };
}

function formatFileSize(size) {
  if (!size) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB"];
  let currentSize = size;
  let unitIndex = 0;

  while (currentSize >= 1024 && unitIndex < units.length - 1) {
    currentSize /= 1024;
    unitIndex += 1;
  }

  return `${currentSize.toFixed(currentSize >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatModifiedAt(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function FilesAndFolderModal({ open, device, onClose }) {
  const [listing, setListing] = useState(EMPTY_LISTING);
  const [rootFolders, setRootFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [deletingPath, setDeletingPath] = useState("");
  const [pendingDeletePath, setPendingDeletePath] = useState("");

  const fileInputRef = useRef(null);
  const requestIdRef = useRef(0);
  const rootRequestIdRef = useRef(0);

  const loadRootFolders = useCallback(async () => {
    const requestId = rootRequestIdRef.current + 1;
    rootRequestIdRef.current = requestId;

    try {
      const response = await listFilesAndFolders("");

      if (requestId !== rootRequestIdRef.current) {
        return;
      }

      setRootFolders(Array.isArray(response?.folders) ? response.folders : []);
    } catch {
      if (requestId !== rootRequestIdRef.current) {
        return;
      }

      setRootFolders([]);
    }
  }, []);

  const loadFolder = useCallback(async (folderPath = "") => {
    const nextFolder = normalizeFolderPath(folderPath);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await listFilesAndFolders(nextFolder);

      if (requestId !== requestIdRef.current) {
        return;
      }

      const resolvedFolder =
        typeof response?.folder === "string" && response.folder.trim()
          ? normalizeFolderPath(response.folder)
          : nextFolder;

      setCurrentFolder(resolvedFolder);
      setListing({
        folder: resolvedFolder,
        folders: Array.isArray(response?.folders) ? response.folders : [],
        files: Array.isArray(response?.files) ? response.files : [],
        totalFiles: Number(response?.totalFiles || 0),
        totalFolders: Number(response?.totalFolders || 0),
      });

      if (!resolvedFolder) {
        setRootFolders(Array.isArray(response?.folders) ? response.folders : []);
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setErrorMessage(error?.message || "Failed to load files and folders.");
      setListing(EMPTY_LISTING);
      setCurrentFolder(nextFolder);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    document.body.style.overflow = "hidden";
    setSearchValue("");
    setFeedbackMessage("");
    setShowCreateFolder(false);
    setNewFolderName("");
    void loadRootFolders();
    void loadFolder("");

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [loadFolder, loadRootFolders, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const normalizedFolders = useMemo(() => {
    return (listing.folders || []).map((folder) =>
      normalizeFolderEntry(folder, currentFolder),
    );
  }, [currentFolder, listing.folders]);

  const normalizedFiles = useMemo(() => {
    return (listing.files || []).map((file) => normalizeFileEntry(file));
  }, [listing.files]);

  const filteredFolders = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return normalizedFolders;
    }

    return normalizedFolders.filter((folder) =>
      folder.name.toLowerCase().includes(query),
    );
  }, [normalizedFolders, searchValue]);

  const filteredFiles = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return normalizedFiles;
    }

    return normalizedFiles.filter((file) =>
      `${file.name} ${file.rawName}`.toLowerCase().includes(query),
    );
  }, [normalizedFiles, searchValue]);

  const resourceFolders = useMemo(() => {
    const items = [{ label: "/root", path: "", depth: 0 }];
    const seenPaths = new Set([""]);

    rootFolders
      .map((folder) => normalizeFolderEntry(folder, ""))
      .forEach((folder) => {
        if (seenPaths.has(folder.path)) {
          return;
        }

        seenPaths.add(folder.path);
        items.push({
          label: `/${folder.name}`,
          path: folder.path,
          depth: 0,
        });
      });

    if (currentFolder && !seenPaths.has(currentFolder)) {
      items.push({
        label: `/${getFolderName(currentFolder)}`,
        path: currentFolder,
        depth: 0,
      });
    }

    return items;
  }, [currentFolder, rootFolders]);

  const visibleFolders = useMemo(() => {
    if (!currentFolder) {
      return [];
    }

    return filteredFolders;
  }, [currentFolder, filteredFolders]);

  const handleRefresh = () => {
    setFeedbackMessage("");
    void loadFolder(currentFolder);
  };

  const handleNavigateUp = () => {
    const parentFolder = getParentFolder(currentFolder);

    if (parentFolder === currentFolder) {
      return;
    }

    setFeedbackMessage("");
    void loadFolder(parentFolder);
  };

  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim();

    if (!trimmedName || isCreatingFolder) {
      return;
    }

    setIsCreatingFolder(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const response = await createFolder({
        folderName: trimmedName,
      });
      const createdFolderPath = resolveCreatedFolderPath(response, trimmedName);

      setNewFolderName("");
      setShowCreateFolder(false);
      setFeedbackMessage("Folder created successfully.");
      await loadRootFolders();
      await loadFolder(createdFolderPath);
    } catch (error) {
      setErrorMessage(error?.message || "Failed to create folder.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadFile = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0 || isUploadingFile) {
      return;
    }

    const formData = new FormData();
    const requestedFolder = currentFolder;

    formData.append("folder", requestedFolder);

    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    setIsUploadingFile(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const response = await uploadFile(formData);
      const uploadedFiles = Array.isArray(response?.files) ? response.files : [];

      if (uploadedFiles.length > 0) {
        const targetFolder =
          requestedFolder ||
          (typeof response?.folder === "string" && response.folder.trim()
            ? normalizeFolderPath(response.folder)
            : currentFolder);

        setCurrentFolder(targetFolder);
        setListing((current) => {
          const existingFiles = Array.isArray(current.files) ? current.files : [];
          const existingPaths = new Set(
            existingFiles.map((file) => stripUploadsPrefix(file?.path || file?.name || file?.fileName || file?.originalName)),
          );

          const mergedFiles = [...existingFiles];

          uploadedFiles.forEach((file) => {
            const nextPath = stripUploadsPrefix(
              file?.path || file?.name || file?.fileName || file?.originalName,
            );

            if (!existingPaths.has(nextPath)) {
              existingPaths.add(nextPath);
              mergedFiles.push(file);
            }
          });

          return {
            ...current,
            folder: targetFolder,
            files: mergedFiles,
            totalFiles: mergedFiles.length,
          };
        });
      } else {
        await loadFolder(currentFolder);
      }

      setFeedbackMessage(
        response?.message ||
          `${selectedFiles.length} file(s) uploaded successfully.`,
      );
    } catch (error) {
      setErrorMessage(error?.message || "Failed to upload file.");
    } finally {
      setIsUploadingFile(false);
      event.target.value = "";
    }
  };

  const handleDeleteFile = async (filePath) => {
    if (!filePath || deletingPath) {
      return;
    }

    setPendingDeletePath(filePath);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeletePath || deletingPath) {
      return;
    }

    setDeletingPath(pendingDeletePath);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      await deleteStoredFile({ filePath: pendingDeletePath });
      setFeedbackMessage("File deleted successfully.");
      await loadRootFolders();
      await loadFolder(currentFolder);
      setPendingDeletePath("");
    } catch (error) {
      setErrorMessage(error?.message || "Failed to delete file.");
    } finally {
      setDeletingPath("");
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 px-4 py-5 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-[min(82dvh,720px)] w-full max-w-[1120px] overflow-hidden rounded-[18px] border border-[#d0d5dd] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#eaecf0] bg-[#f8fafc]">
          <div className="border-b border-[#eaecf0] px-5 py-5">
            <h2 className="text-[24px] font-bold text-[#1d2939]">
              Files and Folder
            </h2>
            <p className="mt-1 text-[13px] text-[#667085]">
              {device?.name ? `${device.name} resources` : "Manage uploaded resources"}
            </p>
          </div>

          <div className="px-5 py-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
              Resources
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {resourceFolders.map((folder) => (
              <button
                key={folder.path}
                type="button"
                onClick={() => {
                  setFeedbackMessage("");
                  void loadFolder(folder.path);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[15px] font-medium transition-colors",
                  currentFolder === folder.path
                    ? "bg-[#e0ebff] text-[#1849a9]"
                    : "text-[#344054] hover:bg-[#eef2f6]",
                )}
                style={{ paddingLeft: `${12 + folder.depth * 12}px` }}
              >
                <FolderIcon className="h-5 w-5 shrink-0" />
                <span className="truncate">{folder.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-[#eaecf0] px-6 py-5">
            <div>
              <p className="text-[14px] font-medium text-[#667085]">
                Current folder
              </p>
              <h3 className="mt-1 text-[24px] font-semibold text-[#101828]">
                /{currentFolder || "root"}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-[#d0d5dd] p-2 text-[#475467] transition-colors hover:bg-[#f8fafc]"
              aria-label="Close files and folder modal"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-[#eaecf0] px-6 py-4">
            <button
              type="button"
              onClick={handleNavigateUp}
              disabled={!currentFolder}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[#d0d5dd] bg-white px-3 py-2 text-[14px] font-semibold text-[#344054] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowUpIcon />
              Up
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[#d0d5dd] bg-white px-3 py-2 text-[14px] font-semibold text-[#344054] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshIcon />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCreateFolder((value) => !value);
                setErrorMessage("");
                setFeedbackMessage("");
              }}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[#d0d5dd] bg-white px-3 py-2 text-[14px] font-semibold text-[#344054] transition-colors hover:bg-[#f8fafc]"
            >
              <PlusIcon />
              Create Folder
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingFile}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#2970ff] px-3 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#1f5ed4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UploadIcon />
              {isUploadingFile ? "Uploading..." : "Upload File"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUploadFile}
            />

            <div className="ml-auto w-full min-w-[220px] flex-1 sm:max-w-[280px]">
              <input
                type="text"
                placeholder="Search current folder"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="h-[42px] w-full rounded-[10px] border border-[#d0d5dd] bg-white px-4 text-[14px] text-[#101828] placeholder:text-[#98a2b3] focus:outline-none focus:ring-2 focus:ring-[#2970ff]/20"
              />
            </div>
          </div>

          {showCreateFolder ? (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#eaecf0] bg-[#f8fafc] px-6 py-4">
              <input
                type="text"
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                className="h-[42px] min-w-[220px] flex-1 rounded-[10px] border border-[#d0d5dd] bg-white px-4 text-[14px] text-[#101828] placeholder:text-[#98a2b3] focus:outline-none focus:ring-2 focus:ring-[#2970ff]/20"
              />
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={isCreatingFolder || !newFolderName.trim()}
                className="rounded-[10px] bg-[#2970ff] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#1f5ed4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingFolder ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName("");
                }}
                className="rounded-[10px] border border-[#d0d5dd] px-4 py-2 text-[14px] font-semibold text-[#344054] transition-colors hover:bg-white"
              >
                Cancel
              </button>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mx-6 mt-4 rounded-[12px] border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-[14px] font-medium text-[#b42318]">
              {errorMessage}
            </div>
          ) : null}

          {feedbackMessage ? (
            <div className="mx-6 mt-4 rounded-[12px] border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-[14px] font-medium text-[#067647]">
              {feedbackMessage}
            </div>
          ) : null}

          <div className="flex items-center justify-between px-6 py-4 text-[13px] text-[#667085]">
            <span>{listing.totalFolders} folders</span>
            <span>{listing.totalFiles} files</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
            <div className="overflow-hidden rounded-[14px] border border-[#eaecf0]">
              <div className="grid grid-cols-[minmax(0,2.2fr)_120px_120px_160px_150px] items-center gap-4 bg-[#f8fafc] px-5 py-3 text-[13px] font-semibold text-[#475467]">
                <span>Name</span>
                <span>Type</span>
                <span>Size</span>
                <span>Last Modified</span>
                <span>Actions</span>
              </div>

              {isLoading ? (
                <div className="flex min-h-[260px] items-center justify-center px-5 py-8 text-[15px] font-medium text-[#667085]">
                  Loading files and folders...
                </div>
              ) : visibleFolders.length === 0 && filteredFiles.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center px-5 py-8 text-center text-[15px] font-medium text-[#667085]">
                  No files or folders found in this location.
                </div>
              ) : (
                <div className="divide-y divide-[#eaecf0] bg-white">
                  {visibleFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="grid grid-cols-[minmax(0,2.2fr)_120px_120px_160px_150px] items-center gap-4 px-5 py-3"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackMessage("");
                          void loadFolder(folder.path);
                        }}
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        <FolderIcon />
                        <span className="truncate text-[15px] font-medium text-[#101828]">
                          {folder.name}
                        </span>
                      </button>
                      <span className="text-[14px] text-[#667085]">Folder</span>
                      <span className="text-[14px] text-[#667085]">—</span>
                      <span className="text-[14px] text-[#667085]">
                        {formatModifiedAt(folder.modifiedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackMessage("");
                          void loadFolder(folder.path);
                        }}
                        className="w-fit rounded-[8px] border border-[#d0d5dd] px-3 py-1.5 text-[13px] font-semibold text-[#344054] transition-colors hover:bg-[#f8fafc]"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Delete folder API is not available yet"
                        className="w-fit rounded-[8px] border border-[#fda29b] px-3 py-1.5 text-[13px] font-semibold text-[#b42318] opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  ))}

                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="grid grid-cols-[minmax(0,2.2fr)_120px_120px_160px_150px] items-center gap-4 px-5 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileIcon />
                        <span className="truncate text-[15px] font-medium text-[#101828]">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-[14px] text-[#667085]">File</span>
                      <span className="text-[14px] text-[#667085]">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="text-[14px] text-[#667085]">
                        {formatModifiedAt(file.modifiedAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        {file.url ? (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-[8px] border border-[#d0d5dd] px-3 py-1.5 text-[13px] font-semibold text-[#344054] transition-colors hover:bg-[#f8fafc]"
                          >
                            Open
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleDeleteFile(file.path)}
                          disabled={deletingPath === file.path}
                          className="rounded-[8px] border border-[#fda29b] px-3 py-1.5 text-[13px] font-semibold text-[#b42318] transition-colors hover:bg-[#fef3f2] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingPath === file.path ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeleteModal
        open={Boolean(pendingDeletePath)}
        closeOnConfirm={false}
        onClose={() => {
          if (!deletingPath) {
            setPendingDeletePath("");
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
