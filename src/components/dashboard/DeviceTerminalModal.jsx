import { useEffect, useRef } from "react";
import { sendTerminalCommand } from "@/lib/api";

function formatPrompt(session) {
  const host =
    String(session?.hostname || "raspberrypi")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "")
      .slice(0, 20) || "raspberrypi";
  const user = session?.username || "pi";
  const cwd = session?.cwd || `/home/${user}`;
  const shortCwd =
    cwd.startsWith(`/home/${user}`) ? cwd.replace(`/home/${user}`, "~") : cwd;

  return {
    host,
    user,
    cwd,
    prompt: `\u001b[1;32m${user}@${host}\u001b[0m:\u001b[1;34m${shortCwd}\u001b[0m $ `,
  };
}

function getHelpOutput(device) {
  return [
    "Available commands:",
    "help      show supported commands",
    "clear     clear the terminal",
    "exit      close the terminal",
    "",
    "All other commands are sent to the backend device command API.",
    `Example: cd DWcode`,
    `Target agent: ${device.deviceIdentifier || "not connected"}`,
  ];
}

function extractTerminalOutput(response) {
  const candidates = [
    response?.output,
    response?.stdout,
    response?.result,
    response?.response,
    response?.data?.output,
    response?.data?.stdout,
    response?.data?.result,
    response?.data?.response,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.join("\r\n");
    }
  }

  return "";
}

function shouldForwardRawKey(data) {
  if (!data) {
    return false;
  }

  if (data === "\t") {
    return true;
  }

  if (data.length > 1) {
    return true;
  }

  const code = data.charCodeAt(0);
  return code < 32 && data !== "\r" && data !== "\u007f" && data !== "\b";
}

function getControlCharacter(key) {
  if (!/^[a-z]$/i.test(key || "")) {
    return "";
  }

  return String.fromCharCode(key.toUpperCase().charCodeAt(0) - 64);
}

export default function DeviceTerminalModal({ open, device, onClose }) {
  const terminalHostRef = useRef(null);
  const commandBufferRef = useRef("");

  useEffect(() => {
    if (!open || !terminalHostRef.current || !device) {
      return undefined;
    }

    let isDisposed = false;
    let cleanup = () => {};

    const setupTerminal = async () => {
      const [sessionResponse, { FitAddon }, { Terminal }] = await Promise.all([
        Promise.resolve(null),
        import("@xterm/addon-fit"),
        import("@xterm/xterm"),
        import("@xterm/xterm/css/xterm.css"),
      ]);

      if (isDisposed || !terminalHostRef.current) {
        return;
      }

      const session = sessionResponse?.session || null;
      const promptConfig = formatPrompt(session);
      const { prompt } = promptConfig;
      const terminal = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: '"Courier New", Consolas, monospace',
        fontSize: 16,
        lineHeight: 1.2,
        cursorStyle: "block",
        cursorInactiveStyle: "block",
        theme: {
          background: "#000000",
          foreground: "#f5f5f5",
          cursor: "#19ff19",
          cursorAccent: "#19ff19",
          selectionBackground: "rgba(255,255,255,0.18)",
          black: "#000000",
          brightBlack: "#666666",
          red: "#ff6b6b",
          brightRed: "#ff8e8e",
          green: "#00d700",
          brightGreen: "#19ff19",
          yellow: "#ffff5f",
          brightYellow: "#ffff87",
          blue: "#5f87ff",
          brightBlue: "#87afff",
          magenta: "#d787ff",
          brightMagenta: "#ffafff",
          cyan: "#5fffff",
          brightCyan: "#87ffff",
          white: "#d9d9d9",
          brightWhite: "#ffffff",
        },
      });
      const fitAddon = new FitAddon();

      terminal.loadAddon(fitAddon);
      terminal.open(terminalHostRef.current);
      fitAddon.fit();
      terminal.focus();
      commandBufferRef.current = "";

      const writeBackendOutput = (response) => {
        const terminalOutput = extractTerminalOutput(response);

        if (terminalOutput && terminalOutput !== "Timeout") {
          terminal.write(`\r\n${terminalOutput}`);
        }
      };

      const sendRawImmediately = async (value) => {
        if (!device.deviceIdentifier) {
          terminal.write("\r\nDevice agent id is missing.");
          return;
        }

        try {
          const response = await sendTerminalCommand(
            device.deviceIdentifier,
            value,
            true,
          );
          writeBackendOutput(response);
        } catch (error) {
          console.error(error);
          terminal.write(
            `\r\n${error?.message || "Failed to send input to device."}`,
          );
        }
      };

      const runCommand = async (rawCommand) => {
        const trimmedCommand = rawCommand.trim();
        const command = trimmedCommand.toLowerCase();

        if (!trimmedCommand) {
          terminal.write("\r\n");
          terminal.write(prompt);
          return;
        }

        if (command === "clear") {
          terminal.clear();
          terminal.write(prompt);
          return;
        }

        if (command === "exit") {
          onClose?.();
          return;
        }

        if (command === "help") {
          terminal.write(`\r\n${getHelpOutput(device).join("\r\n")}`);
          terminal.write(`\r\n${prompt}`);
          return;
        }

        if (!device.deviceIdentifier) {
          terminal.write("\r\nDevice agent id is missing.");
          terminal.write(`\r\n${prompt}`);
          return;
        }

        try {
          const response = await sendTerminalCommand(
            device.deviceIdentifier,
            trimmedCommand,
            false,
          );
          writeBackendOutput(response);
        } catch (error) {
          terminal.write(
            `\r\n${error?.message || "Failed to send command to device."}`,
          );
        } finally {
          terminal.write(`\r\n${prompt}`);
        }
      };

      terminal.write(prompt);

      terminal.attachCustomKeyEventHandler((event) => {
        if (
          event.type === "keydown" &&
          event.ctrlKey &&
          !event.altKey &&
          !event.metaKey
        ) {
          const controlCharacter = getControlCharacter(event.key);

          if (!controlCharacter) {
            return true;
          }

          event.preventDefault();

          if (controlCharacter === "\u0003") {
            commandBufferRef.current = "";
            terminal.write("^C");
            terminal.write(`\r\n${prompt}`);
          }

          void sendRawImmediately(controlCharacter);
          return false;
        }

        return true;
      });

      const dataDisposable = terminal.onData((data) => {
        if (!device.deviceIdentifier) {
          terminal.write("\r\nDevice agent id is missing.");
          return;
        }

        if (data === "\r") {
          const command = commandBufferRef.current;
          commandBufferRef.current = "";
          void runCommand(command);
          return;
        }

        if (data === "\u007f" || data === "\b") {
          if (commandBufferRef.current.length > 0) {
            commandBufferRef.current = commandBufferRef.current.slice(0, -1);
            terminal.write("\b \b");
          }
          return;
        }

        if (shouldForwardRawKey(data)) {
          void sendRawImmediately(data);
          return;
        }

        if (data >= " " && data !== "\u007f") {
          commandBufferRef.current += data;
          terminal.write(data);
        }
      });

      const handleResize = () => {
        fitAddon.fit();
      };

      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          onClose?.();
        }
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("keydown", handleKeyDown);

      cleanup = () => {
        dataDisposable.dispose();
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("keydown", handleKeyDown);
        terminal.dispose();
        commandBufferRef.current = "";
      };
    };

    void setupTerminal();

    return () => {
      isDisposed = true;
      cleanup();
    };
  }, [device, onClose, open]);

  if (!open || !device) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,7,18,0.56)] px-4 py-6 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-[min(82vh,640px)] w-full max-w-[980px] flex-col overflow-hidden rounded-[10px] border border-[#7ba9d8] bg-[#000000] shadow-[0_28px_70px_rgba(2,6,23,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#7ba9d8] bg-[#86b6e8] px-4 py-2">
          <div>
            <p className="font-['Poppins'] text-[15px] font-semibold text-[#08111f]">
              {device.name} SSH Console
            </p>
            <p className="text-[11px] text-[#163252]">
              Remote terminal session
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#4e7aa8] bg-[#dcecff] px-2.5 py-1 text-[12px] font-medium text-[#163252] transition-colors hover:bg-[#c9e0fb]"
          >
            Close
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-[#163252] bg-[#050505] px-4 py-2 text-[11px] text-[#bbbbbb]">
          <span className="rounded border border-[#1f1f1f] bg-[#0c0c0c] px-2 py-1">
            Group: {device.group}
          </span>
          <span className="rounded border border-[#1f1f1f] bg-[#0c0c0c] px-2 py-1">
            Location: {device.location}
          </span>
          <span className="rounded border border-[#1f1f1f] bg-[#0c0c0c] px-2 py-1">
            Status: {device.status}
          </span>
        </div>

        <div className="min-h-0 flex-1 bg-[#000000] p-0">
          <div
            ref={terminalHostRef}
            className="h-full w-full overflow-hidden bg-[#000000] p-3"
          />
        </div>
      </div>
    </div>
  );
}


