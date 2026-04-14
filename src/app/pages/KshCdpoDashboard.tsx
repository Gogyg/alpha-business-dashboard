import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Loader2 } from "lucide-react";
import { RedCapPage } from "./Dashboard";
import { kshCdpoAPI } from "../utils/api";

const createBlankMetric = () => ({
  id: 1,
  name: "",
  weight: "0 %",
  fact: 0,
  plan: 0,
  type: "=",
  maxPercent: "∞",
  percent: "0 %",
});

const createBlankRedcapData = () => ({
  digitalMetrics: [createBlankMetric()],
  stabilityMetrics: [createBlankMetric()],
  productionMetrics: [createBlankMetric()],
  vocData: {
    nib: 0,
    range: "0-0",
    plan: 85,
    items: [
      { id: "voc-mmb", label: "ММБ", value: 0 },
      { id: "voc-sb", label: "СБ", value: 0 },
      { id: "voc-kib", label: "КИБ", value: 0 },
    ],
  },
  enpsData: { value: 0, plan: 85 },
  visibilityData: { value: 0, plan: 358 },
  totalsConfig: {
    weights: { scoreCard: 30, stability: 20, production: 20, voc: 20, personnel: 10 },
    overrides: { scoreCard: "", stability: "", production: "", voc: "", personnel: "100", total: "" },
  },
  hiddenWidgets: {},
  deletedWidgets: {},
  purgedWidgets: {},
});

export function KshCdpoDashboard() {
  const { dashboardId } = useParams();
  const [dashboardTitle, setDashboardTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTitle = async () => {
      if (!dashboardId) {
        setLoading(false);
        return;
      }

      try {
        const dashboards = await kshCdpoAPI.getDashboards();
        const current = dashboards.find((item: any) => item.id === dashboardId);
        setDashboardTitle(current?.title || "");
      } catch (err) {
        console.error("Failed to load KSH CDPO dashboard title", err);
      } finally {
        setLoading(false);
      }
    };

    loadTitle();
  }, [dashboardId]);

  const loadData = async (quarter: string) => {
    if (!dashboardId) return null;
    const raw = await kshCdpoAPI.getWidgets(dashboardId);
    if (!raw || Array.isArray(raw) || raw.mode !== "redcap") {
      return null;
    }
    return raw.quarters?.[quarter] || null;
  };

  const saveData = async (quarter: string, data: any) => {
    if (!dashboardId) return;
    const raw = await kshCdpoAPI.getWidgets(dashboardId);
    const payload =
      raw && !Array.isArray(raw) && raw.mode === "redcap"
        ? raw
        : { mode: "redcap", quarters: {} as Record<string, any> };

    payload.quarters = {
      ...(payload.quarters || {}),
      [quarter]: data,
    };

    await kshCdpoAPI.saveWidgets(dashboardId, payload);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <RedCapPage
      loadData={loadData}
      saveData={saveData}
      localStorageKey={`ksh-cdpo-redcap-${dashboardId}`}
      vocTitle={dashboardTitle ? `VOC ${dashboardTitle}` : "VOC"}
      pageTitle={dashboardTitle}
      backPath="/ksh-cdpo"
      getDefaultDataOverride={createBlankRedcapData}
      enableTemplateAdd
    />
  );
}
