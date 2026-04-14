import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useOutletContext, useParams } from "react-router";
import { Loader2, Plus, Trash2, X, Save } from "lucide-react";
import { menuAPI } from "../utils/api";
import { PasswordModal } from "../components/PasswordModal";
import { motion, useDragControls } from "framer-motion";

interface OutletContext {
  isEditingMode: boolean;
  setIsEditingMode: (value: boolean) => void;
}

type WidgetTemplateId = "voc" | "stability";
type SingleAlignment = "left" | "center" | "right";
type MetricType = "=" | ">=" | "<=" | ">" | "<";
type DragOverTarget =
  | { kind: "section"; sectionId: string }
  | { kind: "widget"; sectionId: string; widgetId: string }
  | { kind: "alignment"; sectionId: string; widgetId: string; alignment: SingleAlignment }
  | null;

interface PointerLikeEvent {
  clientX?: number;
  clientY?: number;
  touches?: Array<{ clientX: number; clientY: number }>;
  changedTouches?: Array<{ clientX: number; clientY: number }>;
}

interface VocItem {
  id: string;
  label: string;
  value: number;
}

interface StabilityMetric {
  id: string;
  name: string;
  weight: string;
  fact: number;
  plan: number;
  type: MetricType;
  maxPercent: string;
}

interface VocWidget {
  id: string;
  templateId: "voc";
  title: string;
  nib: number;
  range: string;
  items: VocItem[];
  alignment: SingleAlignment;
}

interface StabilityWidget {
  id: string;
  templateId: "stability";
  title: string;
  metrics: StabilityMetric[];
}

type SandboxWidget = VocWidget | StabilityWidget;

interface SectionItem {
  id: string;
  title: string;
  widgets: SandboxWidget[];
}

interface PageLayout {
  sections: SectionItem[];
}

interface MenuPayload {
  items?: any[];
  customPages?: Array<{ id: string; label: string; hidden?: boolean; order?: number }>;
  customPageLayouts?: Record<string, PageLayout>;
}

const createVocWidget = (): VocWidget => ({
  id: crypto.randomUUID(),
  templateId: "voc",
  title: "Название",
  nib: 0,
  range: "0-0",
  alignment: "left",
  items: [
    { id: crypto.randomUUID(), label: "Название", value: 0 },
    { id: crypto.randomUUID(), label: "Название", value: 0 },
    { id: crypto.randomUUID(), label: "Название", value: 0 },
  ],
});

const createStabilityMetric = (): StabilityMetric => ({
  id: crypto.randomUUID(),
  name: "Название",
  weight: "0 %",
  fact: 0,
  plan: 0,
  type: "=",
  maxPercent: "∞",
});

const createStabilityWidget = (): StabilityWidget => ({
  id: crypto.randomUUID(),
  templateId: "stability",
  title: "Название",
  metrics: [createStabilityMetric()],
});

const createDefaultLayout = (): PageLayout => ({ sections: [] });
const VOC_TEMPLATE_PREVIEW: VocWidget = {
  id: "voc-preview",
  templateId: "voc",
  title: "Название",
  nib: 0,
  range: "0-0",
  alignment: "left",
  items: [
    { id: "voc-preview-1", label: "Название", value: 0 },
    { id: "voc-preview-2", label: "Название", value: 0 },
    { id: "voc-preview-3", label: "Название", value: 0 },
  ],
};
const STABILITY_TEMPLATE_PREVIEW: StabilityWidget = {
  id: "stability-preview",
  templateId: "stability",
  title: "Название",
  metrics: [createStabilityMetric()],
};
const PRIMARY_ACTION_CLASS =
  "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/50 shadow-lg shadow-emerald-500/30 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl";

const parseMaxPercent = (value: string) => {
  if (!value || value === "∞") return Infinity;
  const numeric = parseFloat(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : Infinity;
};

const calculateMetricPercent = (metric: StabilityMetric) => {
  const fact = Number(metric.fact) || 0;
  const plan = Number(metric.plan) || 0;
  if (plan <= 0 && fact <= 0) return 0;
  if (plan <= 0) return 0;

  let rawPercent = 0;
  if (metric.type === "<=" || metric.type === "<") {
    rawPercent = fact > 0 ? (plan / fact) * 100 : 100;
  } else {
    rawPercent = (fact / plan) * 100;
  }
  const cappedPercent = Math.min(rawPercent, parseMaxPercent(metric.maxPercent));
  return Number.isFinite(cappedPercent) ? Math.max(cappedPercent, 0) : 0;
};

const formatPercent = (value: number) => `${value.toFixed(1).replace(".", ",")} %`;

export function WorkspacePage() {
  const { pageId } = useParams();
  const { isEditingMode, setIsEditingMode } = useOutletContext<OutletContext>();
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<PageLayout>(createDefaultLayout());
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string>("");
  const [draggedWidget, setDraggedWidget] = useState<{ sectionId: string; widgetId: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<DragOverTarget>(null);
  const [dropPulseWidgetId, setDropPulseWidgetId] = useState<string | null>(null);
  const baseLayoutRef = useRef<PageLayout>(createDefaultLayout());
  const dragPreviewTargetRef = useRef<string>("");
  const dropPulseTimerRef = useRef<number | null>(null);

  const load = async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const payload = (await menuAPI.get()) || {};
      const normalized: MenuPayload = payload?.items ? payload : { items: payload };
      const saved = normalized.customPageLayouts?.[pageId];
      const nextLayout = saved?.sections ? saved : createDefaultLayout();
      setLayout(nextLayout);
      baseLayoutRef.current = JSON.parse(JSON.stringify(nextLayout));
    } catch (err) {
      console.error("Failed to load workspace page:", err);
      const defaultLayout = createDefaultLayout();
      setLayout(defaultLayout);
      baseLayoutRef.current = JSON.parse(JSON.stringify(defaultLayout));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pageId]);

  useEffect(() => {
    if (isEditingMode && !isEditing) {
      setIsPasswordModalOpen(true);
    } else if (!isEditingMode) {
      setIsEditing(false);
    }
  }, [isEditingMode, isEditing]);

  const sections = useMemo(() => layout.sections, [layout.sections]);

  const addSection = () => {
    const id = crypto.randomUUID();
    setLayout((prev) => ({ sections: [...prev.sections, { id, title: "Новый раздел", widgets: [] }] }));
    setTargetSectionId(id);
  };

  const renameSection = (sectionId: string, title: string) => {
    setLayout((prev) => ({
      sections: prev.sections.map((section) => (section.id === sectionId ? { ...section, title } : section)),
    }));
  };

  const removeSection = (sectionId: string) => {
    setLayout((prev) => ({ sections: prev.sections.filter((section) => section.id !== sectionId) }));
    if (targetSectionId === sectionId) setTargetSectionId("");
  };

  const openTemplateModal = (sectionId?: string) => {
    if (!sections.length) {
      alert("Сначала добавьте раздел, затем добавьте виджет.");
      return;
    }
    const target = sectionId && sections.some((section) => section.id === sectionId) ? sectionId : targetSectionId || sections[0].id;
    setTargetSectionId(target);
    setIsTemplateModalOpen(true);
  };

  const addWidgetFromTemplate = (templateId: WidgetTemplateId) => {
    if (!targetSectionId) return;
    setLayout((prev) => ({
      sections: prev.sections.map((section) => {
        if (section.id !== targetSectionId) return section;
        const widget = templateId === "voc" ? createVocWidget() : createStabilityWidget();
        return { ...section, widgets: [...section.widgets, widget] };
      }),
    }));
    setIsTemplateModalOpen(false);
  };

  const updateWidget = (sectionId: string, widgetId: string, updater: (widget: SandboxWidget) => SandboxWidget) => {
    setLayout((prev) => ({
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              widgets: section.widgets.map((widget) => (widget.id === widgetId ? updater(widget) : widget)),
            }
          : section,
      ),
    }));
  };

  const removeWidget = (sectionId: string, widgetId: string) => {
    setLayout((prev) => ({
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, widgets: section.widgets.filter((widget) => widget.id !== widgetId) } : section,
      ),
    }));
  };

  const addVocRow = (sectionId: string, widgetId: string) => {
    updateWidget(sectionId, widgetId, (widget) => {
      if (widget.templateId !== "voc") return widget;
      if (widget.items.length >= 5) return widget;
      return {
        ...widget,
        items: [...widget.items, { id: crypto.randomUUID(), label: "Название", value: 0 }],
      };
    });
  };

  const addStabilityMetric = (sectionId: string, widgetId: string) => {
    updateWidget(sectionId, widgetId, (widget) => {
      if (widget.templateId !== "stability") return widget;
      return { ...widget, metrics: [...widget.metrics, createStabilityMetric()] };
    });
  };

  const moveWidget = (source: { sectionId: string; widgetId: string }, target: { sectionId: string; widgetId?: string }) => {
    setLayout((prev) => {
      if (source.sectionId === target.sectionId && target.widgetId === source.widgetId) return prev;
      const nextSections = prev.sections.map((section) => ({ ...section, widgets: [...section.widgets] }));
      const sourceSection = nextSections.find((section) => section.id === source.sectionId);
      const targetSection = nextSections.find((section) => section.id === target.sectionId);
      if (!sourceSection || !targetSection) return prev;

      const sourceIndex = sourceSection.widgets.findIndex((widget) => widget.id === source.widgetId);
      if (sourceIndex < 0) return prev;
      const [moved] = sourceSection.widgets.splice(sourceIndex, 1);

      if (target.widgetId) {
        const targetIndex = targetSection.widgets.findIndex((widget) => widget.id === target.widgetId);
        if (targetIndex >= 0) targetSection.widgets.splice(targetIndex, 0, moved);
        else targetSection.widgets.push(moved);
      } else {
        targetSection.widgets.push(moved);
      }

      return { sections: nextSections };
    });
  };

  const getPointFromEvent = (event: PointerLikeEvent) => {
    if (event.touches && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    if (event.changedTouches && event.changedTouches.length > 0) {
      return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
    }
    return { x: event.clientX ?? 0, y: event.clientY ?? 0 };
  };

  const getDistanceToElementCenter = (element: HTMLElement, x: number, y: number) => {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - x;
    const dy = cy - y;
    return Math.hypot(dx, dy);
  };

  const getNearestDropTarget = (x: number, y: number, source?: { sectionId: string; widgetId: string }): DragOverTarget => {
    const alignmentNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-drop-alignment]"));
    if (alignmentNodes.length) {
      let nearestAlignment: { target: DragOverTarget; distance: number } | null = null;
      for (const node of alignmentNodes) {
        const sectionId = node.dataset.dropSection;
        const widgetId = node.dataset.dropWidget;
        const alignment = node.dataset.dropAlignment as SingleAlignment | undefined;
        if (!sectionId || !widgetId || !alignment) continue;
        const distance = getDistanceToElementCenter(node, x, y);
        if (!nearestAlignment || distance < nearestAlignment.distance) {
          nearestAlignment = { target: { kind: "alignment", sectionId, widgetId, alignment }, distance };
        }
      }
    if (nearestAlignment && nearestAlignment.distance < 420) {
      return nearestAlignment.target;
    }
    }

    const widgetNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-drop-widget]"));
    let nearestWidget: { target: DragOverTarget; distance: number } | null = null;
    for (const node of widgetNodes) {
      const sectionId = node.dataset.dropSection;
      const widgetId = node.dataset.dropWidget;
      if (!sectionId || !widgetId) continue;
      if (source && source.sectionId === sectionId && source.widgetId === widgetId) continue;
      const distance = getDistanceToElementCenter(node, x, y);
      if (!nearestWidget || distance < nearestWidget.distance) {
        nearestWidget = { target: { kind: "widget", sectionId, widgetId }, distance };
      }
    }
    if (nearestWidget && nearestWidget.distance < 560) {
      return nearestWidget.target;
    }

    const sectionNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-drop-section]")).filter(
      (node) => !node.dataset.dropWidget && !node.dataset.dropAlignment,
    );
    let nearestSection: { target: DragOverTarget; distance: number } | null = null;
    for (const node of sectionNodes) {
      const sectionId = node.dataset.dropSection;
      if (!sectionId) continue;
      const distance = getDistanceToElementCenter(node, x, y);
      if (!nearestSection || distance < nearestSection.distance) {
        nearestSection = { target: { kind: "section", sectionId }, distance };
      }
    }
    if (nearestSection && nearestSection.distance < 720) {
      return nearestSection.target;
    }

    return null;
  };

  const resolveDropTarget = (event: PointerLikeEvent, source?: { sectionId: string; widgetId: string }): DragOverTarget => {
    const { x, y } = getPointFromEvent(event);
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!element) return getNearestDropTarget(x, y, source);

    const alignmentElement = element.closest("[data-drop-alignment]") as HTMLElement | null;
    if (alignmentElement) {
      const sectionId = alignmentElement.dataset.dropSection;
      const widgetId = alignmentElement.dataset.dropWidget;
      const alignment = alignmentElement.dataset.dropAlignment as SingleAlignment | undefined;
      if (sectionId && widgetId && alignment) {
        return { kind: "alignment", sectionId, widgetId, alignment };
      }
    }

    const widgetElement = element.closest("[data-drop-widget]") as HTMLElement | null;
    if (widgetElement) {
      const sectionId = widgetElement.dataset.dropSection;
      const widgetId = widgetElement.dataset.dropWidget;
      if (sectionId && widgetId) {
        return { kind: "widget", sectionId, widgetId };
      }
    }

    const sectionElement = element.closest("[data-drop-section]") as HTMLElement | null;
    if (sectionElement) {
      const sectionId = sectionElement.dataset.dropSection;
      if (sectionId) {
        return { kind: "section", sectionId };
      }
    }

    return getNearestDropTarget(x, y, source);
  };

  const handleMotionDrag = (event: PointerLikeEvent, source: { sectionId: string; widgetId: string }) => {
    const activeSource = draggedWidget ?? source;
    const target = resolveDropTarget(event, activeSource);
    if (!target) {
      setDragOverTarget(null);
      dragPreviewTargetRef.current = "";
      return;
    }
    if (target.kind === "widget" && target.sectionId === activeSource.sectionId && target.widgetId === activeSource.widgetId) {
      setDragOverTarget(null);
      dragPreviewTargetRef.current = "";
      return;
    }
    setDragOverTarget(target);

    if (target.kind === "alignment") return;

    const previewKey = target.kind === "widget" ? `widget:${target.sectionId}:${target.widgetId}` : `section:${target.sectionId}`;
    if (dragPreviewTargetRef.current === previewKey) return;
    dragPreviewTargetRef.current = previewKey;

    moveWidget(
      activeSource,
      target.kind === "widget" ? { sectionId: target.sectionId, widgetId: target.widgetId } : { sectionId: target.sectionId },
    );
    setDraggedWidget((prev) => (prev ? { ...prev, sectionId: target.sectionId } : prev));
  };

  const handleMotionDragEnd = (event: PointerLikeEvent, source: { sectionId: string; widgetId: string }) => {
    const activeSource = draggedWidget ?? source;
    const target = resolveDropTarget(event, activeSource);
    if (target?.kind === "alignment") {
      handleSingleAlignmentDrop(target.sectionId, target.widgetId, target.alignment);
      dragPreviewTargetRef.current = "";
      return;
    }
    if (target?.kind === "widget") {
      moveWidget(activeSource, { sectionId: target.sectionId, widgetId: target.widgetId });
    } else if (target?.kind === "section") {
      moveWidget(activeSource, { sectionId: target.sectionId });
    }
    dragPreviewTargetRef.current = "";
    if (dropPulseTimerRef.current) {
      window.clearTimeout(dropPulseTimerRef.current);
      dropPulseTimerRef.current = null;
    }
    setDropPulseWidgetId(activeSource.widgetId);
    dropPulseTimerRef.current = window.setTimeout(() => {
      setDropPulseWidgetId(null);
      dropPulseTimerRef.current = null;
    }, 220);
    setDragOverTarget(null);
    setDraggedWidget(null);
  };

  const handleSingleAlignmentDrop = (sectionId: string, widgetId: string, alignment: SingleAlignment) => {
    updateWidget(sectionId, widgetId, (widget) => {
      if (widget.templateId !== "voc") return widget;
      return { ...widget, alignment };
    });
    setDragOverTarget(null);
    setDraggedWidget(null);
    dragPreviewTargetRef.current = "";
  };

  const isOverSection = (sectionId: string) => dragOverTarget?.kind === "section" && dragOverTarget.sectionId === sectionId;
  const isOverWidget = (sectionId: string, widgetId: string) =>
    dragOverTarget?.kind === "widget" && dragOverTarget.sectionId === sectionId && dragOverTarget.widgetId === widgetId;
  const isOverAlignment = (sectionId: string, widgetId: string, alignment: SingleAlignment) =>
    dragOverTarget?.kind === "alignment" &&
    dragOverTarget.sectionId === sectionId &&
    dragOverTarget.widgetId === widgetId &&
    dragOverTarget.alignment === alignment;

  const save = async () => {
    if (!pageId) return;
    try {
      const isSameData = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
      const mergeSectionsByDiff = (
        baseSections: SectionItem[],
        localSections: SectionItem[],
        latestSections: SectionItem[],
      ) => {
        const mergedMap = new Map<string, SectionItem>(latestSections.map((section) => [section.id, section]));
        const baseMap = new Map<string, SectionItem>(baseSections.map((section) => [section.id, section]));
        const localMap = new Map<string, SectionItem>(localSections.map((section) => [section.id, section]));
        const ids = new Set<string>([
          ...Array.from(baseMap.keys()),
          ...Array.from(localMap.keys()),
        ]);

        ids.forEach((id) => {
          const baseSection = baseMap.get(id);
          const localSection = localMap.get(id);

          if (baseSection && !localSection) {
            mergedMap.delete(id);
            return;
          }

          if (!baseSection && localSection) {
            mergedMap.set(id, localSection);
            return;
          }

          if (baseSection && localSection && !isSameData(baseSection, localSection)) {
            mergedMap.set(id, localSection);
          }
        });

        const latestOrder = latestSections.map((section) => section.id);
        const localOrder = localSections.map((section) => section.id);
        const order = [...latestOrder, ...localOrder.filter((id) => !latestOrder.includes(id))];

        return order
          .map((id) => mergedMap.get(id))
          .filter((section): section is SectionItem => Boolean(section));
      };

      const current = (await menuAPI.get()) || {};
      const payload: MenuPayload = current?.items ? current : { items: current };
      const latestLayout = payload.customPageLayouts?.[pageId]?.sections
        ? payload.customPageLayouts[pageId]
        : createDefaultLayout();
      const baseLayout = baseLayoutRef.current || createDefaultLayout();
      const mergedLayout: PageLayout = {
        sections: mergeSectionsByDiff(baseLayout.sections || [], layout.sections || [], latestLayout.sections || []),
      };
      const nextLayouts = { ...(payload.customPageLayouts || {}), [pageId]: mergedLayout };
      await menuAPI.save({ ...payload, customPageLayouts: nextLayouts });
      setLayout(mergedLayout);
      baseLayoutRef.current = JSON.parse(JSON.stringify(mergedLayout));
      setIsEditing(false);
      setIsEditingMode(false);
    } catch (err) {
      alert("Ошибка при сохранении: " + (err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-8 pt-4 min-h-screen ${isEditing ? "pb-40" : ""}`}>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-10">
          {sections.map((section) => {
            const vocWidgets = section.widgets.filter((w) => w.templateId === "voc");
            const singleVoc = vocWidgets.length === 1 && section.widgets.length === 1 ? (vocWidgets[0] as VocWidget) : null;

            return (
              <section key={section.id} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        value={section.title}
                        onChange={(e) => renameSection(section.id, e.target.value)}
                        className="w-full max-w-[520px] bg-transparent border-b border-white/20 px-1 py-1 text-4xl font-bold text-white outline-none"
                      />
                    ) : (
                      <h2 className="text-4xl font-bold text-white">{section.title}</h2>
                    )}
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => removeSection(section.id)}
                      className="p-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                      title="Удалить раздел"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {isEditing && singleVoc && draggedWidget?.widgetId === singleVoc.id && (
                  <div className="grid grid-cols-3 gap-4">
                    {(["left", "center", "right"] as SingleAlignment[]).map((slot) => (
                      <div
                        key={slot}
                        data-drop-section={section.id}
                        data-drop-widget={singleVoc.id}
                        data-drop-alignment={slot}
                        className={`h-16 rounded-xl border border-dashed text-xs flex items-center justify-center uppercase transition-all ${
                          isOverAlignment(section.id, singleVoc.id, slot)
                            ? "border-emerald-300 bg-emerald-500/15 text-emerald-200"
                            : "border-emerald-400/40 bg-emerald-500/5 text-emerald-300"
                        }`}
                      >
                        {slot}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  data-drop-section={section.id}
                  className={`grid grid-cols-1 md:grid-cols-3 gap-6 rounded-3xl transition-all ${
                    isOverSection(section.id) ? "ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-transparent" : ""
                  }`}
                >
                  {section.widgets.map((widget, widgetIndex) => {
                    const widgetBaseClass =
                      widget.templateId === "stability"
                        ? "md:col-span-3"
                        : section.widgets.length === 1
                          ? widget.alignment === "center"
                            ? "md:col-start-2"
                            : widget.alignment === "right"
                              ? "md:col-start-3"
                              : "md:col-start-1"
                          : "";

                    return (
                      <DraggableWidgetCard
                        key={widget.id}
                        isEditing={isEditing}
                        sectionId={section.id}
                        widgetId={widget.id}
                        widgetIndex={widgetIndex}
                        widgetBaseClass={widgetBaseClass}
                        isDragged={draggedWidget?.widgetId === widget.id}
                        isDropPulse={dropPulseWidgetId === widget.id}
                        isDropTarget={isOverWidget(section.id, widget.id)}
                        onDelete={() => removeWidget(section.id, widget.id)}
                        onDragStart={() => {
                          dragPreviewTargetRef.current = "";
                          setDragOverTarget(null);
                          setDraggedWidget({ sectionId: section.id, widgetId: widget.id });
                        }}
                        onDrag={(event) => handleMotionDrag(event as PointerLikeEvent, { sectionId: section.id, widgetId: widget.id })}
                        onDragEnd={(event) => handleMotionDragEnd(event as PointerLikeEvent, { sectionId: section.id, widgetId: widget.id })}
                      >
                        {widget.templateId === "voc" ? (
                          <VocWidgetCard
                            widget={widget}
                            isEditing={isEditing}
                            onWidgetChange={(patch) => updateWidget(section.id, widget.id, (prev) => ({ ...(prev as VocWidget), ...patch }))}
                            onRowChange={(rowId, patch) =>
                              updateWidget(section.id, widget.id, (prev) => {
                                if (prev.templateId !== "voc") return prev;
                                return {
                                  ...prev,
                                  items: prev.items.map((item) => (item.id === rowId ? { ...item, ...patch } : item)),
                                };
                              })
                            }
                            onDeleteRow={(rowId) =>
                              updateWidget(section.id, widget.id, (prev) => {
                                if (prev.templateId !== "voc") return prev;
                                return { ...prev, items: prev.items.filter((item) => item.id !== rowId) };
                              })
                            }
                            onAddRow={() => addVocRow(section.id, widget.id)}
                          />
                        ) : (
                          <StabilityWidgetCard
                            widget={widget}
                            isEditing={isEditing}
                            onWidgetTitleChange={(title) =>
                              updateWidget(section.id, widget.id, (prev) => ({ ...(prev as StabilityWidget), title }))
                            }
                            onMetricChange={(metricId, patch) =>
                              updateWidget(section.id, widget.id, (prev) => {
                                if (prev.templateId !== "stability") return prev;
                                return {
                                  ...prev,
                                  metrics: prev.metrics.map((metric) => (metric.id === metricId ? { ...metric, ...patch } : metric)),
                                };
                              })
                            }
                            onAddMetric={() => addStabilityMetric(section.id, widget.id)}
                            onDeleteMetric={(metricId) =>
                              updateWidget(section.id, widget.id, (prev) => {
                                if (prev.templateId !== "stability") return prev;
                                return { ...prev, metrics: prev.metrics.filter((metric) => metric.id !== metricId) };
                              })
                            }
                          />
                        )}
                      </DraggableWidgetCard>
                    );
                  })}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => openTemplateModal(section.id)}
                      data-drop-section={section.id}
                      className="min-h-[320px] rounded-3xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30 transition-all flex items-center justify-center text-center group"
                    >
                      <div className="flex flex-col items-center gap-5">
                        <div className="size-16 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Plus size={28} className="text-gray-200" />
                        </div>
                        <div className="text-3xl font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
                          Добавить виджет
                        </div>
                      </div>
                    </button>
                  )}
                  {isEditing && draggedWidget && isOverSection(section.id) && (
                    <div
                      data-drop-section={section.id}
                      className="min-h-[220px] rounded-3xl border border-dashed border-emerald-300/45 bg-emerald-500/10 flex items-center justify-center text-emerald-200 text-sm font-medium animate-pulse"
                    >
                      Отпустите, чтобы вставить в этот раздел
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {isEditing && (
            <div className="pt-2">
              <button onClick={addSection} className={PRIMARY_ACTION_CLASS}>
                <Plus size={16} />
                Добавить раздел
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="fixed bottom-8 right-8 flex gap-3 z-[100]">
          <button
            onClick={() => {
              setIsEditing(false);
              setIsEditingMode(false);
              load();
            }}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
          >
            <X size={16} />
            Отмена
          </button>
          <button
            onClick={save}
            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/50 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl"
          >
            <Save size={16} />
            Сохранить
          </button>
        </div>
      )}

      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[1200px] rounded-3xl border border-white/10 bg-[#0c0c12] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Выберите шаблон виджета</h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
                <X size={18} />
              </button>
            </div>
            <div className="mb-5">
              <label className="text-sm text-gray-400 block mb-2">Раздел</label>
              <select
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white"
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title || "Без названия"}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="grid grid-cols-3 gap-6 min-w-[980px]">
                <button
                  onClick={() => addWidgetFromTemplate("voc")}
                  className="col-span-1 text-left rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all overflow-hidden"
                >
                  <VocWidgetCard
                    widget={VOC_TEMPLATE_PREVIEW}
                    isEditing={false}
                    onWidgetChange={() => {}}
                    onRowChange={() => {}}
                    onDeleteRow={() => {}}
                    onAddRow={() => {}}
                  />
                </button>
                <button
                  onClick={() => addWidgetFromTemplate("stability")}
                  className="col-span-3 text-left rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all overflow-hidden"
                >
                  <StabilityWidgetCard
                    widget={STABILITY_TEMPLATE_PREVIEW}
                    isEditing={false}
                    onWidgetTitleChange={() => {}}
                    onMetricChange={() => {}}
                    onAddMetric={() => {}}
                    onDeleteMetric={() => {}}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setIsEditingMode(false);
        }}
        onSuccess={() => {
          setIsPasswordModalOpen(false);
          setIsEditing(true);
        }}
      />
    </div>
  );
}

function VocWidgetCard({
  widget,
  isEditing,
  onWidgetChange,
  onRowChange,
  onDeleteRow,
  onAddRow,
}: {
  widget: VocWidget;
  isEditing: boolean;
  onWidgetChange: (patch: Partial<VocWidget>) => void;
  onRowChange: (rowId: string, patch: Partial<VocItem>) => void;
  onDeleteRow: (rowId: string) => void;
  onAddRow: () => void;
}) {
  return (
    <div className="p-6 relative flex flex-col min-h-[360px]">
      {isEditing ? (
        <input
          value={widget.title}
          onChange={(e) => onWidgetChange({ title: e.target.value })}
          className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-xl font-bold text-white mb-4 pr-28"
        />
      ) : (
        <h3 className="text-xl font-bold text-white mb-4 pr-20">{widget.title}</h3>
      )}

      <div className="mb-6 flex flex-col items-start">
        {isEditing ? (
          <input
            type="number"
            step="0.01"
            value={widget.nib}
            onChange={(e) => onWidgetChange({ nib: parseFloat(e.target.value) || 0 })}
            className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-white text-4xl font-bold"
          />
        ) : (
          <div className="text-4xl font-bold text-green-400 mb-2">{widget.nib}</div>
        )}
        <div className="text-sm text-gray-500 mt-2">
          {isEditing ? (
            <input
              value={widget.range}
              onChange={(e) => onWidgetChange({ range: e.target.value })}
              className="w-32 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-sm"
            />
          ) : (
            `План ${widget.range}`
          )}
        </div>
      </div>

      <div className="space-y-3 mt-auto">
        {widget.items.map((item) => (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_minmax(88px,112px)_auto] items-center gap-2">
            {isEditing ? (
              <input
                value={item.label}
                onChange={(e) => onRowChange(item.id, { label: e.target.value })}
                className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-sm text-gray-300"
              />
            ) : (
              <div className="text-sm text-gray-500">{item.label}</div>
            )}

            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={item.value}
                onChange={(e) => onRowChange(item.id, { value: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-2 py-1 text-white text-sm font-bold"
              />
            ) : (
              <div className="text-lg font-bold text-green-400">{item.value}</div>
            )}

            {isEditing && (
              <button
                onClick={() => onDeleteRow(item.id)}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-red-400"
                title="Удалить строку"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onAddRow}
            disabled={widget.items.length >= 5}
            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl transition-all border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            title={widget.items.length >= 5 ? "Максимум 5 строк" : "Добавить строку"}
          >
            <Plus size={16} className="text-emerald-400" />
          </button>
        </div>
      )}
    </div>
  );
}

function DraggableWidgetCard({
  isEditing,
  sectionId,
  widgetId,
  widgetIndex,
  widgetBaseClass,
  isDragged,
  isDropPulse,
  isDropTarget,
  onDelete,
  onDragStart,
  onDrag,
  onDragEnd,
  children,
}: {
  isEditing: boolean;
  sectionId: string;
  widgetId: string;
  widgetIndex: number;
  widgetBaseClass: string;
  isDragged: boolean;
  isDropPulse: boolean;
  isDropTarget: boolean;
  onDelete: () => void;
  onDragStart: () => void;
  onDrag: (event: PointerLikeEvent) => void;
  onDragEnd: (event: PointerLikeEvent) => void;
  children: ReactNode;
}) {
  const dragControls = useDragControls();

  return (
    <motion.article
      layout
      drag={isEditing}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0.16}
      dragSnapToOrigin
      dragTransition={{ power: 0.22, timeConstant: 180 }}
      onDragStart={onDragStart}
      onDrag={(event) => onDrag(event as PointerLikeEvent)}
      onDragEnd={(event) => onDragEnd(event as PointerLikeEvent)}
      whileDrag={{
        scale: 1.05,
        rotate: 0.6,
        zIndex: 110,
        boxShadow: "0 30px 80px rgba(0,0,0,0.62)",
      }}
      animate={
        isEditing && !isDragged
          ? {
              rotate: [0, -0.35, 0.35, 0],
              x: [0, -0.6, 0.6, 0],
              scale: isDropPulse ? [1, 1.025, 1] : 1,
            }
          : { rotate: 0, x: 0, scale: isDropPulse ? [1, 1.025, 1] : 1 }
      }
      transition={
        isEditing && !isDragged
          ? {
              rotate: {
                duration: 0.28,
                repeat: Infinity,
                ease: "easeInOut",
                delay: (widgetIndex % 5) * 0.035,
              },
              x: {
                duration: 0.28,
                repeat: Infinity,
                ease: "easeInOut",
                delay: (widgetIndex % 5) * 0.035,
              },
              scale: { duration: 0.18, ease: "easeOut" },
              layout: { type: "spring", stiffness: 460, damping: 34, mass: 0.45 },
            }
          : { scale: { duration: 0.18, ease: "easeOut" }, layout: { type: "spring", stiffness: 460, damping: 34, mass: 0.45 } }
      }
      data-drop-section={sectionId}
      data-drop-widget={widgetId}
      style={{ touchAction: isEditing ? "none" : "auto" }}
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/20 relative flex flex-col transition-all select-none ${
        isDragged
          ? "ring-2 ring-emerald-300/55 ring-offset-2 ring-offset-transparent opacity-95 cursor-grabbing"
          : "cursor-default"
      } ${isDropTarget ? "ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-transparent" : ""} ${widgetBaseClass}`}
    >
      {isEditing ? <div className="pr-14">{children}</div> : children}

      {isEditing && isDropTarget && !isDragged && (
        <div className="pointer-events-none absolute inset-3 rounded-2xl border border-dashed border-emerald-300/60 bg-emerald-500/10" />
      )}

      {isEditing && (
        <>
          <button
            type="button"
            onClick={onDelete}
            className="absolute top-4 right-14 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-red-400 z-50"
            title="Удалить виджет"
          >
            <Trash2 size={14} />
          </button>

          <button
            type="button"
            onPointerDown={(event) => {
              onDragStart();
              dragControls.start(event, { snapToCursor: true });
            }}
            className={`absolute inset-y-1 right-1 w-9 rounded-2xl border transition-all z-50 cursor-grab active:cursor-grabbing ${
              isDragged
                ? "border-emerald-300/70 bg-emerald-500/20 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                : "border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/25"
            }`}
            title="Перетащить виджет"
          >
            <span className="sr-only">Перетащить виджет</span>
            <span
              className="pointer-events-none absolute inset-y-1 left-1/2 w-[10px] -translate-x-1/2 rounded-full"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(226,232,240,0.78) 1.3px, transparent 1.4px)",
                backgroundSize: "8px 10px",
                backgroundPosition: "center top",
              }}
            />
          </button>
        </>
      )}
    </motion.article>
  );
}

function StabilityWidgetCard({
  widget,
  isEditing,
  onWidgetTitleChange,
  onMetricChange,
  onAddMetric,
  onDeleteMetric,
}: {
  widget: StabilityWidget;
  isEditing: boolean;
  onWidgetTitleChange: (title: string) => void;
  onMetricChange: (metricId: string, patch: Partial<StabilityMetric>) => void;
  onAddMetric: () => void;
  onDeleteMetric: (metricId: string) => void;
}) {
  return (
    <div className="p-6 relative flex flex-col">
      {isEditing ? (
        <input
          value={widget.title}
          onChange={(e) => onWidgetTitleChange(e.target.value)}
          className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-2 text-xl font-bold text-white mb-6 pr-28"
        />
      ) : (
        <h3 className="text-xl font-bold text-white mb-6 pr-20">{widget.title}</h3>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800/50">
              <th className="text-left text-gray-500 text-sm pb-3 w-12">№</th>
              <th className="text-left text-gray-500 text-sm pb-3">Показатель</th>
              <th className="text-left text-gray-500 text-sm pb-3 w-24">Вес</th>
              <th className="text-left text-gray-500 text-sm pb-3 w-32">Факт</th>
              {isEditing && <th className="text-left text-gray-500 text-sm pb-3 w-20">Тип</th>}
              <th className="text-left text-gray-500 text-sm pb-3 w-32">План</th>
              <th className="text-left text-gray-500 text-sm pb-3 w-24">%</th>
              {isEditing && <th className="text-left text-gray-500 text-sm pb-3 w-28">Макс%</th>}
              {isEditing && <th className="w-12" />}
            </tr>
          </thead>
          <tbody>
            {widget.metrics.map((metric, index) => {
              const percentValue = calculateMetricPercent(metric);
              const percentColor = percentValue >= 100 ? "text-green-400" : percentValue >= 80 ? "text-yellow-400" : "text-red-400";
              return (
                <tr key={metric.id} className="border-b border-gray-800/30 last:border-0">
                  <td className="py-4 text-white align-top">{index + 1}</td>
                  <td className="py-4 pr-4 align-top">
                    {isEditing ? (
                      <textarea
                        value={metric.name}
                        onChange={(e) => onMetricChange(metric.id, { name: e.target.value })}
                        className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white resize-none"
                        rows={2}
                      />
                    ) : (
                      <span className="text-white">{metric.name}</span>
                    )}
                  </td>
                  <td className="py-4 align-top">
                    {isEditing ? (
                      <input
                        value={metric.weight}
                        onChange={(e) => onMetricChange(metric.id, { weight: e.target.value })}
                        className="w-20 bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-gray-400"
                      />
                    ) : (
                      <span className="text-gray-400">{metric.weight}</span>
                    )}
                  </td>
                  <td className="py-4 align-top">
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={metric.fact}
                        onChange={(e) => onMetricChange(metric.id, { fact: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white"
                      />
                    ) : (
                      <span className={percentColor}>{Number.isFinite(Number(metric.fact)) ? Number(metric.fact).toLocaleString("ru-RU") : "—"}</span>
                    )}
                  </td>
                  {isEditing && (
                    <td className="py-4 align-top">
                      <select
                        value={metric.type}
                        onChange={(e) => onMetricChange(metric.id, { type: e.target.value as MetricType })}
                        className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1.5 text-emerald-300"
                      >
                        <option value="=">=</option>
                        <option value=">">{">"}</option>
                        <option value=">=">{">="}</option>
                        <option value="<">{"<"}</option>
                        <option value="<=">{"<="}</option>
                      </select>
                    </td>
                  )}
                  <td className="py-4 align-top">
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={metric.plan}
                        onChange={(e) => onMetricChange(metric.id, { plan: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#0a0a0a]/50 border border-gray-700/30 rounded px-3 py-1.5 text-white"
                      />
                    ) : (
                      <span className="text-gray-400">{`${metric.type} ${metric.plan.toLocaleString("ru-RU")}`}</span>
                    )}
                  </td>
                  <td className={`py-4 font-semibold align-top ${percentColor}`}>{formatPercent(percentValue)}</td>
                  {isEditing && (
                    <td className="py-4 align-top">
                      <input
                        value={metric.maxPercent}
                        onChange={(e) => onMetricChange(metric.id, { maxPercent: e.target.value })}
                        className="w-full bg-[#0a0a0a]/50 border border-amber-500/30 rounded px-3 py-1.5 text-amber-300"
                      />
                    </td>
                  )}
                  {isEditing && (
                    <td className="py-4 align-top">
                      <button
                        onClick={() => onDeleteMetric(metric.id)}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onAddMetric}
            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl transition-all border border-emerald-500/30"
          >
            <Plus size={16} className="text-emerald-400" />
          </button>
        </div>
      )}
    </div>
  );
}
