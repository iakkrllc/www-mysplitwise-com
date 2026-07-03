"use client";

import { Wallet, ExternalLink, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { useUI } from "@/lib/ui-store";
import { payOptionsFor } from "@/lib/payment-links";
import type { User } from "@/lib/types";

export function PayMenu({
  payee,
  amount,
  note,
  size = "default",
}: {
  payee: User;
  amount: number;
  note: string;
  size?: "default" | "sm";
}) {
  const { openModal } = useUI();
  const options = payOptionsFor(payee, amount, note);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className="gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Wallet className="h-3.5 w-3.5" /> Pay
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>mysplitwise Pay</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <DropdownMenuItem
            onClick={() => openModal({ kind: "paymentInfo", userId: payee.id })}
          >
            <Settings2 className="mr-2 h-4 w-4" /> Add {payee.name.split(" ")[0]}
            &apos;s payment info
          </DropdownMenuItem>
        ) : (
          <>
            {options.map((opt) => (
              <DropdownMenuItem key={opt.label} asChild>
                <a href={opt.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> {opt.label}
                </a>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => openModal({ kind: "paymentInfo", userId: payee.id })}
            >
              <Settings2 className="mr-2 h-4 w-4" /> Edit payment info
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
