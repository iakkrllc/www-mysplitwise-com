import type { LucideIcon } from "lucide-react";
import {
  Utensils,
  ShoppingCart,
  Wine,
  Home,
  Zap,
  Plane,
  Car,
  ShoppingBag,
  Film,
  HeartPulse,
  Gift,
  Receipt,
  Lightbulb,
  Wifi,
  Droplets,
  Fuel,
  Bus,
  Dumbbell,
  GraduationCap,
  PawPrint,
  Baby,
  Hammer,
  Ticket,
  Coffee,
  Banknote,
} from "lucide-react";

export interface Category {
  id: string;
  name: string;
  group: string;
  icon: LucideIcon;
  color: string;
}

export const CATEGORIES: Category[] = [
  // Uncategorized / general
  { id: "general", name: "General", group: "Uncategorized", icon: Receipt, color: "#8E9CA3" },
  { id: "payment", name: "Payment", group: "Uncategorized", icon: Banknote, color: "#5BC5A7" },

  // Food and drink
  { id: "dining", name: "Dining out", group: "Food and drink", icon: Utensils, color: "#FF8A5B" },
  { id: "groceries", name: "Groceries", group: "Food and drink", icon: ShoppingCart, color: "#7FB069" },
  { id: "liquor", name: "Liquor", group: "Food and drink", icon: Wine, color: "#B5654C" },
  { id: "coffee", name: "Coffee", group: "Food and drink", icon: Coffee, color: "#A9744F" },

  // Home
  { id: "rent", name: "Rent", group: "Home", icon: Home, color: "#5B8DC5" },
  { id: "utilities", name: "Utilities", group: "Home", icon: Zap, color: "#F2C14E" },
  { id: "electricity", name: "Electricity", group: "Home", icon: Lightbulb, color: "#F2C14E" },
  { id: "water", name: "Water", group: "Home", icon: Droplets, color: "#5BB6C5" },
  { id: "internet", name: "Internet", group: "Home", icon: Wifi, color: "#6C8AE4" },
  { id: "furniture", name: "Furniture", group: "Home", icon: Hammer, color: "#9C7B5A" },
  { id: "household", name: "Household supplies", group: "Home", icon: ShoppingBag, color: "#C58BBB" },

  // Transportation
  { id: "car", name: "Car", group: "Transportation", icon: Car, color: "#5B7CC5" },
  { id: "gas", name: "Gas/Fuel", group: "Transportation", icon: Fuel, color: "#E4694A" },
  { id: "transit", name: "Bus/Train", group: "Transportation", icon: Bus, color: "#5BA0C5" },

  // Entertainment
  { id: "entertainment", name: "Entertainment", group: "Entertainment", icon: Film, color: "#C566B5" },
  { id: "tickets", name: "Movies/Tickets", group: "Entertainment", icon: Ticket, color: "#B05BC5" },
  { id: "sports", name: "Sports", group: "Entertainment", icon: Dumbbell, color: "#5BC57F" },

  // Life
  { id: "travel", name: "Travel", group: "Life", icon: Plane, color: "#5BC5C0" },
  { id: "shopping", name: "Shopping", group: "Life", icon: ShoppingBag, color: "#E48FB4" },
  { id: "medical", name: "Medical", group: "Life", icon: HeartPulse, color: "#E45B6E" },
  { id: "gifts", name: "Gifts", group: "Life", icon: Gift, color: "#D65BB0" },
  { id: "education", name: "Education", group: "Life", icon: GraduationCap, color: "#5B86C5" },
  { id: "pets", name: "Pets", group: "Life", icon: PawPrint, color: "#B59A5B" },
  { id: "kids", name: "Childcare", group: "Life", icon: Baby, color: "#E4A85B" },
];

const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export function getCategory(id: string): Category {
  return CATEGORY_MAP[id] ?? CATEGORY_MAP.general;
}
