// Thin Dialog wrapper around ClipPreparationPanel — kept for the Queue
// "Continuer la préparation" path. The primary creation flow is now inline
// on the Create page (VodImportPage → ClipPreparationPanel).
import { Wand2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { ContentItem } from "@/hooks/useContentItems";
import ClipPreparationPanel from "./ClipPreparationPanel";

interface Props {
  item: ContentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunched: () => void;
}

const ClipGenerationDialog = ({ item, open, onOpenChange, onLaunched }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1100px]"
      >
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> Préparer le clip
          </DialogTitle>
          <DialogDescription>
            Source détectée. Ajuste la caméra et les sous-titres, puis lance la génération.
          </DialogDescription>
        </DialogHeader>
        <ClipPreparationPanel
          item={item}
          variant="dialog"
          onCancel={() => onOpenChange(false)}
          onLaunched={() => {
            onLaunched();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ClipGenerationDialog;
