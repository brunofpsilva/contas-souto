"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { useT } from "@/i18n/client";

/** List for seeing only one room's expenses. Choosing an option changes the address (?room=). */
export function RoomFilter({ value, options }: { value: string; options: { value: string; text: string; href: string }[] }) {
  const t = useT();
  const router = useRouter();
  return (
    <NativeSelect
      aria-label={t.expenses.filterByRoom}
      defaultValue={value}
      onChange={(e) => {
        const chosen = options.find((o) => o.value === e.target.value);
        if (chosen) router.push(chosen.href);
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.text}
        </option>
      ))}
    </NativeSelect>
  );
}
