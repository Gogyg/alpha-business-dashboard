import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { format, isSameDay, isWeekend, startOfDay } from "date-fns";
import { dashboardAPI, eventsAPI } from "../utils/api";

interface OutletContext {
  currentQuarter: string;
  setCurrentQuarter: (quarter: string) => void;
  currentYear: number;
  isEditingMode: boolean;
  setIsEditingMode: (value: boolean) => void;
}

interface MetricPoint {
  name: string;
  value: number;
  weight: number;
  trend?: number;
}

type FocusMode = "good" | "attention";

interface LivingFocusConfig {
  mode: FocusMode;
  items: string[];
}

type EventStatus = "not_started" | "in_progress" | "ready" | "passed";
type EventColor = "green" | "emerald" | "blue" | "violet" | "red" | "amber";
type CalendarKey = "directorate" | "prp" | "other";

interface CalendarEventItem {
  id: string;
  title: string;
  description: string;
  date: Date;
  color: EventColor;
  status: EventStatus;
  updatedAt: string;
  calendarKey: CalendarKey;
}

const parsePercentFromAny = (value: unknown, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const raw = String(value ?? "").replace("%", "").replace(",", ".").trim();
  const numeric = parseFloat(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const EVENT_COLORS: EventColor[] = ["green", "emerald", "blue", "violet", "red", "amber"];

const isEventColor = (value: unknown): value is EventColor =>
  typeof value === "string" && EVENT_COLORS.includes(value as EventColor);

const normalizeStatus = (value: unknown): EventStatus => {
  if (value === "not_started" || value === "in_progress" || value === "ready" || value === "passed") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v.includes("не нач")) return "not_started";
    if (v.includes("готов")) return "ready";
    if (v.includes("работ")) return "in_progress";
    if (v.includes("пройден")) return "passed";
  }
  return "in_progress";
};

const STATUS_LABELS: Record<EventStatus, string> = {
  not_started: "Подготовка не начата",
  in_progress: "В работе",
  ready: "Готовы к событию",
  passed: "Пройдено",
};

const deriveEventTitle = (description: string, fallback = "Событие") => {
  const clean = description.trim();
  if (!clean) return fallback;
  const firstLine = clean.split("\n")[0].trim().replace(/[.!?]+$/, "");
  if (!firstLine) return fallback;
  return firstLine.length > 58 ? `${firstLine.slice(0, 55)}...` : firstLine;
};

const PRODUCTION_CALENDAR_2026_NON_WORKING_DAYS = new Set<string>([
  "2026-01-01",
  "2026-01-02",
  "2026-01-03",
  "2026-01-04",
  "2026-01-05",
  "2026-01-06",
  "2026-01-07",
  "2026-01-08",
  "2026-01-09",
  "2026-02-23",
  "2026-03-08",
  "2026-03-09",
  "2026-05-01",
  "2026-05-09",
  "2026-05-11",
  "2026-06-12",
  "2026-11-04",
  "2026-12-31",
]);

const makeHolidayKeys = (year: number) => {
  if (year === 2026) return Array.from(PRODUCTION_CALENDAR_2026_NON_WORKING_DAYS);

  const statutoryDays: Array<[number, number]> = [
    [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8],
    [2, 23],
    [3, 8],
    [5, 1], [5, 9],
    [6, 12],
    [11, 4],
  ];

  return statutoryDays.map(([month, day]) => format(new Date(year, month - 1, day), "yyyy-MM-dd"));
};

const countWorkingDaysUntil = (from: Date, to: Date, holidayKeys: Set<string>) => {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (end.getTime() <= start.getTime()) return 0;

  const cursor = new Date(start);
  let count = 0;

  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const key = format(cursor, "yyyy-MM-dd");
    if (!isWeekend(cursor) && !holidayKeys.has(key)) {
      count += 1;
    }
  }

  return count;
};

const isPastEventDate = (date: Date, today: Date) => startOfDay(date).getTime() < today.getTime();

const normalizeEventStatusByDate = (status: EventStatus, date: Date, today: Date): EventStatus => {
  if (isPastEventDate(date, today)) return "passed";
  return status === "passed" ? "not_started" : status;
};

const normalizeCalendarKey = (value: unknown): CalendarKey => {
  if (value === "directorate" || value === "prp" || value === "other") return value;
  return "directorate";
};

const toNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

interface DashboardTrendSnapshot {
  savedAt: string;
  totals: {
    scoreCard: number;
    stability: number;
    production: number;
    voc: number;
    personnel: number;
  };
  scoreCardMetrics: Array<{
    id: number;
    value: number;
  }>;
}

const normalizeDashboardTrendHistory = (raw: any): DashboardTrendSnapshot[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const totals = item?.totals || {};
      const scoreCardMetrics = Array.isArray(item?.scoreCardMetrics) ? item.scoreCardMetrics : [];

      return {
        savedAt: typeof item?.savedAt === "string" && item.savedAt.trim() ? item.savedAt : new Date().toISOString(),
        totals: {
          scoreCard: toNumber(totals.scoreCard),
          stability: toNumber(totals.stability),
          production: toNumber(totals.production),
          voc: toNumber(totals.voc),
          personnel: toNumber(totals.personnel),
        },
        scoreCardMetrics: scoreCardMetrics
          .map((metric: any, index: number) => ({
            id: toNumber(metric?.id, index + 1),
            value: toNumber(metric?.value),
          }))
          .filter((metric: { id: number; value: number }) => metric.id > 0),
      };
    })
    .sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
};

const parseWeight = (value: unknown) => {
  const raw = String(value ?? "")
    .replace("%", "")
    .replace(",", ".")
    .trim();
  return toNumber(raw);
};

const parseMaxPercent = (value: string | undefined) => {
  if (!value || value === "∞") return Infinity;
  const cleaned = String(value).replace("∞", "").replace(",", ".").trim();
  const numeric = parseFloat(cleaned);
  return Number.isFinite(numeric) ? numeric : Infinity;
};

const calculateMetricPercent = (metric: any) => {
  const fact = toNumber(metric?.fact);
  const plan = toNumber(metric?.plan);
  const type = metric?.type || "=";
  const maxPercent = parseMaxPercent(metric?.maxPercent);

  if (plan <= 0 && fact <= 0) return 0;
  if (plan <= 0) return 0;

  let rawPercent = 0;
  if (type === "<=" || type === "<") {
    rawPercent = fact > 0 ? (plan / fact) * 100 : 100;
  } else {
    rawPercent = (fact / plan) * 100;
  }

  return Math.max(0, Math.min(rawPercent, maxPercent));
};

const clampPercent = (value: number, max: number) => Math.max(0, Math.min(value, max));

const evaluateVocScore = (nib: number) => {
  if (nib < 4.75) return 80;
  if (nib <= 4.78) return 100;
  return 110;
};

const normalizeName = (name: string, fallback: string) => {
  const prepared = (name || "").trim();
  if (!prepared) return fallback;
  return prepared.split("(")[0].trim() || fallback;
};

const calculateSectionScore = (metrics: any[]) => {
  let totalWeight = 0;
  let totalScore = 0;

  metrics.forEach((metric) => {
    const weight = parseWeight(metric?.weight) / 100;
    const percent = calculateMetricPercent(metric) / 100;
    totalWeight += weight;
    totalScore += weight * percent;
  });

  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
};

const buildTotalsMetrics = (data: any) => {
  const digitalMetrics = Array.isArray(data?.digitalMetrics) ? data.digitalMetrics : [];
  const stabilityMetrics = Array.isArray(data?.stabilityMetrics) ? data.stabilityMetrics : [];
  const productionMetrics = Array.isArray(data?.productionMetrics) ? data.productionMetrics : [];
  const weights = data?.totalsConfig?.weights || {};
  const overrides = data?.totalsConfig?.overrides || {};
  const widgetTitles = data?.widgetTitles || {};
  const vocNib = toNumber(data?.vocData?.nib);

  const kpiAverageScore = calculateSectionScore(digitalMetrics);
  const scoreCardValue = kpiAverageScore;
  const stabilityValue = toNumber(overrides.stability || calculateSectionScore(stabilityMetrics));
  const productionValue = toNumber(overrides.production || calculateSectionScore(productionMetrics));
  const vocValue = toNumber(overrides.voc || evaluateVocScore(vocNib));
  const personnelValue = toNumber(overrides.personnel || 100);

  return [
    { id: "scoreCard", name: normalizeName(widgetTitles.scoreCard || "Скор-карта", "Скор-карта"), value: scoreCardValue, weight: toNumber(weights.scoreCard) },
    { id: "stability", name: "Проекты", value: stabilityValue, weight: toNumber(weights.stability) },
    { id: "production", name: normalizeName(widgetTitles.production || "Производство", "Производство"), value: productionValue, weight: toNumber(weights.production) },
    { id: "voc", name: normalizeName(widgetTitles.voc || "VOC", "VOC"), value: vocValue, weight: toNumber(weights.voc) },
    { id: "personnel", name: "eNPS", value: personnelValue, weight: toNumber(weights.personnel) },
  ];
};

const buildScoreCardMetrics = (data: any) => {
  const digitalMetrics = Array.isArray(data?.digitalMetrics) ? data.digitalMetrics : [];
  const kpiNameById: Record<number, string> = {
    1: "Доля digital активных клиентов",
    2: "MAU Spotlight",
    3: "Продажи ММБ",
    4: "Опер. приб. СБ",
  };
  return digitalMetrics
    .slice()
    .sort((a: any, b: any) => toNumber(a?.id) - toNumber(b?.id))
    .slice(0, 4)
    .map((metric: any, index: number) => {
      const id = toNumber(metric?.id, index + 1);
      const rawRunrate = parsePercentFromAny(metric?.runrate, Math.round(calculateMetricPercent(metric)));
      const normalizedRunrate =
        id === 2 ? clampPercent(rawRunrate, 120) :
        id === 3 ? clampPercent(rawRunrate, 150) :
        rawRunrate;
      const valueByRule =
        id === 2 || id === 3
          ? Math.round(normalizedRunrate)
          : Math.round(calculateMetricPercent(metric));
      return {
        id,
        name: kpiNameById[id] || normalizeName(metric?.name || `Показатель ${index + 1}`, `Показатель ${index + 1}`),
        value: valueByRule,
        weight: parseWeight(metric?.weight),
      };
    });
};

const getWeightedScore = (metrics: MetricPoint[]) => {
  const total = metrics.reduce((acc, item) => acc + (item.value * item.weight) / 100, 0);
  return Math.round(total);
};

const splitLabelToTwoLines = (name: string, maxChars = 12, maxLines = 3) => {
  const prepared = name.replace(/\//g, "/ ").replace(/\s+/g, " ").trim();
  const words = prepared
    .split(" ")
    .flatMap((word) => {
      if (word.length <= maxChars) return [word];
      const chunks: string[] = [];
      for (let index = 0; index < word.length; index += maxChars) {
        chunks.push(word.slice(index, index + maxChars));
      }
      return chunks;
    })
    .filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }

  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === 1 && words.length > 1) {
    const remainder = words.slice(lines[0].split(" ").length).join(" ");
    if (remainder) lines.push(remainder.slice(0, maxChars));
  }

  return lines.slice(0, maxLines);
};

function RadarAxisTick(props: any) {
  const { x, y, payload, metricMap, labelScale = 1, chartWidth = 0 } = props;
  const name = String(payload?.value || "");
  const metric = metricMap?.[name];
  const value = parsePercentFromAny(metric?.value, 0);
  const weight = parsePercentFromAny(metric?.weight, 0);
  const trend = typeof metric?.trend === "number" ? metric.trend : null;
  const isNarrowChart = chartWidth > 0 && chartWidth < 420;
  const lines = splitLabelToTwoLines(name, isNarrowChart ? 8 : 12, 3);
  const cx = toNumber(props?.cx);
  const cy = toNumber(props?.cy);
  const vx = x - cx;
  const vy = y - cy;
  const length = Math.hypot(vx, vy) || 1;
  const horizontalBias = vx / length;
  const verticalBias = vy / length;
  const isSideLabel = Math.abs(horizontalBias) > 0.46;
  const isTopLabel = verticalBias < -0.72;
  const isBottomLabel = verticalBias > 0.72;
  const baseOffset = isTopLabel ? (isNarrowChart ? 42 : 32) : isBottomLabel ? (isNarrowChart ? 18 : 16) : (isNarrowChart ? 14 : 14);
  const sideOffset = isSideLabel ? (isNarrowChart ? 18 : 18) : 0;
  const labelOffset = (baseOffset + sideOffset) * labelScale;
  const anchorNudge = isSideLabel ? Math.sign(horizontalBias) * (isNarrowChart ? 12 : 12) * labelScale : 0;
  const rawX = x + horizontalBias * labelOffset + anchorNudge;
  const verticalNudge = isSideLabel
    ? (isNarrowChart ? (verticalBias > 0.15 ? 8 : verticalBias < -0.15 ? -8 : -2) : 0)
    : isTopLabel
      ? (isNarrowChart ? -14 : -8)
    : isBottomLabel
      ? (isNarrowChart ? 6 : 0)
      : 0;
  const ly = y + verticalBias * labelOffset + verticalNudge * labelScale;
  const dynamicAnchor = isSideLabel
    ? (horizontalBias > 0 ? "start" : "end")
    : "middle";
  const safePadding = Math.max(isNarrowChart ? 54 : 46, Math.round((isNarrowChart ? 64 : 56) * labelScale));
  const lx =
    chartWidth > 0
      ? Math.max(safePadding, Math.min(chartWidth - safePadding, rawX))
      : rawX;
  const valueFontSize = Math.max(isNarrowChart ? 12 : 14, Math.round((isNarrowChart ? 16 : 19) * labelScale));
  const titleFontSize = Math.max(8, Math.round((isNarrowChart ? 8.5 : 10) * labelScale));
  const metaFontSize = Math.max(isNarrowChart ? 8 : 9, Math.round((isNarrowChart ? 8.5 : 10) * labelScale));
  const lineGap1 = Math.max(9, Math.round((isNarrowChart ? 11 : 14) * labelScale));
  const lineGap2 = Math.max(8, Math.round((isNarrowChart ? 10 : 12) * labelScale));
  const lineGap3 = Math.max(8, Math.round((isNarrowChart ? 9 : 11) * labelScale));

  return (
    <text x={lx} y={ly} textAnchor={dynamicAnchor}>
      <tspan x={lx} dy={0} fill="rgba(255,255,255,0.96)" fontSize={valueFontSize} fontWeight={800}>
        {value}%
      </tspan>
      {lines.map((line, index) => (
        <tspan key={`${name}-line-${index}`} x={lx} dy={index === 0 ? lineGap1 : lineGap2} fill="rgba(255,255,255,0.8)" fontSize={titleFontSize} fontWeight={600}>
          {line}
        </tspan>
      ))}
      <tspan x={lx} dy={lineGap2} fill="rgba(0,212,255,0.72)" fontSize={metaFontSize} fontWeight={700}>
        Вес {weight}%
      </tspan>
      {trend !== null ? (
        <tspan x={lx} dy={lineGap3} fill={trend >= 0 ? "#00d4a0" : "#ff4757"} fontSize={metaFontSize} fontWeight={700}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </tspan>
      ) : null}
    </text>
  );
}

function useAnimatedPercent(target: number, duration = 1500, delay = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    let timeout = 0;
    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (startTimestamp === null) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) {
        raf = window.requestAnimationFrame(step);
      }
    };

    timeout = window.setTimeout(() => {
      raf = window.requestAnimationFrame(step);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}

function ScoreWidget({
  title,
  subtitle,
  accent,
  scoreLabel,
  metrics,
  quarter,
  year,
  scoreDelay = 0,
  chartHeightClass = "chart-container",
  chartOuterRadius = "86%",
  chartMargin = { top: 24, right: 44, bottom: 24, left: 44 },
  hideBottomMetrics = false,
  labelScale = 1,
}: {
  title: string;
  subtitle: string;
  accent: string;
  scoreLabel: string;
  metrics: MetricPoint[];
  quarter: string;
  year: number;
  scoreDelay?: number;
  chartHeightClass?: string;
  chartOuterRadius?: string;
  chartMargin?: { top: number; right: number; bottom: number; left: number };
  hideBottomMetrics?: boolean;
  labelScale?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const score = useMemo(() => getWeightedScore(metrics), [metrics]);
  const animatedScore = useAnimatedPercent(score, 1500, scoreDelay);
  const data = useMemo(() => metrics.map((item) => ({ ...item, max: 100 })), [metrics]);
  const metricMap = useMemo(
    () => Object.fromEntries(data.map((item) => [item.name, item])),
    [data],
  );
  const isCompactChart = containerWidth > 0 && containerWidth < 420;
  const adaptiveLabelScale = containerWidth < 360 ? 0.64 : containerWidth < 420 ? 0.72 : containerWidth < 500 ? 0.82 : 1;
  const adaptiveOuterRadius =
    containerWidth < 360 ? "52%" : containerWidth < 420 ? "56%" : containerWidth < 500 ? "64%" : chartOuterRadius;
  const adaptiveChartMargin =
    containerWidth < 360
      ? { top: 44, right: 78, bottom: 44, left: 78 }
      : containerWidth < 420
        ? { top: 38, right: 70, bottom: 38, left: 70 }
        : containerWidth < 500
          ? { top: 28, right: 50, bottom: 28, left: 50 }
          : chartMargin;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setContainerWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="widget-card" ref={containerRef}>
      <div className="widget-header">
        <div>
          <div className="widget-title">{title}</div>
          <div className="widget-subtitle">{subtitle}</div>
        </div>
        <div className="period-badge">
          {quarter} {year}
        </div>
      </div>

      <div className={chartHeightClass}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius={adaptiveOuterRadius} margin={adaptiveChartMargin}>
            <PolarGrid stroke="rgba(255,255,255,0.07)" />
            <PolarAngleAxis
              dataKey="name"
              tick={
                <RadarAxisTick
                  metricMap={metricMap}
                  labelScale={labelScale * adaptiveLabelScale}
                  chartWidth={containerWidth}
                />
              }
            />
            <Radar dataKey="max" stroke="rgba(0,212,160,0.35)" fill="transparent" strokeDasharray="4 4" dot={false} />
            <Radar dataKey="value" stroke={accent} fill={accent} fillOpacity={0.12} strokeWidth={2.5} dot={{ r: 5, fill: accent, stroke: "#ffffff", strokeWidth: 2 }} />
          </RadarChart>
        </ResponsiveContainer>

        <div className="center-score">
          <div className="score-value" style={{ color: accent, fontSize: isCompactChart ? 24 : undefined }}>
            {animatedScore}%
          </div>
          <div className="score-label" style={{ maxWidth: isCompactChart ? 72 : undefined, fontSize: isCompactChart ? 8 : undefined }}>
            {scoreLabel}
          </div>
        </div>
      </div>

      {!hideBottomMetrics ? (
        <div className="metrics-grid" style={{ gridTemplateColumns: `repeat(${Math.max(metrics.length, 1)}, minmax(0, 1fr))` }}>
          {metrics.map((metric, index) => (
            <div className="metric-item" key={`${metric.name}-${index}`}>
              <div className="metric-value">{metric.value}%</div>
              <div className="metric-name">{metric.name}</div>
              <div className="metric-meta">
                <div className="metric-weight">{metric.weight}%</div>
                {typeof metric.trend === "number" ? (
                  <div className={`trend-indicator ${metric.trend >= 0 ? "trend-up" : "trend-down"}`}>
                    {metric.trend >= 0 ? "↑" : "↓"} {Math.abs(metric.trend)}%
                  </div>
                ) : (
                  <div className="trend-indicator trend-muted">—</div>
                )}
              </div>
              {index < metrics.length - 1 ? <span className="metric-divider" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function LivingDashboard() {
  const { currentQuarter, currentYear, isEditingMode } = useOutletContext<OutletContext>();
  const today = useMemo(() => startOfDay(new Date()), []);

  const [redcapMetrics, setRedcapMetrics] = useState<MetricPoint[]>([
    { name: "Скор-карта", value: 0, weight: 30 },
    { name: "Проекты", value: 0, weight: 20 },
    { name: "Производство", value: 0, weight: 20 },
    { name: "VOC", value: 0, weight: 20 },
    { name: "eNPS", value: 100, weight: 10 },
  ]);
  const [kpiMetrics, setKpiMetrics] = useState<MetricPoint[]>([
    { name: "Показатель 1", value: 0, weight: 25 },
    { name: "Показатель 2", value: 0, weight: 25 },
    { name: "Показатель 3", value: 0, weight: 25 },
    { name: "Показатель 4", value: 0, weight: 25 },
  ]);
  const [focusConfig, setFocusConfig] = useState<LivingFocusConfig>({
    mode: "attention",
    items: ["Runrate цифровых продаж", "Удержание ключевых клиентов", "Сроки поставок компонентов"],
  });
  const [vocFactValue, setVocFactValue] = useState(0);
  const [vocPlanRange, setVocPlanRange] = useState("4,75-4,78");
  const [initialFocusConfig, setInitialFocusConfig] = useState<LivingFocusConfig>({
    mode: "attention",
    items: ["Runrate цифровых продаж", "Удержание ключевых клиентов", "Сроки поставок компонентов"],
  });
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);

  const holidayKeys = useMemo(() => {
    const years = new Set<number>([today.getFullYear(), today.getFullYear() + 1]);
    return new Set(Array.from(years).flatMap((year) => makeHolidayKeys(year)));
  }, [today]);

  const nearestFutureEvent = useMemo(
    () =>
      calendarEvents
        .filter((event) => startOfDay(event.date).getTime() >= today.getTime())
        .sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id))[0] ?? null,
    [calendarEvents, today],
  );

  const nearestEventWorkingDays = useMemo(() => {
    if (!nearestFutureEvent) return null;
    return countWorkingDaysUntil(today, nearestFutureEvent.date, holidayKeys);
  }, [holidayKeys, nearestFutureEvent, today]);

  const nearestEventCountdown = useMemo(() => {
    if (!nearestFutureEvent) return { value: "—", suffix: "событий нет" };
    if (isSameDay(nearestFutureEvent.date, today)) {
      return { value: "сегодня", suffix: "" };
    }

    const workingDays = nearestEventWorkingDays ?? 0;
    const mod10 = workingDays % 10;
    const mod100 = workingDays % 100;
    let suffix = "раб. дней";
    if (mod10 === 1 && mod100 !== 11) suffix = "раб. день";
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) suffix = "раб. дня";

    return { value: String(workingDays), suffix };
  }, [nearestEventWorkingDays, nearestFutureEvent, today]);

  const nearestEventStatusLabel = nearestFutureEvent ? STATUS_LABELS[nearestFutureEvent.status] : "Нет событий";

  const saveFocusConfig = async (nextConfig: LivingFocusConfig) => {
    try {
      const existing = (await dashboardAPI.get(currentQuarter)) || {};
      await dashboardAPI.save(currentQuarter, {
        ...existing,
        livingDashboardFocus: nextConfig,
      });
      setInitialFocusConfig(nextConfig);
    } catch (error) {
      console.error("Failed to save living dashboard focus config:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const currentData = (await dashboardAPI.get(currentQuarter)) || {};

        if (!mounted) return;

        const trendHistory = normalizeDashboardTrendHistory(currentData?.trendHistory);
        const previousSnapshot = trendHistory.length > 1 ? trendHistory[trendHistory.length - 2] : null;

        const currentTotals = buildTotalsMetrics(currentData);
        const prevTotalsMap = new Map<string, number>(
          previousSnapshot
            ? [
                ["scoreCard", previousSnapshot.totals.scoreCard],
                ["stability", previousSnapshot.totals.stability],
                ["production", previousSnapshot.totals.production],
                ["voc", previousSnapshot.totals.voc],
                ["personnel", previousSnapshot.totals.personnel],
              ]
            : [],
        );
        setRedcapMetrics(
          currentTotals.map((item) => ({
            name: item.name,
            value: item.value,
            weight: item.weight,
            trend: prevTotalsMap.has(item.id) ? item.value - toNumber(prevTotalsMap.get(item.id)) : undefined,
          })),
        );

        const currentScoreCard = buildScoreCardMetrics(currentData);
        const prevScoreById = new Map<number, number>(
          previousSnapshot?.scoreCardMetrics.map((item) => [item.id, item.value]) || [],
        );
        if (currentScoreCard.length > 0) {
          setKpiMetrics(
            currentScoreCard.map((item: any) => ({
              name: item.name,
              value: item.value,
              weight: item.weight,
              trend: prevScoreById.has(item.id) ? item.value - toNumber(prevScoreById.get(item.id)) : undefined,
            })),
          );
        }

        setVocFactValue(toNumber(currentData?.vocData?.nib, 0));
        const currentVocRange = String(currentData?.vocData?.range || "").trim();
        setVocPlanRange(currentVocRange || "4,75-4,78");

        const persistedFocus = currentData?.livingDashboardFocus;
        if (persistedFocus && (persistedFocus.mode === "good" || persistedFocus.mode === "attention")) {
          const persistedItems = Array.isArray(persistedFocus.items)
            ? persistedFocus.items.filter((item: unknown) => typeof item === "string" && item.trim().length > 0)
            : [];
          setFocusConfig({
            mode: persistedFocus.mode,
            items:
              persistedItems.length > 0
                ? persistedItems
                : ["Runrate цифровых продаж", "Удержание ключевых клиентов", "Сроки поставок компонентов"],
          });
          setInitialFocusConfig({
            mode: persistedFocus.mode,
            items:
              persistedItems.length > 0
                ? persistedItems
                : ["Runrate цифровых продаж", "Удержание ключевых клиентов", "Сроки поставок компонентов"],
          });
        }
      } catch (error) {
        console.error("Failed to sync living dashboard metrics:", error);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [currentQuarter]);

  useEffect(() => {
    let mounted = true;

    const parseStorageEvents = (rawEvents: any[]): CalendarEventItem[] =>
      rawEvents.map((item: any, index: number) => {
        const rawDate = typeof item.date === "string" ? item.date : "";
        const parsedDate = rawDate
          ? new Date(`${rawDate}T00:00:00`)
          : item.date instanceof Date
            ? item.date
            : new Date();

        const description =
          typeof item.description === "string"
            ? item.description
            : typeof item.title === "string"
              ? item.title
              : "";

        const status = normalizeEventStatusByDate(normalizeStatus(item.status), parsedDate, today);
        const normalizedId =
          typeof item.id === "string" && item.id.trim().length > 0
            ? item.id.trim()
            : typeof item.id === "number" && Number.isFinite(item.id)
              ? String(item.id)
              : `calendar-event-${index}`;

        return {
          id: normalizedId,
          title:
            typeof item.title === "string" && item.title.trim().length > 0
              ? item.title.trim()
              : deriveEventTitle(description, "Событие"),
          description: description.trim(),
          date: parsedDate,
          color: isEventColor(item.color) ? item.color : "blue",
          status,
          updatedAt: typeof item.updatedAt === "string" && item.updatedAt.trim() ? item.updatedAt : new Date().toISOString(),
          calendarKey: normalizeCalendarKey(item.calendarKey),
        };
      });

    const loadEvents = async () => {
      try {
        const source = await eventsAPI.get();
        if (!mounted) return;
        setCalendarEvents(parseStorageEvents(Array.isArray(source) ? source : []));
      } catch (error) {
        console.error("Failed to load calendar events for living dashboard:", error);
        if (mounted) setCalendarEvents([]);
      }
    };

    loadEvents();
    const unsubscribe = eventsAPI.subscribe(loadEvents);

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [today]);

  useEffect(() => {
    const handleSave = async () => {
      await saveFocusConfig({
        ...focusConfig,
        items: focusConfig.items.map((line) => line.trim()).filter(Boolean),
      });
    };
    const handleCancel = () => {
      setFocusConfig(initialFocusConfig);
    };
    window.addEventListener("living-dashboard-save", handleSave);
    window.addEventListener("living-dashboard-cancel", handleCancel);
    return () => {
      window.removeEventListener("living-dashboard-save", handleSave);
      window.removeEventListener("living-dashboard-cancel", handleCancel);
    };
  }, [focusConfig, initialFocusConfig]);

  return (
    <div className="living-dashboard-shell">
      <style>{`
        .living-dashboard-shell {
          --bg-card: linear-gradient(145deg, #111111 0%, #1a1a1a 100%);
          --border-subtle: rgba(255, 255, 255, 0.06);
          width: 100%;
          max-width: 1024px;
          margin: 0 auto;
          padding: 16px 0 28px;
          color: #ffffff;
        }
        .dashboard-container {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          width: 100%;
          animation: fadeInUp 0.8s ease-out;
        }
        .bottom-grid {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }
        .widget-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          animation: breathe 4s ease-in-out infinite;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .widget-card:nth-child(2) { animation-delay: 1.8s; }
        .widget-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 212, 255, 0.05);
        }
        .widget-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, rgba(0, 212, 255, 0.6) 20%, rgba(120, 0, 255, 0.6) 50%, transparent 100%);
          opacity: 0.8;
          animation: glowLine 3s ease-in-out infinite;
        }
        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 12px;
        }
        .widget-title {
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .widget-subtitle {
          color: rgba(255, 255, 255, 0.4);
          font-size: 12px;
          margin-top: 4px;
        }
        .period-badge {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
        }
        .chart-container {
          position: relative;
          height: 430px;
          width: 100%;
          animation: float 6s ease-in-out infinite;
        }
        .chart-container-kpi {
          position: relative;
          height: 430px;
          width: 100%;
          animation: float 6s ease-in-out infinite;
        }
        .center-score {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
          z-index: 10;
          animation: pulseScore 3s ease-in-out infinite;
          padding: 24px 28px;
          border-radius: 50%;
        }
        .score-value {
          font-size: 32px;
          font-weight: 800;
          line-height: 1;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
          filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.3));
        }
        .score-label {
          color: rgba(255, 255, 255, 0.9);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-top: 6px;
          font-weight: 600;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
          max-width: 92px;
        }
        .metrics-grid {
          display: grid;
          gap: 8px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .metric-item {
          text-align: center;
          position: relative;
          padding: 8px 4px;
          border-radius: 8px;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .metric-item:hover { background: rgba(255, 255, 255, 0.05); }
        .metric-divider {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 24px;
          width: 1px;
          background: rgba(255, 255, 255, 0.08);
        }
        .metric-value { color: #ffffff; font-size: 14px; font-weight: 700; margin-bottom: 2px; }
        .metric-name {
          color: rgba(255, 255, 255, 0.5);
          font-size: 10px;
          margin-bottom: 4px;
          white-space: normal;
          overflow-wrap: anywhere;
          line-height: 1.2;
          min-height: 48px;
          max-height: 48px;
          overflow: hidden;
        }
        .metric-weight {
          color: rgba(0, 212, 255, 0.7);
          font-size: 9px;
          font-weight: 600;
          background: rgba(0, 212, 255, 0.1);
          padding: 2px 6px;
          border-radius: 10px;
          display: inline-block;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }
        .metric-meta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
          min-height: 20px;
          white-space: nowrap;
        }
        .trend-indicator { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 600; margin-top: 0; }
        .trend-up { color: #00d4a0; }
        .trend-down { color: #ff4757; }
        .trend-muted { color: rgba(255,255,255,0.32); }
        .small-widget {
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 160px;
        }
        .voc-widget {
          justify-content: flex-start;
          align-items: flex-start;
        }
        .efficiency-widget { text-align: center; align-items: center; justify-content: center; }
        .eff-icon { font-size: 48px; margin-bottom: 12px; filter: drop-shadow(0 0 10px rgba(0, 212, 160, 0.4)); }
        .eff-text { color: #00d4a0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
        .eff-sub { color: rgba(255, 255, 255, 0.5); font-size: 12px; margin-top: 4px; }
        .voc-title { color: rgba(255,255,255,0.65); font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 12px; }
        .voc-value { color: #00d4ff; font-size: 44px; line-height: 1; font-weight: 800; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7); }
        .voc-caption { color: rgba(255,255,255,0.86); font-size: 14px; margin-top: 8px; font-weight: 600; }
        .voc-plan { color: rgba(255,255,255,0.56); font-size: 12px; margin-top: 6px; }
        .event-header { color: rgba(255, 255, 255, 0.6); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .event-title {
          color: #ffffff;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .event-timer { color: #00d4ff; font-size: 24px; font-weight: 800; margin: 8px 0; }
        .event-timer span { font-size: 13px; color: rgba(255, 255, 255, 0.5); font-weight: 500; margin: 0 4px 0 0; }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 8px;
          width: fit-content;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .status-dot {
          width: 6px;
          height: 6px;
          background: currentColor;
          border-radius: 50%;
          animation: pulseDot 2s infinite;
        }
        .status-badge.not_started {
          color: #cbd5e1;
          background: rgba(148, 163, 184, 0.16);
          border-color: rgba(148, 163, 184, 0.3);
        }
        .status-badge.in_progress {
          color: #00d4a0;
          background: rgba(0, 212, 160, 0.15);
          border-color: rgba(0, 212, 160, 0.3);
        }
        .status-badge.ready {
          color: #8cfcc8;
          background: rgba(34, 197, 94, 0.16);
          border-color: rgba(34, 197, 94, 0.3);
        }
        .status-badge.passed {
          color: #7dd3fc;
          background: rgba(14, 165, 233, 0.15);
          border-color: rgba(14, 165, 233, 0.28);
        }
        .focus-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .urgency-indicator {
          width: 10px;
          height: 10px;
          background: #d4af37;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.7);
          animation: urgencyPulse 2s infinite;
          display: inline-block;
        }
        .focus-problem-list { list-style: none; padding: 0; margin: 0; }
        .focus-problem-list li {
          position: relative;
          display: block;
          padding-left: 14px;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.85);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 500;
          text-align: left;
        }
        .focus-attention-widget {
          justify-content: flex-start;
          align-items: flex-start;
          text-align: left;
        }
        .focus-attention-widget .focus-label {
          justify-content: flex-start;
          margin-bottom: 8px;
        }
        .focus-attention-widget .focus-problem-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          min-height: 0;
        }
        .focus-attention-widget .focus-problem-list li {
          margin-bottom: 0;
        }
        .focus-attention-widget .focus-problem-list li:only-child {
          margin-top: 2px;
        }
        .focus-problem-list li::before {
          content: "";
          position: absolute;
          left: 0;
          top: calc(0.7em - 3px);
          width: 6px;
          height: 6px;
          background: #d4af37;
          border-radius: 50%;
        }
        .focus-problem-list li strong { color: #ffffff; font-weight: 600; }
        .focus-mode-switch {
          display: inline-flex;
          gap: 6px;
          margin-bottom: 10px;
        }
        .focus-mode-btn {
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.78);
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .focus-mode-btn.active {
          background: rgba(0, 212, 255, 0.14);
          border-color: rgba(0, 212, 255, 0.35);
          color: #8eefff;
        }
        .focus-edit-list {
          display: grid;
          gap: 8px;
          margin-top: 4px;
        }
        .focus-edit-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }
        .focus-edit-input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.04);
          color: #fff;
          font-size: 12px;
          line-height: 1.2;
          padding: 8px 10px;
        }
        .focus-edit-input:focus {
          outline: none;
          border-color: rgba(0,212,255,0.5);
          box-shadow: 0 0 0 2px rgba(0,212,255,0.16);
        }
        .focus-remove-btn,
        .focus-add-btn {
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.82);
          border-radius: 10px;
          font-size: 12px;
          padding: 7px 10px;
          cursor: pointer;
        }
        .focus-remove-btn:hover,
        .focus-add-btn:hover { background: rgba(255,255,255,0.1); }
        @keyframes breathe {
          0%, 100% { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(0, 212, 255, 0.0); }
          50% { box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(0, 212, 255, 0.03); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowLine {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes pulseScore {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes urgencyPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 71, 87, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
        }
        @media (max-width: 1024px) {
          .dashboard-container { gap: 20px; }
          .bottom-grid { gap: 20px; }
          .chart-container { height: 390px; }
          .chart-container-kpi { height: 390px; }
        }
        @media (max-width: 768px) {
          .dashboard-container { grid-template-columns: 1fr; }
          .bottom-grid { grid-template-columns: 1fr; }
          .living-dashboard-shell { padding-left: 12px; padding-right: 12px; }
          .widget-card { padding: 20px; border-radius: 18px; }
          .widget-header { margin-bottom: 14px; }
          .widget-title { font-size: 15px; }
          .widget-subtitle { margin-top: 3px; font-size: 11px; }
          .period-badge { padding: 5px 10px; font-size: 10px; }
          .chart-container { height: 340px; }
          .chart-container-kpi { height: 340px; }
          .metrics-grid { margin-top: 14px; padding-top: 14px; }
          .metric-item { padding: 6px 3px; }
          .metric-name { min-height: 46px; max-height: 46px; font-size: 10px; }
          .metric-meta { min-height: 18px; gap: 6px; }
          .small-widget { min-height: 150px; padding: 18px; }
          .eff-icon { font-size: 42px; margin-bottom: 10px; }
          .eff-text { font-size: 18px; }
          .event-title { font-size: 16px; margin-bottom: 6px; }
          .event-timer { font-size: 22px; margin: 6px 0; }
        }
        @media (max-width: 600px) {
          .chart-container { height: 300px; }
          .chart-container-kpi { height: 300px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dashboard-container,
          .widget-card,
          .widget-card::before,
          .chart-container,
          .center-score,
          .status-dot,
          .urgency-indicator { animation: none !important; }
        }
      `}</style>

      <div className="dashboard-container">
        <ScoreWidget
          title="Красная шапочка"
          subtitle="Взвешенная эффективность"
          accent="#00d4ff"
          scoreLabel="Общий результат"
          metrics={redcapMetrics}
          quarter={currentQuarter}
          year={currentYear}
          scoreDelay={0}
          chartHeightClass="chart-container"
          chartOuterRadius="74%"
          chartMargin={{ top: 20, right: 22, bottom: 20, left: 22 }}
          labelScale={0.96}
          hideBottomMetrics
        />

        <ScoreWidget
          title="KPI"
          subtitle="Скор-карта"
          accent="#7c00ff"
          scoreLabel="Средний показатель"
          metrics={kpiMetrics}
          quarter={currentQuarter}
          year={currentYear}
          scoreDelay={300}
          chartHeightClass="chart-container-kpi"
          chartOuterRadius="72%"
          chartMargin={{ top: 20, right: 26, bottom: 20, left: 26 }}
          labelScale={0.88}
          hideBottomMetrics
        />

        <div className="bottom-grid">
          <section className="widget-card small-widget voc-widget">
            <div className="voc-title">VOC Канал АБ</div>
            <div className="voc-value">{vocFactValue.toFixed(2).replace(".", ",")}</div>
            <div className="voc-caption">Фактическое значение</div>
            <div className="voc-plan">План: {vocPlanRange}</div>
          </section>

          <section className="widget-card small-widget">
            <div>
              <div className="event-header">Ближайшее событие</div>
              <div className="event-title">{nearestFutureEvent?.title || "Ближайших событий нет"}</div>
              <div className="event-timer">
                {nearestFutureEvent ? (
                  nearestEventCountdown.value === "сегодня" ? (
                    <>сегодня</>
                  ) : (
                    <>
                      <span>через</span>
                      {nearestEventCountdown.value}
                      <span>{nearestEventCountdown.suffix}</span>
                    </>
                  )
                ) : (
                  <span>{nearestEventCountdown.suffix}</span>
                )}
              </div>
            </div>
            <div className={`status-badge ${nearestFutureEvent?.status || "not_started"}`}>
              <span className="status-dot" />
              {nearestEventStatusLabel}
            </div>
          </section>

          <section className={`widget-card small-widget ${!isEditingMode && focusConfig.mode === "attention" ? "focus-attention-widget" : ""}`}>
            {isEditingMode ? (
              <div className="focus-mode-switch">
                <button
                  className={`focus-mode-btn ${focusConfig.mode === "good" ? "active" : ""}`}
                  onClick={() => {
                    const next = { ...focusConfig, mode: "good" as const };
                    setFocusConfig(next);
                  }}
                >
                  Все хорошо
                </button>
                <button
                  className={`focus-mode-btn ${focusConfig.mode === "attention" ? "active" : ""}`}
                  onClick={() => {
                    const next = { ...focusConfig, mode: "attention" as const };
                    setFocusConfig(next);
                  }}
                >
                  Требует внимания
                </button>
              </div>
            ) : null}

            {focusConfig.mode === "good" ? (
              <div className="efficiency-widget">
                <div className="eff-icon">✓</div>
                <div className="eff-text">Все хорошо</div>
                <div className="eff-sub">Общий показатель эффективности</div>
              </div>
            ) : (
              <>
                <div className="focus-label">
                  <span className="urgency-indicator" />
                  Фокус внимания
                </div>

                {isEditingMode ? (
                  <div className="focus-edit-list">
                    {focusConfig.items.map((item, idx) => (
                      <div className="focus-edit-row" key={`focus-item-${idx}`}>
                        <input
                          className="focus-edit-input"
                          value={item}
                          onChange={(event) => {
                            const nextItems = focusConfig.items.map((current, currentIdx) =>
                              currentIdx === idx ? event.target.value : current,
                            );
                            setFocusConfig((prev) => ({ ...prev, items: nextItems }));
                          }}
                          onBlur={() => {
                            const sanitized = focusConfig.items.map((line) => line.trim()).filter(Boolean);
                            const next = {
                              ...focusConfig,
                              items: sanitized.length > 0 ? sanitized : ["Новый пункт фокуса"],
                            };
                            setFocusConfig(next);
                          }}
                        />
                        <button
                          className="focus-remove-btn"
                          onClick={() => {
                            const nextItems = focusConfig.items.filter((_, currentIdx) => currentIdx !== idx);
                            const normalized = nextItems.length > 0 ? nextItems : ["Новый пункт фокуса"];
                            const next = { ...focusConfig, items: normalized };
                            setFocusConfig(next);
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                    <button
                      className="focus-add-btn"
                      onClick={() => {
                        setFocusConfig((prev) => ({ ...prev, items: [...prev.items, "Новый пункт фокуса"] }));
                      }}
                    >
                      Добавить пункт
                    </button>
                  </div>
                ) : (
                  <ul className="focus-problem-list">
                    {focusConfig.items.map((item, idx) => (
                      <li key={`focus-item-view-${idx}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
