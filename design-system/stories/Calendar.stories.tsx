import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";

/**
 * Calendar — le sélecteur de date (react-day-picker), base des filtres par
 * période. Généralement monté dans un Popover ; montré seul ici.
 */
const meta: Meta<typeof Calendar> = {
  title: "Primitives/Calendar",
  component: Calendar,
  parameters: { controls: { disable: true }, docs: { description: { component: "Calendar — le sélecteur de date (react-day-picker), base des filtres par période. Généralement monté dans un Popover ; montré seul ici." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Calendar>;

export const Simple: S = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date(2026, 6, 16));
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-lg border border-border"
      />
    );
  },
};
