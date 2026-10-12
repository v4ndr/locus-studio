"use client";
import { useSetCounts } from "@/store/studio";
export function PatientsCounts({ inbox, proposals }: { inbox: number; proposals: number }) {
  useSetCounts(inbox, proposals);
  return null;
}
