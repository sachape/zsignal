import { useForm } from "react-hook-form";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Form> = {
  title: "Components/Forms/Form",
  component: Form,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: { description: { component: "Form — intégration react-hook-form + composants DS. Chaque champ câble `FormLabel`/`FormControl`/`FormMessage` (label lié, erreurs annoncées via `aria-describedby`)." } },
  },
};
export default meta;
type S = StoryObj<typeof Form>;

const DemoForm = () => {
  const form = useForm<{ channel: string }>({ defaultValues: { channel: "" } });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})} className="w-[320px] space-y-4">
        <FormField
          control={form.control}
          name="channel"
          rules={{ required: "Le nom de chaîne est requis." }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chaîne Twitch</FormLabel>
              <FormControl><Input placeholder="ex. streamnco" {...field} /></FormControl>
              <FormDescription>Sans le @, tel qu'affiché sur Twitch.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Connecter</Button>
      </form>
    </Form>
  );
};

export const Default: S = { render: () => <DemoForm /> };
