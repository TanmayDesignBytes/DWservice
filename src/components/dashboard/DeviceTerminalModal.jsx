import { useEffect, useRef, useState } from "react";
import { sendTerminalCommand } from "@/lib/api";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatPrompt(session) {
  const host = String(session?.hostname || "raspberrypi")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "")
    .slice(0, 20) || "raspberrypi";
  const user  = session?.username || "pi";
  const cwd   = session?.cwd || `/home/${user}`;
  const short = cwd.startsWith(`/home/${user}`)
    ? cwd.replace(`/home/${user}`, "~")
    : cwd;

  return {
    host, user, cwd,
    prompt: `\u001b[1;32m${user}@${host}\u001b[0m:\u001b[1;34m${short}\u001b[0m $ `,
  };
}

function extractOutput(response) {
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
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
    if (Array.isArray(c) && c.length) return c.join("\r\n");
  }
  return "";
}

/**
 * Detect whether the raw output from the backend contains a visible shell
 * prompt line (user@host:...$ ) — meaning the interactive program has exited.
 */
function looksLikeShellPrompt(text) {
  // matches things like "pi@raspberrypi:~/DWcode $ "
  return /\w+@\w+:[^\r\n]*[$#]\s*$/.test(String(text || ""));
}

/**
 * Strip the first line if it exactly echoes the command we sent.
 * Only used in non-interactive (plain command) mode.
 */
function stripEcho(output, cmd) {
  if (!output || !cmd) return output;
  const lines = output.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() === cmd.trim()) {
    return lines.slice(1).join("\n").replace(/^\n+/, "").replace(/\n/g, "\r\n");
  }
  return output;
}

// ─── component ──────────────────────────────────────────────────────────────

export default function DeviceTerminalModal({ open, device, onClose }) {
  const terminalHostRef  = useRef(null);
  const cmdBufRef        = useRef("");          // typed chars before Enter
  const interactiveRef   = useRef(false);       // are we inside nano/vim/less?
  const pendingRef       = useRef(false);       // a request is in-flight
  const termRef          = useRef(null);        // xterm instance
  const promptRef        = useRef("");          // current prompt string
  const [confirmClose, setConfirmClose] = useState(false);

  // ── close helpers ──────────────────────────────────────────────────────────
  const handleCloseClick   = ()  => setConfirmClose(true);
  const handleCancelClose  = ()  => setConfirmClose(false);
  const handleConfirmClose = ()  => { setConfirmClose(false); onClose?.(); };

  // ── main effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !terminalHostRef.current || !device) return undefined;

    let disposed = false;
    let teardown = () => {};

    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/xterm/css/xterm.css"),
      ]);

      if (disposed || !terminalHostRef.current) return;

      // ── build terminal ────────────────────────────────────────────────────
      const term = new Terminal({
        cursorBlink      : true,
        convertEol       : true,   // \n → \r\n so lines don't overwrite
        scrollback       : 2000,
        fontFamily       : '"Courier New", Consolas, monospace',
        fontSize         : 15,
        lineHeight       : 1.2,
        cursorStyle      : "block",
        theme: {
          background       : "#000000",
          foreground       : "#f5f5f5",
          cursor           : "#19ff19",
          cursorAccent     : "#19ff19",
          selectionBackground: "rgba(255,255,255,0.18)",
          black            : "#000000",
          brightBlack      : "#666666",
          red              : "#ff6b6b",
          brightRed        : "#ff8e8e",
          green            : "#00d700",
          brightGreen      : "#19ff19",
          yellow           : "#ffff5f",
          brightYellow     : "#ffff87",
          blue             : "#5f87ff",
          brightBlue       : "#87afff",
          magenta          : "#d787ff",
          brightMagenta    : "#ffafff",
          cyan             : "#5fffff",
          brightCyan       : "#87ffff",
          white            : "#d9d9d9",
          brightWhite      : "#ffffff",
        },
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(terminalHostRef.current);
      fit.fit();
      term.focus();
      termRef.current = term;

      // build initial prompt
      const pCfg = formatPrompt(null);
      promptRef.current = pCfg.prompt;
      cmdBufRef.current = "";
      interactiveRef.current = false;
      pendingRef.current = false;

      // show prompt
      term.write(promptRef.current);

      // ── helpers ───────────────────────────────────────────────────────────

      /** Write raw backend output to xterm — DO NOT add extra newlines here */
      const writeOutput = (raw) => {
        if (!raw) return;
        // xterm.js handles all ANSI/VT100 sequences natively when you just
        // call term.write().  Do NOT sanitise, strip, or add prefixes.
        term.write(raw);
      };

      /** Send a key/sequence directly to the backend (interactive mode). */
      const sendRaw = async (seq) => {
        if (!device.deviceIdentifier) return;
        try {
          const res = await sendTerminalCommand(device.deviceIdentifier, seq, true);
          const out = extractOutput(res);

          if (!out || out === "Timeout") return;

          // ── detect exit from interactive program ──────────────────────────
          // The backend returns the refreshed screen content.  If the final
          // visible line is a shell prompt, the TUI has exited.
          if (looksLikeShellPrompt(out)) {
            interactiveRef.current = false;
            // Write the full output (which includes the shell prompt the
            // backend echoed back).  Then write OUR local prompt on a new line
            // so the user knows we're back in normal mode.
            writeOutput(out);
            // move to new line and show our prompt
            term.write("\r\n" + promptRef.current);
            return;
          }

          // Still inside the TUI — just render whatever the backend sent.
          writeOutput(out);
        } catch (err) {
          console.error("sendRaw error", err);
          // Don't spam the terminal for every keystroke failure silently.
        }
      };

      /** Run a buffered command (after Enter). */
      const runCommand = async (raw) => {
        const cmd = raw.trim();

        if (!cmd) {
          term.write("\r\n" + promptRef.current);
          return;
        }

        // ── built-ins ───────────────────────────────────────────────────────
        if (cmd === "clear") {
          term.write("\u001b[2J\u001b[3J\u001b[H");
          term.write(promptRef.current);
          return;
        }
        if (cmd === "exit") { onClose?.(); return; }

        // ── backend call ────────────────────────────────────────────────────
        if (!device.deviceIdentifier) {
          term.write("\r\nDevice agent id is missing.\r\n" + promptRef.current);
          return;
        }

        // Detect whether this is an interactive TUI command BEFORE sending.
        const isTui = /^(nano|vim|vi|less|more|top|htop|man)\b/.test(cmd);
        if (isTui) interactiveRef.current = true;

        pendingRef.current = true;
        try {
          const res = await sendTerminalCommand(device.deviceIdentifier, cmd, false);
          const raw_out = extractOutput(res);

          if (!raw_out || raw_out === "Timeout") {
            // Nothing to show — just re-prompt (unless TUI, which will stream)
            if (!interactiveRef.current) {
              term.write("\r\n" + promptRef.current);
            }
            return;
          }

          if (isTui) {
            // The backend returns the initial screen of the TUI.
            // Write it straight — xterm will render the full-screen app.
            // NO extra \r\n prefix, NO stripping.
            writeOutput(raw_out);
            // Do NOT write a prompt — we're in TUI mode now.
          } else {
            // Strip echo of the command if the backend reflects it.
            const cleaned = stripEcho(raw_out, cmd);
            // Prefix with \r\n to move off the command line, then output.
            term.write("\r\n");
            writeOutput(cleaned);
            // After output, show prompt on a new line.
            // Check if output already ends with a newline.
            const endsWithNewline = /[\r\n]$/.test(cleaned);
            if (!endsWithNewline) term.write("\r\n");
            term.write(promptRef.current);
          }
        } catch (err) {
          term.write("\r\n" + (err?.message || "Command failed.") + "\r\n" + promptRef.current);
          interactiveRef.current = false;
        } finally {
          pendingRef.current = false;
        }
      };

      // ── ctrl-key handler ──────────────────────────────────────────────────
      term.attachCustomKeyEventHandler((ev) => {
        if (ev.type !== "keydown" || !ev.ctrlKey || ev.altKey || ev.metaKey) {
          return true; // let xterm handle it normally
        }

        const key = ev.key.toUpperCase();
        if (!/^[A-Z]$/.test(key)) return true;

        const seq = String.fromCharCode(key.charCodeAt(0) - 64); // Ctrl+A = \x01 etc.
        ev.preventDefault();

        if (seq === "\x03") {
          // Ctrl+C
          if (interactiveRef.current) {
            void sendRaw(seq);
          } else {
            cmdBufRef.current = "";
            term.write("^C\r\n" + promptRef.current);
          }
        } else if (seq === "\x04") {
          // Ctrl+D — EOF / quit
          void sendRaw(seq);
        } else if (seq === "\x1a") {
          // Ctrl+Z — suspend (just forward)
          void sendRaw(seq);
        } else {
          // All other Ctrl combos — forward to backend if in interactive mode
          if (interactiveRef.current) void sendRaw(seq);
        }

        return false; // prevent xterm default
      });

      // ── main data handler ─────────────────────────────────────────────────
      const dataSub = term.onData((data) => {
        if (!device.deviceIdentifier) return;

        // ── INTERACTIVE MODE (inside nano/vim/etc.) ────────────────────────
        // Every single keypress goes straight to the backend.  We do NOT
        // echo locally — the backend's PTY echo comes back in the response.
        if (interactiveRef.current) {
          void sendRaw(data);
          return;
        }

        // ── NORMAL (shell line-editing) MODE ──────────────────────────────

        if (data === "\r") {
          // Enter — submit buffered command
          const cmd = cmdBufRef.current;
          cmdBufRef.current = "";
          void runCommand(cmd);
          return;
        }

        if (data === "\u007f" || data === "\b") {
          // Backspace
          if (cmdBufRef.current.length > 0) {
            cmdBufRef.current = cmdBufRef.current.slice(0, -1);
            term.write("\b \b");
          }
          return;
        }

        if (data === "\t") {
          // Tab — could forward for completion, skip for now
          return;
        }

        // Arrow keys and other escape sequences in normal mode — ignore
        // (they start with ESC = \u001b)
        if (data.startsWith("\u001b")) return;

        // Printable character
        if (data >= " " && data !== "\u007f") {
          cmdBufRef.current += data;
          term.write(data); // local echo
        }
      });

      // ── resize handler ───────────────────────────────────────────────────
      const onResize = () => fit.fit();
      window.addEventListener("resize", onResize);

      // ── cleanup ──────────────────────────────────────────────────────────
      teardown = () => {
        dataSub.dispose();
        window.removeEventListener("resize", onResize);
        term.dispose();
        termRef.current = null;
        cmdBufRef.current = "";
        interactiveRef.current = false;
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, [device, onClose, open]);

  if (!open || !device) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,7,18,0.56)] px-3 py-4 backdrop-blur-[2px] sm:px-4 sm:py-5"
      onClick={onClose}
    >
      <div
        className="flex h-[min(78dvh,620px)] w-full max-w-[min(92vw,900px)] flex-col overflow-hidden rounded-[10px] border border-[#7ba9d8] bg-[#000000] shadow-[0_28px_70px_rgba(2,6,23,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-[#7ba9d8] bg-[#86b6e8] px-4 py-2">
          <div>
            <p className="font-['Poppins'] text-[14px] font-semibold text-[#08111f]">
              {device.name} SSH Console
            </p>
            <p className="text-[10px] text-[#163252]">Remote terminal session</p>
          </div>
          <button
            type="button"
            onClick={handleCloseClick}
            className="rounded border border-[#4e7aa8] bg-[#dcecff] px-2.5 py-1 text-[11px] font-medium text-[#163252] transition-colors hover:bg-[#c9e0fb]"
          >
            Close
          </button>
        </div>

        {/* status bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#163252] bg-[#050505] px-4 py-2 text-[10px] text-[#bbbbbb]">
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

        {/* terminal */}
        <div className="min-h-0 flex-1 bg-[#000000] p-0">
          <div
            ref={terminalHostRef}
            className="h-full w-full overflow-hidden bg-[#000000] p-2"
          />
        </div>
      </div>

      {/* confirm-close dialog */}
      {confirmClose && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(3,7,18,0.8)] backdrop-blur-[2px]"
          onClick={handleCancelClose}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-[10px] border border-[#7ba9d8] bg-[#0d1622] p-6 shadow-[0_28px_70px_rgba(2,6,23,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="font-['Poppins'] text-[16px] font-semibold text-[#e8ecf1]">
                Close Terminal?
              </h2>
              <p className="mt-2 text-[13px] text-[#a8aeb8]">
                Are you sure you want to close this terminal session?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelClose}
                className="flex-1 rounded border border-[#4e7aa8] bg-[#1a2942] px-4 py-2 text-[13px] font-medium text-[#86b6e8] transition-colors hover:bg-[#253a52]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="flex-1 rounded border border-[#d74646] bg-[#8b2c2c] px-4 py-2 text-[13px] font-medium text-[#ff8a8a] transition-colors hover:bg-[#a63c3c]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


