"use client";

import { useState, useRef, useCallback, type ReactNode, type ButtonHTMLAttributes } from "react";

interface ClickSpark {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  hue: number;
  size: number;
}

interface SmolderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "forge" | "ghost" | "danger" | "muted";
  sparkCount?: number;
  /** Idle glow and smoke. Reserved for the main strike buttons. */
  ambient?: boolean;
}

export default function SmolderButton({
  children,
  variant = "forge",
  sparkCount = 16,
  ambient = false,
  className = "",
  disabled,
  onClick,
  ...rest
}: SmolderButtonProps) {
  const [sparks, setSparks] = useState<ClickSpark[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const sparkIdRef = useRef(0);

  const spawnSparks = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const newSparks: ClickSpark[] = [];
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.3;
        const dist = 30 + Math.random() * 40;
        newSparks.push({
          id: sparkIdRef.current++,
          x: cx,
          y: cy,
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist - 12,
          hue: 15 + Math.random() * 35,
          size: 1.5 + Math.random() * 2.5,
        });
      }
      setSparks((prev) => [...prev, ...newSparks]);
      setTimeout(() => {
        setSparks((prev) => prev.filter((s) => !newSparks.find((n) => n.id === s.id)));
      }, 500);
    },
    [sparkCount],
  );

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (disabled) return;
    spawnSparks(e);
    onClick?.(e);
  }

  const variantStyles: Record<string, string> = {
    forge: `relative min-h-8 overflow-hidden text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40`,
    ghost: `relative min-h-8 overflow-hidden text-zinc-300 hover:text-white hover:bg-white/5 transition disabled:cursor-not-allowed disabled:opacity-40`,
    danger: `relative min-h-8 min-w-8 overflow-hidden text-red-300 hover:text-red-200 hover:bg-red-500/15 transition disabled:cursor-not-allowed disabled:opacity-40`,
    muted: `relative min-h-8 overflow-hidden text-zinc-300 hover:text-white hover:bg-white/10 transition disabled:cursor-not-allowed disabled:opacity-40`,
  };

  const fullWidth = /(^|\s)w-full(\s|$)/.test(className);

  const variantBg: Record<string, React.CSSProperties> = {
    forge: {
      background: "linear-gradient(180deg, #d94f00 0%, #b83200 100%)",
      boxShadow: ambient
        ? "0 0 20px rgba(255,80,0,0.3), inset 0 1px 0 rgba(255,200,100,0.2)"
        : "inset 0 1px 0 rgba(255,200,100,0.2)",
    },
    ghost: {
      background: "transparent",
      boxShadow: "none",
    },
    danger: {
      background: "transparent",
      boxShadow: "none",
    },
    muted: {
      background: "rgba(255,255,255,0.05)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    },
  };

  return (
    <div className={fullWidth ? "relative flex w-full" : "relative inline-flex shrink-0"}>
      {ambient && (
        <>
          <div
            className="pointer-events-none absolute -inset-1 animate-pulse opacity-60"
            style={{
              background: "radial-gradient(ellipse at center, rgba(255,120,20,0.3) 0%, transparent 70%)",
              animationDuration: "2s",
            }}
          />
          {/* Rising smoke */}
          <div className="pointer-events-none absolute -top-12 left-0 right-0 h-12 overflow-hidden">
            <span className="smoke-p" style={{ left: "20%", animationDelay: "0s" }} />
            <span className="smoke-p" style={{ left: "50%", animationDelay: "1s" }} />
            <span className="smoke-p" style={{ left: "80%", animationDelay: "2s" }} />
            <span className="smoke-p" style={{ left: "35%", animationDelay: "0.5s" }} />
            <span className="smoke-p" style={{ left: "65%", animationDelay: "1.5s" }} />
          </div>
        </>
      )}

      <button
        ref={btnRef}
        onClick={handleClick}
        disabled={disabled}
        className={`${variantStyles[variant]} ${className}`}
        style={variantBg[variant]}
        {...rest}
      >

        <span className="relative z-10">{children}</span>
      </button>

      {/* Click sparks */}
      {sparks.map((s) => (
        <span
          key={s.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            background: `hsl(${s.hue}, 100%, 70%)`,
            boxShadow: `0 0 ${s.size * 2}px hsl(${s.hue}, 100%, 60%)`,
            animation: "spark-fly 0.45s ease-out forwards",
            "--tx": `${s.tx}px`,
            "--ty": `${s.ty}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
