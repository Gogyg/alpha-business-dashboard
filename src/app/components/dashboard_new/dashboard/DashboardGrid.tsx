import { useState } from "react";
import { useDrop } from "react-dnd";
import { DraggableWidget } from "./DraggableWidget";
import type { Widget } from "../../types_new/widget";

interface DashboardGridProps {
  widgets: Widget[];
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void;
  onDeleteWidget: (id: string) => void;
  isEditing?: boolean;
}

export function DashboardGrid({
  widgets,
  onUpdateWidget,
  onDeleteWidget,
  isEditing = false,
}: DashboardGridProps) {
  const cellSize = 160;
  const gap = 24;
  const [activeId, setActiveId] = useState<string | null>(null);

  const [, drop] = useDrop({
    accept: "WIDGET",
  });

  const handleDrop = (id: string, x: number, y: number) => {
    onUpdateWidget(id, { position: { x, y } });
    setActiveId(null);
  };

  const handleResize = (id: string, width: number, height: number) => {
    onUpdateWidget(id, { size: { width, height } });
  };

  // Вычисляем размеры сетки на основе виджетов
  const maxRows = Math.max(
    3,
    ...widgets.map((w) => w.position.y + w.size.height)
  );

  return (
    <div
      ref={drop}
      className={`relative w-full mx-auto transition-all ${isEditing ? 'bg-white/[0.02] rounded-3xl p-4' : ''}`}
      style={{
        height: maxRows * (cellSize + gap),
        maxWidth: 4 * (cellSize + gap) + (isEditing ? 32 : 0),
      }}
    >
      {/* Grid background when editing */}
      {isEditing && (
        <div 
          className="absolute inset-4 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: `${cellSize + gap}px ${cellSize + gap}px`,
          }}
        />
      )}

      {widgets.map((widget) => (
        <DraggableWidget
          key={widget.id}
          widget={widget}
          allWidgets={widgets}
          onDrop={handleDrop}
          onResize={handleResize}
          onDelete={onDeleteWidget}
          onUpdate={onUpdateWidget}
          cellSize={cellSize}
          gap={gap}
          isDragging={activeId === widget.id}
          onDragStart={() => setActiveId(widget.id)}
          isEditing={isEditing}
        />
      ))}
    </div>
  );
}
