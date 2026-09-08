import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { TaskStatus } from '../types';
import { STATUS_LABEL, STATUS_OPTIONS } from '../types';

const statusStyles: Record<
  TaskStatus,
  { chip: string; dot: string; menuActive: string }
> = {
  not_started: {
    chip: 'bg-[#eef1f0] text-[#4a5c58] border-[#d5dedb]',
    dot: 'bg-[#8aa39c]',
    menuActive: 'bg-[#eef1f0]',
  },
  in_progress: {
    chip: 'bg-[#e3f8e8] text-[#147a3a] border-[#9fd9b0]',
    dot: 'bg-[#22a34a]',
    menuActive: 'bg-[#e3f8e8]',
  },
  pending_review: {
    chip: 'bg-[#fff4d6] text-[#8a6200] border-[#f0d48a]',
    dot: 'bg-[#e0a800]',
    menuActive: 'bg-[#fff4d6]',
  },
  completed: {
    chip: 'bg-[#e6f3f0] text-[#0f4a3f] border-[#9bc8bb]',
    dot: 'bg-[#1a6b5c]',
    menuActive: 'bg-[#e6f3f0]',
  },
  blocked: {
    chip: 'bg-[#fdece8] text-[#b84a32] border-[#f0b8ab]',
    dot: 'bg-[#e07a5f]',
    menuActive: 'bg-[#fdece8]',
  },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const style = statusStyles[status] ?? statusStyles.not_started;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${style.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: TaskStatus;
  onChange: (v: TaskStatus) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 160, openUp: false });

  const style = statusStyles[value] ?? statusStyles.not_started;

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    setPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 160),
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onReposition = () => updatePosition();

    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open]);

  if (disabled) return <StatusBadge status={value} />;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex min-w-[148px] cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-[0.98] ${style.chip}`}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
          {STATUS_LABEL[value]}
        </span>
        <ChevronDown
          size={14}
          className={`opacity-70 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            className="fixed z-[200] overflow-hidden rounded-lg border border-line bg-white py-1 shadow-xl"
            style={{
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp
                ? window.innerHeight - pos.top
                : undefined,
              left: pos.left,
              width: pos.width,
            }}
          >
            {STATUS_OPTIONS.map((o) => {
              const s = statusStyles[o.value];
              const active = o.value === value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition hover:bg-fog ${
                      active ? s.menuActive : ''
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className={active ? 'font-semibold' : ''}>
                      {o.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
