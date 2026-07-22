import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof InputOTP> = {
  title: "Components/Forms/Input OTP",
  component: InputOTP,
  tags: ["autodocs"],
  argTypes: {
    ...common("value", "disabled", "className"),
    maxLength: prop("Nombre de caractères du code — définit le nombre de cellules.", { control: "number", category: CAT.state }),
    pattern: prop("Expression régulière filtrant les caractères acceptés (chiffres seuls, alphanumérique…).", { control: "text", category: CAT.state }),
    onChange: prop("Appelé à chaque frappe, avec le code saisi jusqu'ici.", { control: false, category: CAT.events }),
    onComplete: prop("Appelé une fois la dernière cellule remplie — c'est là qu'on valide.", { control: false, category: CAT.events }),
    containerClassName: prop("Classes du conteneur des cellules, distinct du champ lui-même.", { control: false, category: CAT.advanced }),
  },
  parameters: {
    layout: "centered",
    docs: { description: { component: "Input OTP — saisie d'un code à usage unique (2FA, vérification). Chaque cellule est un slot ; le champ porte un nom accessible via `Label`." } },
  },
};
export default meta;
type S = StoryObj<typeof InputOTP>;

const SixDigits = () => {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-2">
      <Label htmlFor="otp">Code de vérification</Label>
      <InputOTP id="otp" maxLength={6} value={value} onChange={setValue}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
};

export const Default: S = { render: () => <SixDigits /> };
