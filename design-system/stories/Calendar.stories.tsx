import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { Calendar } from "@/components/ui/calendar";

type Args = { numberOfMonths: number; showOutsideDays: boolean };

const meta: Meta<Args> = {
  title: "Components/Forms/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  args: { numberOfMonths: 1, showOutsideDays: true },
  argTypes: {
    numberOfMonths: { control: { type: "number", min: 1, max: 3 }, description: "Nombre de mois affichés.", table: { category: "Layout" } },
    showOutsideDays: { control: "boolean", description: "Afficher les jours des mois adjacents.", table: { category: "Appearance" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Calendar — sélecteur de date (react-day-picker), base des filtres par période. Généralement monté dans un Popover." } },
  },
  render: (args) => {
    const [date, setDate] = useState<Date | undefined>(new Date(2026, 6, 16));
    return <Calendar mode="single" selected={date} onSelect={setDate} numberOfMonths={args.numberOfMonths} showOutsideDays={args.showOutsideDays} className="rounded-lg border border-border" />;
  },
};
export default meta;
type S = StoryObj<Args>;

/** Exploration libre (`numberOfMonths`, `showOutsideDays`). */
export const Playground: S = {};

/** Test : sélectionner une date met à jour la sélection. */
export const SelectionDate: S = {
  parameters: { controls: { disable: true } },
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date(2026, 6, 16));
    return (
      <div className="space-y-2">
        <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-lg border border-border" />
        <p className="text-sm text-muted-foreground">Sélection : {date ? date.getDate() : "aucune"}</p>
      </div>
    );
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText(/sélection : 16/i)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("gridcell", { name: "22" }));
    await expect(canvas.getByText(/sélection : 22/i)).toBeInTheDocument();
  },
};
