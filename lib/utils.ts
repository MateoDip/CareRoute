import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Une clases de Tailwind resolviendo conflictos (`px-2` + `px-4` → `px-4`). Lo usan los componentes de shadcn. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
