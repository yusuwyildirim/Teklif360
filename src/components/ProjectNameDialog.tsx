import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ProjectNameDialogProps {
  open: boolean;
  onConfirm: (projectName: string) => void;
  defaultName?: string;
}

export const ProjectNameDialog = ({
  open,
  onConfirm,
  defaultName = "",
}: ProjectNameDialogProps) => {
  const [projectName, setProjectName] = useState(defaultName);

  const handleConfirm = () => {
    const trimmedName = projectName.trim();
    if (trimmedName) {
      onConfirm(trimmedName);
      setProjectName(""); // Reset for next time
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>İşlem Adı Belirleyin</DialogTitle>
          <DialogDescription>
            Bu işlem için bir ad girin. Excel dosyası bu isimle kaydedilecektir.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">İşlem Adı</Label>
            <Input
              id="project-name"
              placeholder="Örn: Okul Tadilat Projesi"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={!projectName.trim()}
            className="w-full"
          >
            Devam Et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
