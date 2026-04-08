import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import type { Widget } from "../../types/widget";

interface WidgetEditorProps {
  widget: Widget;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Widget>) => void;
}

export function WidgetEditor({ widget, isOpen, onClose, onSave }: WidgetEditorProps) {
  const [title, setTitle] = useState(widget.title);
  const [data, setData] = useState(JSON.stringify(widget.data, null, 2));

  const handleSave = () => {
    try {
      const parsedData = JSON.parse(data);
      onSave({ title, data: parsedData });
      onClose();
    } catch (error) {
      alert("Ошибка в формате JSON данных");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Редактировать виджет</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название виджета"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">Данные (JSON)</Label>
            <textarea
              id="data"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full h-64 p-3 border rounded-md font-mono text-sm"
              placeholder="Введите данные в формате JSON"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
