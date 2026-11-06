
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const shortcuts = [
    { keys: ["Cmd", "K"], description: "Open command palette" },
    { keys: ["Cmd", "/"], description: "Focus search" },
    { keys: ["Esc"], description: "Close dialogs" },
    { keys: ["?"], description: "Show keyboard shortcuts" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shortcut</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shortcuts.map((shortcut, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, i) => (
                      <Badge key={i} variant="outline" className="font-mono">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{shortcut.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
