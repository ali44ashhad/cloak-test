import { memo } from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}

function ToggleSwitchBase({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? (checked ? "Active" : "Inactive")}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
        "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40",
        checked
          ? "bg-gradient-to-r from-brand-500 to-purple-500 shadow-glow"
          : "bg-gray-700",
        disabled && "opacity-50 cursor-not-allowed",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

export const ToggleSwitch = memo(ToggleSwitchBase);
