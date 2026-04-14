import type { CartItem } from "@/types/cart";

const CART_STORAGE_KEY = "hakuna_cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as CartItem[];
    return parsed.map((item) => ({ ...item, quantity: 1 }));
  } catch {
    return [];
  }
}

export function setCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(items.map((item) => ({ ...item, quantity: 1 })))
  );
}

export function clearCart(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_STORAGE_KEY);
}
