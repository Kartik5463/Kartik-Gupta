import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  bootLines,
  complete,
  runCommand,
  type TermContext,
  type TermEffect,
  type TermLine,
} from "./engine";

const PROMPT = "kartik@space:~$";
const MAX_LINES = 400;

interface Shown extends TermLine {
  id: number;
  /** The echoed command, drawn with the prompt in front of it. */
  command?: boolean;
}

interface TerminalProps {
  /** Read fresh for every command, so live data and the clock are current. */
  getContext: () => TermContext;
  onEffect: (effect: TermEffect) => void;
  intro?: TermLine[];
  /** Focus the input as soon as it mounts — for the drop-down console. */
  autoFocus?: boolean;
  className?: string;
}

/**
 * An interactive shell. The commands live in engine.ts; this owns the screen,
 * input, history and tab completion, and hands effects (fly to a planet, open
 * a link…) to the page to carry out.
 */
export function Terminal({ getContext, onEffect, intro, autoFocus, className }: TerminalProps) {
  const nextId = useRef(0);
  const tag = useCallback(
    (lines: TermLine[], command = false): Shown[] =>
      lines.map((l) => ({ ...l, id: nextId.current++, command })),
    [],
  );
  const [lines, setLines] = useState<Shown[]>(() => tag(intro ?? bootLines()));
  const [input, setInput] = useState("");
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);
  const screen = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (autoFocus) field.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // Keep the newest output in view.
  useLayoutEffect(() => {
    const el = screen.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const print = useCallback((more: Shown[]) => {
    setLines((prev) => [...prev, ...more].slice(-MAX_LINES));
  }, []);

  const submit = (value: string) => {
    const typed = value.trim();
    const echoed = tag([{ text: value }], true);
    if (typed) {
      history.current = [...history.current.filter((h) => h !== typed), typed].slice(-50);
    }
    cursor.current = -1;
    setInput("");

    const result = runCommand(value, getContext());
    const cleared = result.effects.some((e) => e.type === "clear");
    if (cleared) setLines([]);
    else print([...echoed, ...tag(result.lines)]);
    for (const e of result.effects) if (e.type !== "clear") onEffect(e);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(input);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const h = history.current;
      if (!h.length) return;
      e.preventDefault();
      let i = cursor.current === -1 ? h.length : cursor.current;
      i = e.key === "ArrowUp" ? Math.max(0, i - 1) : i + 1;
      if (i >= h.length) {
        cursor.current = -1;
        setInput("");
      } else {
        cursor.current = i;
        setInput(h[i]!);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const c = complete(input, getContext());
      setInput(c.value);
      if (c.options.length > 1) {
        print([
          ...tag([{ text: input }], true),
          ...tag([{ text: c.options.join("   "), tone: "muted" }]),
        ]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === "Escape") {
      onEffect({ type: "close" });
    }
  };

  return (
    // Clicking anywhere on the screen puts you back at the prompt. Keyboard
    // users are already there, so this is a pointer convenience only.
    <div
      className={`term ${className ?? ""}`}
      onClick={() => field.current?.focus({ preventScroll: true })}
    >
      <div
        ref={screen}
        className="term__screen"
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
      >
        {lines.map((l) => (
          <p
            key={l.id}
            className={`term__line term__line--${l.command ? "cmd" : (l.tone ?? "out")}`}
          >
            {l.command && <span className="term__prompt">{PROMPT} </span>}
            {l.href ? (
              <a
                href={l.href}
                target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
              >
                {l.text}
              </a>
            ) : (
              l.text || " "
            )}
          </p>
        ))}
      </div>
      <form
        className="term__input"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <label htmlFor={inputId} className="term__prompt">
          {PROMPT}
          <span className="sr-only"> type a command</span>
        </label>
        <input
          id={inputId}
          ref={field}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
        />
      </form>
    </div>
  );
}

interface ConsoleProps {
  open: boolean;
  onClose: () => void;
  getContext: () => TermContext;
  onEffect: (effect: TermEffect) => void;
}

/**
 * The drop-down console: press ` (or Ctrl+K) anywhere to open it. Mounted only
 * while open, so each session boots fresh. Focus goes back where it was when
 * it closes.
 */
export function TerminalConsole({ open, onClose, getContext, onEffect }: ConsoleProps) {
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    return () => returnTo.current?.focus?.({ preventScroll: true });
  }, [open]);

  if (!open) return null;
  return (
    <div className="term-console" role="dialog" aria-modal="true" aria-label="Terminal">
      <div className="term-console__panel">
        <div className="term-console__bar">
          <span className="term-console__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>KARTIK·OS — terminal</span>
          <button type="button" onClick={onClose} className="term-console__close">
            Close <kbd>Esc</kbd>
          </button>
        </div>
        <Terminal getContext={getContext} onEffect={onEffect} autoFocus className="term--console" />
      </div>
      {/* The dimmed page below the console closes it, like clicking outside a modal. */}
      <button
        type="button"
        className="term-console__backdrop"
        aria-label="Close terminal"
        onClick={onClose}
      />
    </div>
  );
}
