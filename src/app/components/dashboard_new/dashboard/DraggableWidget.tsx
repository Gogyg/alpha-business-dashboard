import { useRef, useState } from "react";
import { useDrag } from "react-dnd";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { X, GripVertical, Settings } from "lucide-react";
import type { Widget } from "../../types_new/widget";
import { WidgetContent } from "./WidgetContent";
import { WidgetEditor } from "./WidgetEditor";

interface DraggableWidgetProps {
  widget: Widget;
  allWidgets: Widget[];
  onDrop: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Widget>) => void;
  cellSize: number;
  gap: number;
  isDragging: boolean;
  onDragStart: () => void;
  isEditing?: boolean;
}

export function DraggableWidget({
  widget,
  allWidgets,
  onDrop,
  onResize,
  onDelete,
  onUpdate,
  cellSize,
  gap,
  isDragging,
  onDragStart,
  isEditing = false,
}: DraggableWidgetProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const [{ isDraggingState }, drag, preview] = useDrag({
    type: "WIDGET",
    canDrag: isEditing,
    item: () => {
      onDragStart();
      return { id: widget.id };
    },
    end: (item, monitor) => {
      const offset = monitor.getSourceClientOffset();
      if (offset && widgetRef.current) {
        const parent = widgetRef.current.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const relativeX = offset.x - parentRect.left;
          const relativeY = offset.y - parentRect.top;

          const gridX = Math.round(relativeX / (cellSize + gap));
          const gridY = Math.round(relativeY / (cellSize + gap));

          onDrop(widget.id, Math.max(0, gridX), Math.max(0, gridY));
        }
      }
    },
    collect: (monitor) => ({
      isDraggingState: monitor.isDragging(),
    }),
  });

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = widget.size.width;
    const startHeight = widget.size.height;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newWidth = Math.max(
        1,
        Math.round(startWidth + deltaX / (cellSize + gap))
      );
      const newHeight = Math.max(
        1,
        Math.round(startHeight + deltaY / (cellSize + gap))
      );

      onResize(widget.id, newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const width = widget.size.width * cellSize + (widget.size.width - 1) * gap;
  const height = widget.size.height * cellSize + (widget.size.height - 1) * gap;

  return (
    <div
      ref={widgetRef}
      style={{
        position: "absolute",
        left: widget.position.x * (cellSize + gap),
        top: widget.position.y * (cellSize + gap),
        width,
        height,
        opacity: isDraggingState ? 0.5 : 1,
        cursor: isEditing ? (isDragging ? "grabbing" : "grab") : "default",
        transition: isDraggingState ? "none" : "all 0.2s ease-out",
        zIndex: isDraggingState ? 100 : 1,
      }}
      className="group"
    >
      <Card className="h-full flex flex-col bg-white/5 border-white/10 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl">
        {/* Header (only when editing) */}
        {isEditing && (
          <div
            ref={drag}
            className="flex items-center justify-between p-3 border-b border-white/10 cursor-grab active:cursor-grabbing bg-white/5"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-white truncate max-w-[150px]">{widget.title}</h4>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-white"
                onClick={() => setIsEditingModalOpen(true)}
              >
                <Settings className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => onDelete(widget.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {!isEditing && widget.title && (
            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wide">{widget.title}</h3>
          )}
          <WidgetContent
            widget={widget}
            allWidgets={allWidgets}
            isEditing={isEditing}
            onUpdate={(data) => onUpdate(widget.id, { data })}
          />
        </div>

        {/* Resize handle (only when editing) */}
        {isEditing && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1"
            onMouseDown={handleResizeStart}
          >
            <div className="w-3 h-3 border-r-2 border-b-2 border-[#34d399]/50 rounded-br-sm" />
          </div>
        )}
      </Card>

      <WidgetEditor
        widget={widget}
        isOpen={isEditingModalOpen}
        onClose={() => setIsEditingModalOpen(false)}
        onSave={(updates) => onUpdate(widget.id, updates)}
      />
    </div>
  );
}
