import { startTransition, useEffect, useRef, useState, type ReactNode } from 'react';
import { useOutletContext } from 'react-router';
import {
  ArrowDownRight,
  ArrowDown,
  ArrowUpRight,
  ArrowUp,
  CircleCheck,
  Copy,
  Loader2,
  Palette,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { PasswordModal } from '../components/PasswordModal';
import { mboAPI } from '../utils/api';

interface OutletContext {
  isEditingMode: boolean;
  setIsEditingMode: (value: boolean) => void;
}

type MboPaletteId = 'cyan' | 'violet' | 'lagoon' | 'magenta' | 'sand';
type MetricTone = 'primary' | 'secondary' | 'tertiary' | 'muted' | 'warning' | 'danger';
type TrendTone = 'positive' | 'negative' | 'neutral' | 'warning' | 'none';
type InsightStyle = 'paragraph' | 'list';
type InsightTone = 'default' | 'warning' | 'success';

interface MboMetric {
  id: string;
  label: string;
  topLabel: string;
  value: string;
  delta: string;
  trendTone: TrendTone;
  footnote: string;
  plan: string;
  fact: string;
  progress: number;
  barTone: MetricTone;
}

interface MboInsightCard {
  id: string;
  title: string;
  style: InsightStyle;
  items: string[];
  tone: InsightTone;
}

interface MboSection {
  id: string;
  title: string;
  badge: string;
  paletteId: MboPaletteId;
  metrics: MboMetric[];
  insights: MboInsightCard[];
}

interface MboPageData {
  headerTitle: string;
  headerSubtitle: string;
  liveLabel: string;
  sections: MboSection[];
}

interface PageSnapshot {
  rowId: string | null;
  updatedAt: string | null;
}

interface EditableFieldProps {
  editing: boolean;
  value: string;
  onChange: (value: string) => void;
  className: string;
  inputClassName?: string;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
}

interface ThemeOption {
  id: MboPaletteId;
  name: string;
  sectionBorderClass: string;
  titleClass: string;
  badgeClass: string;
  badgeDotClass: string;
  softGlowClass: string;
  outlineClass: string;
  bulletClass: string;
}

const DASHBOARD_WIDGET_CARD_CLASS = 'mbo-widget-glow relative overflow-hidden';

const PRIMARY_ACTION_CLASS =
  'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/50 shadow-lg shadow-emerald-500/30 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl';
const SECONDARY_ACTION_CLASS =
  'bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm backdrop-blur-xl';
const DANGER_ACTION_CLASS =
  'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm';

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'cyan',
    name: 'Neon Cyan',
    sectionBorderClass: 'border-cyan-400/30',
    titleClass: 'text-cyan-300',
    badgeClass: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
    badgeDotClass: 'bg-cyan-300',
    softGlowClass: 'shadow-[0_0_24px_rgba(34,211,238,0.14)]',
    outlineClass: 'hover:border-cyan-300/50',
    bulletClass: 'bg-cyan-300',
  },
  {
    id: 'violet',
    name: 'Soft Violet',
    sectionBorderClass: 'border-violet-400/25',
    titleClass: 'text-violet-200',
    badgeClass: 'bg-violet-400/10 text-violet-200 border-violet-400/20',
    badgeDotClass: 'bg-violet-300',
    softGlowClass: 'shadow-[0_0_24px_rgba(167,139,250,0.14)]',
    outlineClass: 'hover:border-violet-300/50',
    bulletClass: 'bg-violet-300',
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    sectionBorderClass: 'border-sky-300/25',
    titleClass: 'text-sky-200',
    badgeClass: 'bg-sky-400/10 text-sky-200 border-sky-400/20',
    badgeDotClass: 'bg-sky-300',
    softGlowClass: 'shadow-[0_0_24px_rgba(56,189,248,0.12)]',
    outlineClass: 'hover:border-sky-300/50',
    bulletClass: 'bg-sky-300',
  },
  {
    id: 'magenta',
    name: 'Magenta',
    sectionBorderClass: 'border-fuchsia-400/25',
    titleClass: 'text-fuchsia-200',
    badgeClass: 'bg-fuchsia-400/10 text-fuchsia-200 border-fuchsia-400/20',
    badgeDotClass: 'bg-fuchsia-300',
    softGlowClass: 'shadow-[0_0_24px_rgba(232,121,249,0.14)]',
    outlineClass: 'hover:border-fuchsia-300/50',
    bulletClass: 'bg-fuchsia-300',
  },
  {
    id: 'sand',
    name: 'Sand',
    sectionBorderClass: 'border-amber-200/30',
    titleClass: 'text-amber-50',
    badgeClass: 'bg-amber-100/10 text-amber-100 border-amber-100/20',
    badgeDotClass: 'bg-amber-200',
    softGlowClass: 'shadow-[0_0_24px_rgba(251,191,36,0.10)]',
    outlineClass: 'hover:border-amber-100/40',
    bulletClass: 'bg-amber-200',
  },
];

const BAR_TONE_CLASSES: Record<MetricTone, string> = {
  primary: 'bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.2)]',
  secondary: 'bg-fuchsia-500 shadow-[0_0_16px_rgba(217,70,239,0.2)]',
  tertiary: 'bg-lime-300 shadow-[0_0_16px_rgba(163,230,53,0.2)]',
  muted: 'bg-white/35',
  warning: 'bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.18)]',
  danger: 'bg-rose-400 shadow-[0_0_16px_rgba(251,113,133,0.18)]',
};

const TREND_TONE_CLASSES: Record<TrendTone, string> = {
  positive: 'text-emerald-400',
  negative: 'text-rose-400',
  neutral: 'text-slate-300',
  warning: 'text-amber-300',
  none: 'text-slate-500',
};

const INSIGHT_TONE_CLASSES: Record<InsightTone, string> = {
  default: 'text-slate-200',
  success: 'text-lime-200',
  warning: 'text-amber-100',
};

const VIEW_SECTION_THEME: Record<
  MboPaletteId,
  {
    titleClass: string;
    badgeClass: string;
    metricAccentClass: string;
    progressClass: string;
    sectionBorderClass: string;
    insightCardClass: string;
    bulletClass: string;
  }
> = {
  cyan: {
    titleClass: 'text-cyan-300',
    badgeClass: 'bg-cyan-400/10 text-cyan-300',
    metricAccentClass: 'text-cyan-300',
    progressClass: 'bg-cyan-300 shadow-[0_0_15px_rgba(0,219,233,0.15)]',
    sectionBorderClass: 'border-white/8',
    insightCardClass: 'border-[#445357] bg-[#1f1f23]',
    bulletClass: 'bg-cyan-300',
  },
  violet: {
    titleClass: 'text-violet-200',
    badgeClass: 'bg-fuchsia-500/10 text-violet-200',
    metricAccentClass: 'text-violet-200',
    progressClass: 'bg-fuchsia-500 shadow-[0_0_15px_rgba(182,0,248,0.15)]',
    sectionBorderClass: 'border-white/8',
    insightCardClass: 'border-[#445357] bg-[#1f1f23]',
    bulletClass: 'bg-violet-300',
  },
  lagoon: {
    titleClass: 'text-cyan-300',
    badgeClass: 'bg-cyan-400/10 text-cyan-300',
    metricAccentClass: 'text-lime-200',
    progressClass: 'bg-lime-300 shadow-[0_0_15px_rgba(0,219,233,0.15)]',
    sectionBorderClass: 'border-white/8',
    insightCardClass: 'border-[#445357] bg-[#1f1f23]',
    bulletClass: 'bg-cyan-300',
  },
  magenta: {
    titleClass: 'text-violet-200',
    badgeClass: 'bg-fuchsia-500/10 text-violet-200',
    metricAccentClass: 'text-violet-200',
    progressClass: 'bg-fuchsia-500 shadow-[0_0_15px_rgba(182,0,248,0.15)]',
    sectionBorderClass: 'border-white/8',
    insightCardClass: 'border-[#445357] bg-[#1f1f23]',
    bulletClass: 'bg-violet-300',
  },
  sand: {
    titleClass: 'text-slate-50',
    badgeClass: 'bg-slate-100/10 text-slate-100',
    metricAccentClass: 'text-amber-100',
    progressClass: 'bg-slate-400/50',
    sectionBorderClass: 'border-violet-300/30',
    insightCardClass: 'border-[#445357] bg-[#1f1f23]',
    bulletClass: 'bg-amber-200',
  },
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function parseMetricNumber(value: string) {
  const compact = value.replace(/\s+/g, '').trim();
  const normalized = compact
    .replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMetricProgress(metric: Pick<MboMetric, 'fact' | 'plan' | 'progress'>) {
  const fact = parseMetricNumber(metric.fact);
  const plan = parseMetricNumber(metric.plan);

  if (fact === null || plan === null || plan <= 0) {
    return clampProgress(metric.progress);
  }

  return clampProgress((fact / plan) * 100);
}

function isMissingMboTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes("Could not find the table 'public.mbo_pages'") || message.includes("relation \"mbo_pages\" does not exist");
}

function isSameData(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getThemeById(paletteId: MboPaletteId) {
  return THEME_OPTIONS.find((theme) => theme.id === paletteId) || THEME_OPTIONS[0];
}

function createMetric(initial?: Partial<MboMetric>): MboMetric {
  return {
    id: createId('metric'),
    label: 'Новая метрика',
    topLabel: 'НОВАЯ ЦЕЛЬ',
    value: '0',
    delta: '0%',
    trendTone: 'neutral',
    footnote: 'Пояснение',
    plan: '100',
    fact: '50',
    progress: 50,
    barTone: 'primary',
    ...initial,
  };
}

function createInsight(initial?: Partial<MboInsightCard>): MboInsightCard {
  return {
    id: createId('insight'),
    title: 'Фокус внимания',
    style: 'paragraph',
    tone: 'default',
    items: ['Новый тезис'],
    ...initial,
  };
}

function createSection(initial?: Partial<MboSection>): MboSection {
  return {
    id: createId('section'),
    title: 'Новая секция',
    badge: 'НОВАЯ ТЕМА',
    paletteId: 'cyan',
    metrics: [createMetric()],
    insights: [createInsight()],
    ...initial,
  };
}

function createDefaultMboData(): MboPageData {
  return {
    headerTitle: 'Command Center',
    headerSubtitle: 'Executive Dashboard • Q2 2026',
    liveLabel: 'ИЮНЬ',
    sections: [
      createSection({
        title: 'SPOTLIGHT',
        badge: 'SEARCH & SPOTLIGHT',
        paletteId: 'cyan',
        metrics: [
          createMetric({
            label: 'MAU (Общий умный поиск)',
            topLabel: 'прогноз роста x1.8',
            value: '125,000',
            delta: '+56%',
            trendTone: 'positive',
            footnote: 'vs 80,000 Q1',
            plan: '147,000',
            fact: '125,000',
            progress: 85,
            barTone: 'primary',
          }),
          createMetric({
            label: 'MAU Spotlight (KPI)',
            topLabel: 'RUN-RATE 199.8%',
            value: '53,700',
            delta: '+153%',
            trendTone: 'positive',
            footnote: 'План: 35,000',
            plan: '35,000',
            fact: '53,700',
            progress: 100,
            barTone: 'secondary',
          }),
          createMetric({
            label: 'Sticky Factor',
            topLabel: '91% ПЛАНА',
            value: '6.2%',
            delta: '-0.8%',
            trendTone: 'negative',
            footnote: 'План: 7%',
            plan: '7',
            fact: '6.2',
            progress: 91,
            barTone: 'muted',
          }),
        ],
        insights: [
          createInsight({
            title: 'Запуски квартала',
            items: ['Релиз умного поиска V2 (Spotlight Expansion) — завершено.'],
          }),
          createInsight({
            title: 'Фокус внимания',
            items: ['Стабилизация Sticky Factor через персонализированные подсказки.'],
          }),
        ],
      }),
      createSection({
        title: 'ПЕРСОНАЛИЗАЦИЯ',
        badge: 'SMART UX',
        paletteId: 'violet',
        metrics: [
          createMetric({
            label: 'Метрики квартала',
            topLabel: 'В ОПРЕДЕЛЕНИИ',
            value: 'VOC персон',
            delta: 'NA',
            trendTone: 'neutral',
            footnote: 'TBD',
            plan: '100',
            fact: '15',
            progress: 15,
            barTone: 'secondary',
          }),
        ],
        insights: [
          createInsight({
            title: 'Запуски квартала',
            items: ['Запуск MVP персонализации в ММБ. АБ: 10к, АБМ: тест. Релиз: 22.05'],
          }),
          createInsight({
            title: 'Фокус внимания',
            style: 'list',
            items: ['Встреча ДРЦКЮЛ и ММБ (Май)', 'Встреча с Осиным (Июнь) — ожидаем орг.'],
          }),
        ],
      }),
      createSection({
        title: 'ПРОДАЖИ (ПЛАТФОРМА)',
        badge: 'STABILITY',
        paletteId: 'lagoon',
        metrics: [
          createMetric({
            label: 'Доля потерянных просмотров',
            topLabel: 'EXCELLENT',
            value: '0.6%',
            delta: '-0.2%',
            trendTone: 'positive',
            footnote: 'План: <3.8%',
            plan: '3.8',
            fact: '0.6',
            progress: 15,
            barTone: 'tertiary',
          }),
          createMetric({
            label: 'SLA (Uptime)',
            topLabel: 'STABLE',
            value: '99.9%',
            delta: '100%',
            trendTone: 'positive',
            footnote: 'Target: 99.5%',
            plan: '99.5',
            fact: '99.9',
            progress: 100,
            barTone: 'primary',
          }),
        ],
        insights: [
          createInsight({
            title: 'Запуски квартала',
            items: ['пока без запусков'],
          }),
          createInsight({
            title: 'Фокус внимания',
            items: ['нет критических точек'],
          }),
        ],
      }),
      createSection({
        title: 'ПРОДАЖИ (ММБ)',
        badge: 'REVENUE FLOW',
        paletteId: 'magenta',
        metrics: [
          createMetric({
            label: 'Объем цифровых вторичных продаж',
            topLabel: 'RUN-RATE 115%',
            value: '106,299',
            delta: '+15%',
            trendTone: 'positive',
            footnote: 'План: 192,386',
            plan: '192,386',
            fact: '106,299',
            progress: 55,
            barTone: 'secondary',
          }),
        ],
        insights: [
          createInsight({
            title: 'Запуски квартала',
            items: ['пока без запусков'],
          }),
          createInsight({
            title: 'Фокус внимания',
            items: ['нет критических точек'],
          }),
        ],
      }),
      createSection({
        title: 'ПРОДАЖИ (СКБ)',
        badge: 'REVENUE FLOW',
        paletteId: 'sand',
        metrics: [
          createMetric({
            label: 'Объем цифровых вторичных продаж',
            topLabel: 'НЕТ ДАННЫХ',
            value: '—',
            delta: 'NA',
            trendTone: 'warning',
            footnote: 'Ожидание сверки',
            plan: '0',
            fact: '0',
            progress: 0,
            barTone: 'muted',
          }),
        ],
        insights: [
          createInsight({
            title: 'Запуски квартала',
            items: ['пока без запусков'],
          }),
          createInsight({
            title: 'Фокус внимания',
            tone: 'warning',
            items: ['План на Q2 пересмотрен +5%. Необходима актуализация источников данных.'],
          }),
        ],
      }),
    ],
  };
}

function normalizeMetric(metric: any): MboMetric {
  return createMetric({
    id: typeof metric?.id === 'string' ? metric.id : createId('metric'),
    label: typeof metric?.label === 'string' ? metric.label : 'Новая метрика',
    topLabel: typeof metric?.topLabel === 'string' ? metric.topLabel : '',
    value: typeof metric?.value === 'string' ? metric.value : String(metric?.value ?? '0'),
    delta: typeof metric?.delta === 'string' ? metric.delta : '0%',
    trendTone:
      metric?.trendTone === 'positive' ||
      metric?.trendTone === 'negative' ||
      metric?.trendTone === 'neutral' ||
      metric?.trendTone === 'warning' ||
      metric?.trendTone === 'none'
        ? metric.trendTone
        : 'neutral',
    footnote: typeof metric?.footnote === 'string' ? metric.footnote : '',
    plan: typeof metric?.plan === 'string' ? metric.plan : String(metric?.plan ?? '0'),
    fact: typeof metric?.fact === 'string' ? metric.fact : String(metric?.fact ?? '0'),
    progress: clampProgress(Number(metric?.progress ?? 0)),
    barTone:
      metric?.barTone === 'primary' ||
      metric?.barTone === 'secondary' ||
      metric?.barTone === 'tertiary' ||
      metric?.barTone === 'muted' ||
      metric?.barTone === 'warning' ||
      metric?.barTone === 'danger'
        ? metric.barTone
        : 'primary',
  });
}

function normalizeInsight(card: any): MboInsightCard {
  const rawItems = Array.isArray(card?.items) ? card.items : [];
  const items = rawItems
    .map((item: unknown) => (typeof item === 'string' ? item : ''))
    .filter((item: string) => item.trim().length > 0);

  return createInsight({
    id: typeof card?.id === 'string' ? card.id : createId('insight'),
    title: typeof card?.title === 'string' ? card.title : 'Фокус внимания',
    style: card?.style === 'list' ? 'list' : 'paragraph',
    tone: card?.tone === 'warning' || card?.tone === 'success' ? card.tone : 'default',
    items: items.length > 0 ? items : ['Новый тезис'],
  });
}

function normalizeSection(section: any): MboSection {
  const paletteId = THEME_OPTIONS.some((theme) => theme.id === section?.paletteId)
    ? section.paletteId
    : 'cyan';
  const metrics = Array.isArray(section?.metrics) ? section.metrics.map(normalizeMetric) : [];
  const insights = Array.isArray(section?.insights) ? section.insights.map(normalizeInsight) : [];

  return createSection({
    id: typeof section?.id === 'string' ? section.id : createId('section'),
    title: typeof section?.title === 'string' ? section.title : 'Новая секция',
    badge: typeof section?.badge === 'string' ? section.badge : 'НОВАЯ ТЕМА',
    paletteId,
    metrics: metrics.length > 0 ? metrics : [createMetric()],
    insights: insights.length > 0 ? insights : [createInsight()],
  });
}

function normalizePageData(raw: any): MboPageData {
  const fallback = createDefaultMboData();
  const sections = Array.isArray(raw?.sections) ? raw.sections.map(normalizeSection) : fallback.sections;
  const normalizedSections = sections.map((section, index) => {
    let nextSection = section;

    if (index === 0) {
      if (nextSection.title === 'AI-READY') {
        nextSection = { ...nextSection, title: 'SPOTLIGHT' };
      }

      const firstMetric = nextSection.metrics[0];
      if (firstMetric?.label === 'MAU Общий умный поиск' || firstMetric?.topLabel === 'РОСТ x1.8') {
        nextSection = {
          ...nextSection,
          metrics: nextSection.metrics.map((metric, metricIndex) =>
            metricIndex === 0
              ? {
                  ...metric,
                  label:
                    metric.label === 'MAU Общий умный поиск'
                      ? 'MAU (Общий умный поиск)'
                      : metric.label,
                  topLabel:
                    metric.topLabel === 'РОСТ x1.8'
                      ? 'прогноз роста x1.8'
                      : metric.topLabel,
                }
              : metric,
          ),
        };
      }
    }

    if (nextSection.title === 'ПРОДАЖИ (ПЛАТФОРМА)' && nextSection.badge === 'ECOSYSTEM') {
      nextSection = { ...nextSection, badge: 'STABILITY' };
    }

    if (nextSection.title === 'ПРОДАЖИ (СКБ)' && nextSection.badge === 'RISK SECTOR') {
      nextSection = { ...nextSection, badge: 'REVENUE FLOW' };
    }

    return nextSection;
  });

  return {
    headerTitle: typeof raw?.headerTitle === 'string' ? raw.headerTitle : fallback.headerTitle,
    headerSubtitle:
      raw?.headerSubtitle === 'Executive Dashboard • MBO'
        ? fallback.headerSubtitle
        : typeof raw?.headerSubtitle === 'string'
          ? raw.headerSubtitle
          : fallback.headerSubtitle,
    liveLabel:
      raw?.liveLabel === 'SYSTEM LIVE'
        ? fallback.liveLabel
        : typeof raw?.liveLabel === 'string'
          ? raw.liveLabel
          : fallback.liveLabel,
    sections: normalizedSections.length > 0 ? normalizedSections : fallback.sections,
  };
}

function mergeSections(
  baseSections: MboSection[],
  localSections: MboSection[],
  latestSections: MboSection[],
) {
  const baseMap = new Map(baseSections.map((section) => [section.id, section]));
  const localMap = new Map(localSections.map((section) => [section.id, section]));
  const latestMap = new Map(latestSections.map((section) => [section.id, section]));

  const baseOrder = baseSections.map((section) => section.id);
  const localOrder = localSections.map((section) => section.id);
  const latestOrder = latestSections.map((section) => section.id);
  const localOrderChanged = !isSameData(baseOrder, localOrder);

  const mergedIds = localOrderChanged ? [...localOrder] : [...latestOrder];

  for (const id of localOrder) {
    if (!mergedIds.includes(id)) {
      mergedIds.push(id);
    }
  }

  for (const id of latestOrder) {
    if (!mergedIds.includes(id)) {
      mergedIds.push(id);
    }
  }

  const merged: MboSection[] = [];
  for (const id of mergedIds) {
    const baseSection = baseMap.get(id);
    const localSection = localMap.get(id);
    const latestSection = latestMap.get(id);

    if (localSection && !baseSection) {
      merged.push(localSection);
      continue;
    }

    if (baseSection && !localSection) {
      continue;
    }

    if (localSection && baseSection && !isSameData(localSection, baseSection)) {
      merged.push(localSection);
      continue;
    }

    if (latestSection) {
      merged.push(latestSection);
      continue;
    }

    if (localSection) {
      merged.push(localSection);
    }
  }

  return merged;
}

function mergeMboData(baseData: MboPageData, localData: MboPageData, latestData: MboPageData): MboPageData {
  return {
    headerTitle: !isSameData(localData.headerTitle, baseData.headerTitle)
      ? localData.headerTitle
      : latestData.headerTitle,
    headerSubtitle: !isSameData(localData.headerSubtitle, baseData.headerSubtitle)
      ? localData.headerSubtitle
      : latestData.headerSubtitle,
    liveLabel: !isSameData(localData.liveLabel, baseData.liveLabel)
      ? localData.liveLabel
      : latestData.liveLabel,
    sections: mergeSections(baseData.sections, localData.sections, latestData.sections),
  };
}

function EditableField({
  editing,
  value,
  onChange,
  className,
  inputClassName,
  placeholder,
  rows = 3,
  multiline = false,
}: EditableFieldProps) {
  if (!editing) {
    return <div className={className}>{value}</div>;
  }

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={inputClassName || className}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={inputClassName || className}
    />
  );
}

function LabeledControl({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="min-w-0">
      <div className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-400">{label}</div>
      {children}
    </label>
  );
}

function getDeltaVisual(metric: MboMetric) {
  if (metric.trendTone === 'positive') {
    if (metric.delta === '100%') {
      return {
        icon: <CircleCheck size={14} strokeWidth={2.25} />,
        className: 'text-emerald-400',
      };
    }
    return {
      icon: <ArrowUpRight size={14} strokeWidth={2.25} />,
      className: 'text-emerald-400',
    };
  }

  if (metric.trendTone === 'negative') {
    return {
      icon: <ArrowDownRight size={14} strokeWidth={2.25} />,
      className: 'text-rose-400',
    };
  }

  if (metric.trendTone === 'warning') {
    return {
      icon: null,
      className: 'text-amber-200',
    };
  }

  return {
    icon: null,
    className: 'text-slate-400',
  };
}

function MboPageSection({
  section,
  index,
  totalSections,
  editing,
  onSectionChange,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
}: {
  section: MboSection;
  index: number;
  totalSections: number;
  editing: boolean;
  onSectionChange: (nextSection: MboSection) => void;
  onMoveSection: (sectionId: string, direction: 'up' | 'down') => void;
  onDuplicateSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
}) {
  const theme = getThemeById(section.paletteId);
  const viewTheme = VIEW_SECTION_THEME[section.paletteId];

  const updateMetric = (metricId: string, updates: Partial<MboMetric>) => {
    onSectionChange({
      ...section,
      metrics: section.metrics.map((metric) =>
        metric.id === metricId ? { ...metric, ...updates } : metric,
      ),
    });
  };

  const addMetric = () => {
    onSectionChange({
      ...section,
      metrics: [...section.metrics, createMetric({ barTone: section.paletteId === 'sand' ? 'warning' : 'primary' })],
    });
  };

  const deleteMetric = (metricId: string) => {
    onSectionChange({
      ...section,
      metrics: section.metrics.filter((metric) => metric.id !== metricId),
    });
  };

  const updateInsight = (insightId: string, updates: Partial<MboInsightCard>) => {
    onSectionChange({
      ...section,
      insights: section.insights.map((card) =>
        card.id === insightId ? { ...card, ...updates } : card,
      ),
    });
  };

  const addInsight = () => {
    onSectionChange({
      ...section,
      insights: [...section.insights, createInsight()],
    });
  };

  const deleteInsight = (insightId: string) => {
    onSectionChange({
      ...section,
      insights: section.insights.filter((card) => card.id !== insightId),
    });
  };

  const updateInsightItem = (insightId: string, itemIndex: number, value: string) => {
    onSectionChange({
      ...section,
      insights: section.insights.map((card) =>
        card.id === insightId
          ? {
              ...card,
              items: card.items.map((item, index) => (index === itemIndex ? value : item)),
            }
          : card,
      ),
    });
  };

  const addInsightItem = (insightId: string) => {
    onSectionChange({
      ...section,
      insights: section.insights.map((card) =>
        card.id === insightId
          ? {
              ...card,
              items: [...card.items, card.style === 'list' ? 'Новый пункт списка' : 'Новый тезис'],
            }
          : card,
      ),
    });
  };

  const deleteInsightItem = (insightId: string, itemIndex: number) => {
    onSectionChange({
      ...section,
      insights: section.insights.map((card) =>
        card.id === insightId
          ? {
              ...card,
              items: card.items.filter((_, index) => index !== itemIndex),
            }
          : card,
      ),
    });
  };

  if (!editing) {
    return (
      <section
        className={`${DASHBOARD_WIDGET_CARD_CLASS} rounded-[24px] border bg-[#161616] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${viewTheme.sectionBorderClass} ${section.paletteId === 'sand' ? 'border-l-4 border-l-rose-300/35' : ''}`}
      >
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-start md:justify-between">
          <h2 className={`text-[32px] font-semibold uppercase leading-none tracking-[-0.01em] ${viewTheme.titleClass}`}>
            {section.title}
          </h2>
          <div className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium uppercase tracking-[0.12em] ${viewTheme.badgeClass}`}>
            {section.badge}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 pt-8 md:grid-cols-2">
          <div className="space-y-6">
            {section.metrics.map((metric) => {
              const progress = getMetricProgress(metric);
              const deltaVisual = getDeltaVisual(metric);
              const hasNumericValue = parseMetricNumber(metric.value) !== null;
              const valueClassName = hasNumericValue
                ? 'text-[48px] font-bold leading-none tracking-[-0.03em] text-white'
                : 'text-[34px] font-bold leading-[0.92] tracking-[-0.03em] text-white md:text-[42px]';

              return (
                <div key={metric.id} className="space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-[14px] text-slate-400 md:text-[15px]">{metric.label}</span>
                    <span className={`text-[12px] font-bold tracking-[0.05em] ${viewTheme.metricAccentClass}`}>
                      {metric.topLabel}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                      <div className="flex min-w-0 items-baseline gap-3">
                        <span className={valueClassName}>
                          {metric.value}
                        </span>
                        <div className={`flex items-center gap-1 text-[18px] font-bold ${deltaVisual.className}`}>
                          {deltaVisual.icon}
                          <span>{metric.delta}</span>
                        </div>
                      </div>
                      <span className="text-[16px] text-slate-400">{metric.footnote}</span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-white/12">
                      <div
                        className={`h-full rounded-full transition-all ${viewTheme.progressClass}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {section.insights.map((insight) => (
              <div key={insight.id} className={`rounded-[24px] border p-6 ${viewTheme.insightCardClass}`}>
                <h4 className="mb-3 text-[12px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  {insight.title}
                </h4>

                {insight.style === 'list' ? (
                  <ul className="space-y-2 text-[16px] leading-8 text-slate-200">
                    {insight.items.map((item, itemIndex) => (
                      <li key={`${insight.id}-${itemIndex}`} className="flex items-start gap-3">
                        <span className={`mt-3 h-1.5 w-1.5 rounded-full ${viewTheme.bulletClass}`} />
                        <span className={INSIGHT_TONE_CLASSES[insight.tone]}>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-3">
                    {insight.items.map((item, itemIndex) => (
                      <p
                        key={`${insight.id}-${itemIndex}`}
                        className={`text-[16px] leading-8 ${INSIGHT_TONE_CLASSES[insight.tone]} ${item.trim().startsWith('пока') || item.trim().startsWith('нет ') ? 'italic' : ''}`}
                      >
                        {item}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${DASHBOARD_WIDGET_CARD_CLASS} rounded-[24px] border bg-[#1b1b1f] p-8 backdrop-blur-xl shadow-2xl shadow-black/20 ${theme.sectionBorderClass} ${theme.softGlowClass}`}
    >
      <div className="mb-6 flex flex-col gap-6 border-b border-white/10 pb-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="min-w-0">
            <EditableField
              editing={editing}
              value={section.title}
              onChange={(value) => onSectionChange({ ...section, title: value })}
              className={`text-3xl font-semibold uppercase tracking-tight ${theme.titleClass}`}
              inputClassName="w-full rounded-[20px] border border-white/10 bg-[#101010] px-5 py-4 text-3xl font-semibold uppercase tracking-tight text-white outline-none focus:border-cyan-300/50"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <EditableField
              editing={editing}
              value={section.badge}
              onChange={(value) => onSectionChange({ ...section, badge: value })}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${theme.badgeClass}`}
              inputClassName="w-full rounded-full border border-white/10 bg-[#101010] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-white outline-none focus:border-cyan-300/50"
            />

            {editing && (
              <div className="w-full rounded-[20px] border border-white/10 bg-[#101010] p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <Palette size={12} />
                  Цветовая тема секции
                </div>
                <div className="flex flex-wrap gap-2">
                  {THEME_OPTIONS.map((option) => {
                    const selected = option.id === section.paletteId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onSectionChange({ ...section, paletteId: option.id })}
                        className={`rounded-full border px-4 py-2 text-sm transition-all ${selected ? `${option.badgeClass} shadow-lg` : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                      >
                        {option.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {editing && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onMoveSection(section.id, 'up')}
              disabled={index === 0}
              className={`${SECONDARY_ACTION_CLASS} px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <ArrowUp size={16} />
              Выше
            </button>
            <button
              type="button"
              onClick={() => onMoveSection(section.id, 'down')}
              disabled={index === totalSections - 1}
              className={`${SECONDARY_ACTION_CLASS} px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <ArrowDown size={16} />
              Ниже
            </button>
            <button
              type="button"
              onClick={() => onDuplicateSection(section.id)}
              className={`${SECONDARY_ACTION_CLASS} px-3 py-2`}
            >
              <Copy size={16} />
              Дублировать
            </button>
            <button
              type="button"
              onClick={() => onDeleteSection(section.id)}
              className={DANGER_ACTION_CLASS}
            >
              <Trash2 size={16} />
              Удалить секцию
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6 min-w-0">
          {section.metrics.map((metric) => (
            <div key={metric.id} className="rounded-[24px] border border-white/10 bg-[#232328] p-5 transition-all">
              {(() => {
                const progress = getMetricProgress(metric);

                return (
                  <>
              <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
                <EditableField
                  editing={editing}
                  value={metric.label}
                  onChange={(value) => updateMetric(metric.id, { label: value })}
                  className="text-sm text-slate-400"
                  inputClassName="min-h-[64px] w-full rounded-[20px] border border-white/10 bg-[#0d0d0d] px-5 py-4 text-sm text-white outline-none focus:border-cyan-300/50"
                  multiline={editing}
                  rows={2}
                />
                <EditableField
                  editing={editing}
                  value={metric.topLabel}
                  onChange={(value) => updateMetric(metric.id, { topLabel: value })}
                  className={`text-xs font-semibold tracking-[0.08em] ${theme.titleClass}`}
                  inputClassName="min-h-[64px] w-full rounded-[20px] border border-white/10 bg-[#0d0d0d] px-5 py-4 text-xs font-semibold tracking-[0.08em] text-white outline-none focus:border-cyan-300/50 md:text-right"
                  multiline={editing}
                  rows={2}
                />
              </div>

              <div className="mb-4 space-y-3">
                <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_180px]">
                  <EditableField
                    editing={editing}
                    value={metric.value}
                    onChange={(value) => updateMetric(metric.id, { value })}
                    className="text-[2rem] font-bold leading-none text-white md:text-[2.35rem]"
                    inputClassName="w-full min-w-[140px] rounded-[20px] border border-white/10 bg-[#0d0d0d] px-5 py-4 text-3xl font-bold text-white outline-none focus:border-cyan-300/50"
                  />
                  <EditableField
                    editing={editing}
                    value={metric.delta}
                    onChange={(value) => updateMetric(metric.id, { delta: value })}
                    className={`pb-1 text-lg font-semibold md:text-[18px] ${TREND_TONE_CLASSES[metric.trendTone]} self-end`}
                    inputClassName="w-full min-w-[100px] rounded-[20px] border border-white/10 bg-[#0d0d0d] px-5 py-4 text-base font-semibold text-white outline-none focus:border-cyan-300/50"
                  />
                </div>
                <EditableField
                  editing={editing}
                  value={metric.footnote}
                  onChange={(value) => updateMetric(metric.id, { footnote: value })}
                  className="text-sm text-slate-400"
                  inputClassName="min-h-[64px] w-full rounded-[20px] border border-white/10 bg-[#0d0d0d] px-5 py-4 text-sm text-white outline-none focus:border-cyan-300/50"
                  multiline={editing}
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all ${BAR_TONE_CLASSES[metric.barTone]}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {editing && (
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(0,140px)_minmax(0,140px)_minmax(0,180px)_minmax(0,180px)_140px]">
                    <LabeledControl label="Факт">
                      <input
                        type="text"
                        value={metric.fact}
                        onChange={(event) =>
                          updateMetric(metric.id, {
                            fact: event.target.value,
                          })
                        }
                        className="w-full rounded-[16px] border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                      />
                    </LabeledControl>
                    <LabeledControl label="План">
                      <input
                        type="text"
                        value={metric.plan}
                        onChange={(event) =>
                          updateMetric(metric.id, {
                            plan: event.target.value,
                          })
                        }
                        className="w-full rounded-[16px] border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                      />
                    </LabeledControl>
                    <LabeledControl label="Тренд">
                      <select
                        value={metric.trendTone}
                        onChange={(event) =>
                          updateMetric(metric.id, {
                            trendTone: event.target.value as TrendTone,
                          })
                        }
                        className="w-full rounded-[16px] border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                      >
                        <option value="positive">Positive</option>
                        <option value="negative">Negative</option>
                        <option value="neutral">Neutral</option>
                        <option value="warning">Warning</option>
                        <option value="none">None</option>
                      </select>
                    </LabeledControl>
                    <LabeledControl label="Цвет бара">
                      <select
                        value={metric.barTone}
                        onChange={(event) =>
                          updateMetric(metric.id, {
                            barTone: event.target.value as MetricTone,
                          })
                        }
                        className="w-full rounded-[16px] border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="tertiary">Tertiary</option>
                        <option value="muted">Muted</option>
                        <option value="warning">Warning</option>
                        <option value="danger">Danger</option>
                      </select>
                    </LabeledControl>
                    <button
                      type="button"
                      onClick={() => deleteMetric(metric.id)}
                      disabled={section.metrics.length === 1}
                      className={`${DANGER_ACTION_CLASS} mt-[22px] min-h-[48px] justify-center disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <Trash2 size={16} />
                      Удалить
                    </button>
                  </div>
                )}
              </div>
                  </>
                );
              })()}
            </div>
          ))}

          {editing && (
            <button type="button" onClick={addMetric} className={`${SECONDARY_ACTION_CLASS} justify-center self-start px-5 py-3`}>
              <Plus size={16} />
              Добавить метрику
            </button>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          {section.insights.map((insight) => (
            <div
              key={insight.id}
              className={`rounded-[24px] border border-white/10 bg-[#232328] p-5 transition-all ${theme.outlineClass}`}
            >
              <div className="mb-4 space-y-4">
                <EditableField
                  editing={editing}
                  value={insight.title}
                  onChange={(value) => updateInsight(insight.id, { title: value })}
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  inputClassName="min-h-[60px] w-full rounded-[20px] border border-white/10 bg-[#0d0d0d] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white outline-none focus:border-cyan-300/50"
                  multiline={editing}
                  rows={2}
                />
                {editing && (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                    <LabeledControl label="Тип блока">
                      <select
                        value={insight.style}
                        onChange={(event) =>
                          updateInsight(insight.id, {
                            style: event.target.value as InsightStyle,
                          })
                        }
                        className="w-full rounded-[16px] border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                      >
                        <option value="paragraph">Текст</option>
                        <option value="list">Список</option>
                      </select>
                    </LabeledControl>
                    <LabeledControl label="Тон">
                      <select
                        value={insight.tone}
                        onChange={(event) =>
                          updateInsight(insight.id, {
                            tone: event.target.value as InsightTone,
                          })
                        }
                        className="w-full rounded-[16px] border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                      >
                        <option value="default">Default</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                      </select>
                    </LabeledControl>
                    <button
                      type="button"
                      onClick={() => deleteInsight(insight.id)}
                      disabled={section.insights.length === 1}
                      className={`${DANGER_ACTION_CLASS} mt-[22px] min-h-[48px] justify-center disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <Trash2 size={14} />
                      Удалить
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {insight.items.map((item, itemIndex) => (
                  <div key={`${insight.id}-${itemIndex}`} className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_120px]">
                    {editing ? (
                      <>
                        {insight.style === 'list' ? (
                          <div className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-[#0d0d0d] px-5 py-4">
                            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${theme.bulletClass}`} />
                            <textarea
                              value={item}
                              onChange={(event) => updateInsightItem(insight.id, itemIndex, event.target.value)}
                              rows={2}
                              className="min-h-[108px] w-full resize-y bg-transparent text-sm text-white outline-none"
                            />
                          </div>
                        ) : (
                          <textarea
                            value={item}
                            onChange={(event) => updateInsightItem(insight.id, itemIndex, event.target.value)}
                            rows={3}
                            className="min-h-[140px] w-full resize-y rounded-[20px] border border-white/10 bg-[#0d0d0d] px-5 py-4 text-sm text-white outline-none focus:border-cyan-300/50"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => deleteInsightItem(insight.id, itemIndex)}
                          disabled={insight.items.length === 1}
                          className={`${DANGER_ACTION_CLASS} h-fit min-h-[48px] justify-center px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          <Trash2 size={14} />
                          Удалить
                        </button>
                      </>
                    ) : insight.style === 'list' ? (
                      <div className="flex items-start gap-3">
                        <span className={`mt-2 h-1.5 w-1.5 rounded-full ${theme.bulletClass}`} />
                        <p className={`text-sm leading-6 ${INSIGHT_TONE_CLASSES[insight.tone]}`}>{item}</p>
                      </div>
                    ) : (
                      <p className={`text-sm leading-6 ${INSIGHT_TONE_CLASSES[insight.tone]}`}>{item}</p>
                    )}
                  </div>
                ))}

                {editing && (
                  <button type="button" onClick={() => addInsightItem(insight.id)} className={`${SECONDARY_ACTION_CLASS} w-full justify-center md:w-auto px-5 py-3`}>
                    <Plus size={14} />
                    Добавить строку
                  </button>
                )}
              </div>
            </div>
          ))}

          {editing && (
            <button type="button" onClick={addInsight} className={`${SECONDARY_ACTION_CLASS} w-full justify-center md:w-auto px-5 py-3`}>
              <Plus size={16} />
              Добавить карточку
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function MboPage() {
  const { isEditingMode, setIsEditingMode } = useOutletContext<OutletContext>();
  const [pageData, setPageData] = useState<MboPageData>(createDefaultMboData());
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<string | null>(null);
  const snapshotRef = useRef<PageSnapshot>({ rowId: null, updatedAt: null });
  const baseDataRef = useRef<MboPageData>(createDefaultMboData());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const snapshot = await mboAPI.getSnapshot();
        const nextData = normalizePageData(snapshot.data || createDefaultMboData());
        setPageData(nextData);
        baseDataRef.current = deepClone(nextData);
        snapshotRef.current = {
          rowId: snapshot.rowId,
          updatedAt: snapshot.updatedAt,
        };
      } catch (error) {
        if (!isMissingMboTableError(error)) {
          console.error('Failed to load MBO page:', error);
        }
        const fallback = createDefaultMboData();
        setPageData(fallback);
        baseDataRef.current = deepClone(fallback);
        snapshotRef.current = { rowId: null, updatedAt: null };
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (isEditingMode && !isEditing) {
      setIsPasswordModalOpen(true);
      return;
    }

    if (!isEditingMode) {
      setIsEditing(false);
      setPageData(deepClone(baseDataRef.current));
    }
  }, [isEditing, isEditingMode]);

  useEffect(() => {
    const unsubscribe = mboAPI.subscribe(async () => {
      if (isEditing) {
        setRemoteStatus('В БД появились внешние изменения. Они будут учтены при сохранении.');
        return;
      }

      try {
        const snapshot = await mboAPI.getSnapshot();
        const nextData = normalizePageData(snapshot.data || createDefaultMboData());
        startTransition(() => {
          setPageData(nextData);
          baseDataRef.current = deepClone(nextData);
          snapshotRef.current = {
            rowId: snapshot.rowId,
            updatedAt: snapshot.updatedAt,
          };
          setRemoteStatus('Страница обновлена из БД.');
        });
      } catch (error) {
        if (!isMissingMboTableError(error)) {
          console.error('Failed to sync MBO page:', error);
        }
      }
    });

    return unsubscribe;
  }, [isEditing]);

  const replaceSection = (sectionId: string, nextSection: MboSection) => {
    setPageData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === sectionId ? nextSection : section)),
    }));
  };

  const addSection = () => {
    setPageData((prev) => ({
      ...prev,
      sections: [...prev.sections, createSection()],
    }));
  };

  const duplicateSection = (sectionId: string) => {
    setPageData((prev) => {
      const index = prev.sections.findIndex((section) => section.id === sectionId);
      if (index < 0) return prev;
      const source = prev.sections[index];
      const duplicate: MboSection = {
        ...deepClone(source),
        id: createId('section'),
        title: `${source.title} копия`,
        metrics: source.metrics.map((metric) => ({ ...metric, id: createId('metric') })),
        insights: source.insights.map((insight) => ({ ...insight, id: createId('insight') })),
      };
      const nextSections = [...prev.sections];
      nextSections.splice(index + 1, 0, duplicate);
      return { ...prev, sections: nextSections };
    });
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setPageData((prev) => {
      const sections = [...prev.sections];
      const index = sections.findIndex((section) => section.id === sectionId);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sections.length) return prev;
      const current = sections[index];
      sections[index] = sections[targetIndex];
      sections[targetIndex] = current;
      return { ...prev, sections };
    });
  };

  const deleteSection = (sectionId: string) => {
    setPageData((prev) => {
      const nextSections = prev.sections.filter((section) => section.id !== sectionId);
      return {
        ...prev,
        sections: nextSections,
      };
    });
  };

  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    setIsEditing(true);
    setSaveError(null);
    setRemoteStatus(null);
  };

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    setIsEditingMode(false);
  };

  const handleCancel = () => {
    setPageData(deepClone(baseDataRef.current));
    setIsEditing(false);
    setIsEditingMode(false);
    setSaveError(null);
    setRemoteStatus(null);
  };

  const handleSave = async () => {
    if (!isEditing) return;

    setLoading(true);
    setSaveError(null);

    try {
      const localData = normalizePageData(pageData);
      const baseData = normalizePageData(baseDataRef.current);
      let attemptSnapshot = { ...snapshotRef.current };
      let mergedData = localData;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const latestSnapshot = await mboAPI.getSnapshot();
        const latestData = normalizePageData(latestSnapshot.data || createDefaultMboData());
        mergedData = mergeMboData(baseData, localData, latestData);

        const saveResult = await mboAPI.saveWithSnapshot(mergedData, attemptSnapshot);
        if (!saveResult.conflict) {
          setPageData(mergedData);
          baseDataRef.current = deepClone(mergedData);
          snapshotRef.current = {
            rowId: saveResult.rowId,
            updatedAt: saveResult.updatedAt,
          };
          setIsEditing(false);
          setIsEditingMode(false);
          setRemoteStatus('Изменения сохранены в БД.');
          return;
        }

        attemptSnapshot = {
          rowId: latestSnapshot.rowId,
          updatedAt: latestSnapshot.updatedAt,
        };
      }

      throw new Error('Не удалось сохранить MBO из-за конфликтующих изменений. Повторите попытку.');
    } catch (error) {
      if (isMissingMboTableError(error)) {
        const fallbackData = normalizePageData(pageData);
        setPageData(fallbackData);
        baseDataRef.current = deepClone(fallbackData);
        snapshotRef.current = { rowId: null, updatedAt: null };
        setIsEditing(false);
        setIsEditingMode(false);
        setRemoteStatus(
          'Изменения применены локально для текущей сессии. Для общей записи в БД нужно применить миграцию `public.mbo_pages`.',
        );
        return;
      }

      const message = (error as Error).message || 'Неизвестная ошибка';
      setSaveError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && pageData.sections.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0a0a0f] text-white">
      <style>{`
        @keyframes mboWidgetBreathe {
          0%, 100% {
            box-shadow:
              0 8px 32px rgba(0, 0, 0, 0.4),
              inset 0 0 20px rgba(0, 212, 255, 0);
          }
          50% {
            box-shadow:
              0 12px 40px rgba(0, 0, 0, 0.5),
              inset 0 0 30px rgba(0, 212, 255, 0.03);
          }
        }

        @keyframes mboGlowLine {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        .mbo-widget-glow {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          animation: mboWidgetBreathe 4s ease-in-out infinite;
        }

        .mbo-widget-glow::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(0, 212, 255, 0.6) 20%,
            rgba(120, 0, 255, 0.6) 50%,
            transparent 100%
          );
          opacity: 0.8;
          animation: mboGlowLine 3s ease-in-out infinite;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .mbo-widget-glow {
            animation: none;
          }

          .mbo-widget-glow::before {
            animation: none;
          }
        }
      `}</style>
      <div className="p-4 pt-4 md:p-8 md:pt-4">
        <div className="mx-auto max-w-5xl space-y-8">
        {isEditing && (
          <div className="mb-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-[0_0_28px_rgba(16,185,129,0.12)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-200">Режим редактирования MBO</div>
                <div className="text-sm text-emerald-100/80">
                  Можно менять весь контент, добавлять и удалять секции, а также выбирать цветовую тему для каждой секции.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleCancel} className={SECONDARY_ACTION_CLASS}>
                  <Trash2 size={16} />
                  Отменить
                </button>
                <button type="button" onClick={handleSave} className={PRIMARY_ACTION_CLASS}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

        {saveError && (
          <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {saveError}
          </div>
        )}

        {remoteStatus && (
          <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {remoteStatus}
          </div>
        )}

        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <EditableField
              editing={isEditing}
              value={pageData.headerTitle}
              onChange={(value) => setPageData((prev) => ({ ...prev, headerTitle: value }))}
              className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-4xl font-semibold text-transparent md:text-6xl"
              inputClassName="w-full rounded-3xl border border-white/10 bg-[#121212] px-5 py-4 text-3xl font-semibold text-white outline-none focus:border-cyan-300/50 md:text-5xl"
            />
            <EditableField
              editing={isEditing}
              value={pageData.headerSubtitle}
              onChange={(value) => setPageData((prev) => ({ ...prev, headerSubtitle: value }))}
              className="mt-2 text-lg text-slate-400 md:text-[18px]"
              inputClassName="mt-3 w-full rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 text-base text-white outline-none focus:border-cyan-300/50 md:max-w-xl"
            />
          </div>

          <div className="self-start rounded-full border border-white/10 bg-white/5 px-6 py-3 shadow-xl shadow-black/20 md:self-auto">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-lime-200 shadow-[0_0_14px_rgba(163,230,53,0.7)]" />
              <EditableField
                editing={isEditing}
                value={pageData.liveLabel}
                onChange={(value) => setPageData((prev) => ({ ...prev, liveLabel: value }))}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-100"
                inputClassName="min-w-[180px] rounded-full border border-white/10 bg-[#121212] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white outline-none focus:border-cyan-300/50"
              />
            </div>
          </div>
        </div>

        {pageData.sections.length > 0 ? (
          <div className="space-y-6">
            {pageData.sections.map((section, index) => (
              <MboPageSection
                key={section.id}
                section={section}
                index={index}
                totalSections={pageData.sections.length}
                editing={isEditing}
                onSectionChange={(nextSection) => replaceSection(section.id, nextSection)}
                onMoveSection={moveSection}
                onDuplicateSection={duplicateSection}
                onDeleteSection={deleteSection}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center backdrop-blur-xl shadow-2xl shadow-black/20">
            <div className="text-xl font-semibold text-white">Все секции удалены</div>
            <div className="mt-2 text-sm text-slate-400">
              Добавьте новую секцию, чтобы собрать MBO заново.
            </div>
          </div>
        )}

        {isEditing && (
          <div className="mt-8 flex justify-center">
            <button type="button" onClick={addSection} className={PRIMARY_ACTION_CLASS}>
              <Plus size={16} />
              Добавить секцию
            </button>
          </div>
        )}

        <div className="pt-6 text-center">
          <p className="text-[12px] tracking-[0.06em] text-slate-500">
            © 2026 Strategic Intelligence Systems • Full Transparency Report
          </p>
        </div>
        </div>
      </div>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handlePasswordCancel}
        onSuccess={handlePasswordSuccess}
      />
    </div>
  );
}
