import { ButtonHTMLAttributes } from "react";

interface Props
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({
  children,
  className = "",
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2 font-medium transition ${className}`}
    >
      {children}
    </button>
  );
}