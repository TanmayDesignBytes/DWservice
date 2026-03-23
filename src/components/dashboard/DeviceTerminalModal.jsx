import { useEffect, useRef } from "react";

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

function getBootBanner(device, session, promptConfig) {
  const safeName = device.name || "Raspberry Pi";
  const host = promptConfig.host;
  const user = promptConfig.user;
  const ipAddress = session?.ipAddress || "127.0.0.1";
  const kernel = session?.kernel || "Linux 6.1 armv7l";

  return [
    `login as: ${user}`,
    `${user}@${ipAddress}'s password:`,
    `Linux ${host} ${kernel}`,
    "",
    "The programs included with the Debian GNU/Linux system are free software;",
    "the exact distribution terms for each program are described in the",
    "individual files in /usr/share/doc/*/copyright.",
    "",
    "Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent",
    "permitted by applicable law.",
    `Last login: Fri Mar 20 11:05:14 2026 from ${ipAddress}`,
    `${safeName} remote shell ready.`,
  ];
}

function getCommandOutput(command, device, session, promptConfig) {
  switch (command) {
    case "help":
      return [
        "Available commands:",
        "help      show supported commands",
        "status    print current device details",
        "ping      simulate a connectivity check",
        "connect   show backend integration hint",
        "uname -a  print kernel information",
        "ls        list demo folders",
        "pwd       print current directory",
        "clear     clear the terminal",
        "exit      close the terminal",
      ];
    case "status":
      return [
        `device=${device.name}`,
        `group=${device.group}`,
        `location=${device.location}`,
        `last_update=${device.date}`,
        `state=${device.status}`,
        `hostname=${session?.hostname || promptConfig.host}`,
      ];
    case "ping":
      return [
        `PING ${device.name.toLowerCase().replace(/\s+/g, "-")} (${session?.ipAddress || "127.0.0.1"}) 56(84) bytes of data.`,
        `64 bytes from ${session?.ipAddress || "127.0.0.1"}: icmp_seq=1 ttl=64 time=18.4 ms`,
        "",
        `--- ${session?.ipAddress || "127.0.0.1"} ping statistics ---`,
        "1 packets transmitted, 1 received, 0% packet loss",
      ];
    case "connect":
      return [
        "Frontend terminal session established.",
        "Interactive commands are running in UI preview mode.",
      ];
    case "uname -a":
      return [session?.kernel ? `Linux ${promptConfig.host} ${session.kernel}` : `Linux ${promptConfig.host}`];
    case "ls":
      return ["configs  logs  scripts  telemetry  updates"];
    case "pwd":
      return [promptConfig.cwd];
    case "hostname":
      return [promptConfig.host];
    case "whoami":
      return [promptConfig.user];
    default:
      return [
        `-bash: ${command}: command not found`,
        'Type "help" to see available commands.',
      ];
  }
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

      const writePrompt = () => {
        terminal.write(`\r\n${prompt}`);
      };

      const runCommand = (rawCommand) => {
        const command = rawCommand.trim().toLowerCase();

        if (!command) {
          writePrompt();
          return;
        }

        if (command === "clear") {
          terminal.clear();
          terminal.write(`${getBootBanner(device, session, promptConfig).join("\r\n")}\r\n${prompt}`);
          return;
        }

        if (command === "exit") {
          onClose?.();
          return;
        }

        const output = getCommandOutput(command, device, session, promptConfig);
        terminal.write(`\r\n${output.join("\r\n")}`);
        writePrompt();
      };

      const terminalBanner = getBootBanner(device, session, promptConfig);

      terminal.write(`${terminalBanner.join("\r\n")}\r\n${prompt}`);

      const dataDisposable = terminal.onData((data) => {
        if (data === "\r") {
          const command = commandBufferRef.current;
          commandBufferRef.current = "";
          runCommand(command);
          return;
        }

        if (data === "\u0003") {
          commandBufferRef.current = "";
          terminal.write("^C");
          writePrompt();
          return;
        }

        if (data === "\u007f") {
          if (commandBufferRef.current.length > 0) {
            commandBufferRef.current = commandBufferRef.current.slice(0, -1);
            terminal.write("\b \b");
          }
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

    setupTerminal();

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
              Raspberry Pi style terminal preview
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
