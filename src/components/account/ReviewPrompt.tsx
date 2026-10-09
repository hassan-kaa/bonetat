"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inline 5-star rating + optional comment for a delivered item */
export default function ReviewPrompt({ orderItemId }: { orderItemId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function send() {
    setState("sending");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId, rating, comment: comment || undefined }),
    });
    if (res.ok) {
      setState("done");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "La note n’a pas été envoyée");
      setState("error");
    }
  }

  if (state === "done") return <p className="text-[15px] text-gain">Merci, votre note de {rating} sur 5 est publiée.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3.5">
        <span className="flex-[1_1_200px] text-[15px]">Comment s’est passé cet achat ?</span>
        <div role="radiogroup" aria-label="Note sur 5" className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} sur 5`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className={cn("grid h-10 w-10 place-items-center", n <= (hover || rating) ? "text-[#F2A516]" : "text-line-strong")}
            >
              <Star className="h-7 w-7" fill="currentColor" />
            </button>
          ))}
        </div>
      </div>
      {rating > 0 && (
        <div className="flex flex-col gap-2.5">
          <textarea
            className="input"
            rows={2}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Un mot sur l’état, la livraison, le service (facultatif)"
            aria-label="Votre avis"
          />
          {state === "error" && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
          <button type="button" onClick={send} disabled={state === "sending"} className="btn-primary btn-sm self-start">
            {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publier ma note"}
          </button>
        </div>
      )}
    </div>
  );
}
