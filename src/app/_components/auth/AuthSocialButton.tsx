import type { ButtonHTMLAttributes, ReactNode } from "react";

type AuthSocialButtonProps = {
  icon?: ReactNode;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function AuthSocialButton({ icon, children, className = "", ...props }: AuthSocialButtonProps) {
  return (
    <button
      {...props}
      className={`h-[52px] w-full rounded-[10px] border border-[#d6d8db] bg-white px-6 text-[#1f2937] transition-colors hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-65 ${className}`}
    >
      <span className="mx-auto flex max-w-[250px] items-center justify-center gap-3 text-[16px] leading-none">
        {icon ? <span className="flex h-5 w-5 items-center justify-center">{icon}</span> : null}
        <span className="text-[16px] leading-none">{children}</span>
      </span>
    </button>
  );
}
