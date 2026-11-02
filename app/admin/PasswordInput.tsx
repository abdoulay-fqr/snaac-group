"use client";

import { ComponentProps, useState } from "react";

type PasswordInputProps = Omit<ComponentProps<"input">, "type">;

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.9 3.9" />
      <path d="M6.6 6.6A17.2 17.2 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export default function PasswordInput({ className = "", ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Masquer le mot de passe" : "Afficher le mot de passe";

  return (
    <div className="relative">
      {/* ::-ms-reveal : Edge ajouterait son propre oeil a cote de celui-ci. */}
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className={`${className} pr-10 [&::-ms-reveal]:hidden`}
      />
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setVisible(!visible)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded text-gray-500 hover:text-brand transition-colors cursor-pointer"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
