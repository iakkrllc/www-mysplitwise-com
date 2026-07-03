"use client";

import { MessageCircle, Send, Link2, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

const SITE_URL = "https://mysplitwise.com";
const INVITE_MESSAGE = `Join me on mysplitwise — it makes splitting bills with friends effortless. ${SITE_URL}`;
const EMAIL_SUBJECT = "Join me on mysplitwise";
const EMAIL_BODY = `Hey!\n\nI've been using mysplitwise to split bills and track shared expenses with friends — thought you'd like it too.\n\n${SITE_URL}`;

export function InviteFriend({ className }: { className?: string }) {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(INVITE_MESSAGE)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${encodeURIComponent(
              "Join me on mysplitwise — split bills with friends, effortlessly.",
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Send className="h-3.5 w-3.5" /> Telegram
          </a>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <a
            href={`mailto:?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`}
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={copyLink}
        >
          <Link2 className="h-3.5 w-3.5" /> Copy link
        </Button>
      </div>
    </div>
  );
}
