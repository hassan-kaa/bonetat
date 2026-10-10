"use client";

import Link from "next/link";
import type { ConditionGrade } from "@prisma/client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import GradingContent from "./GradingContent";

/**
 * The grading standard as a modal, for the product page: the buyer reads it without
 * losing their configuration. Everywhere else, links go to the full /grading page.
 */
export default function GradingDialog({ current }: { current?: ConditionGrade }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="text-[13px] text-brand hover:underline">Comment on note l’état</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-[28px] bg-chalk shadow-lift sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-[min(880px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px]">
          <div className="flex items-start justify-between gap-4 border-b border-line bg-white px-6 py-5">
            <div>
              <Dialog.Title className="text-[22px] font-semibold tracking-[-0.02em]">Quatre états, une seule grille</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-muted">
                Chaque appareil est noté avec la même grille, quel que soit l’atelier. L’état décrit l’aspect ; la batterie est mesurée à part.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Fermer" className="grid h-10 w-10 flex-none place-items-center rounded-full hover:bg-chalk">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="flex flex-col gap-8 overflow-y-auto px-6 py-6">
            <GradingContent compact current={current} />
            <Link href="/grading" className="self-start text-sm font-medium text-brand hover:underline">Ouvrir la page complète</Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
