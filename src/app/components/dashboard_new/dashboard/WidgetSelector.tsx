import { Card } from "../ui/card";
import {
  Table,
  TrendingUp,
} from "lucide-react";

const widgetTemplates = [
  {
    type: "table-widget",
    title: "Таблица данных",
    description: "Таблица с возможностью добавления строк (аналог SCORE-КАРТЫ)",
    icon: Table,
    defaultSize: { width: 3, height: 2 },
  },
  {
    type: "metric-simple",
    title: "Простая метрика",
    description: "Виджет eNPS или Visibility (Факт/План)",
    icon: TrendingUp,
    defaultSize: { width: 1, height: 1 },
  },
];

interface WidgetSelectorProps {
  onSelect: (widget: any) => void;
}

export function WidgetSelector({ onSelect }: WidgetSelectorProps) {
  const handleSelect = (template: any) => {
    const newWidget = {
      id: `widget-${Date.now()}`,
      type: template.type,
      title: "Новый виджет",
      position: { x: 0, y: 0 },
      size: template.defaultSize,
      data: getDefaultData(template.type),
    };
    onSelect(newWidget);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      {widgetTemplates.map((template) => (
        <Card
          key={template.type}
          className="p-6 cursor-pointer bg-white/[0.03] border-white/10 hover:bg-white/10 hover:border-[#34d399]/50 transition-all hover:-translate-y-1 rounded-3xl"
          onClick={() => handleSelect(template)}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#34d399]/10 flex items-center justify-center border border-[#34d399]/20">
              <template.icon className="w-8 h-8 text-[#34d399]" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white mb-2">{template.title}</h4>
              <p className="text-sm text-gray-500 max-w-[200px]">
                {template.description}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function getDefaultData(type: string) {
  switch (type) {
    case "table-widget":
      return {
        metrics: [
          { id: 1, name: "", weight: "20 %", fact: 0, type: "=", plan: 0, maxPercent: "∞", percent: "0 %" }
        ],
      };
    case "metric-simple":
      return { value: 0, plan: 85 };
    default:
      return {};
  }
}
