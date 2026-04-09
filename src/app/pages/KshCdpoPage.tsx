import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/dashboard_new/ui/card";
import { 
  Loader2,
  Plus,
  Trash2,
  Settings,
  X
} from "lucide-react";
import { kshCdpoAPI } from "../utils/api";
import { PasswordModal } from "../components/PasswordModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { Button } from "../components/dashboard_new/ui/button";

interface OutletContext {
  isEditingMode: boolean;
  setIsEditingMode: (value: boolean) => void;
}

export function KshCdpoPage() {
  const { isEditingMode, setIsEditingMode } = useOutletContext<OutletContext>();
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string } | null>(null);

  const load = async () => {
    try {
      const data = await kshCdpoAPI.getDashboards();
      setDashboards(data);
    } catch (err) {
      console.error("Failed to load dashboards", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (isEditingMode && !isEditing) {
      setIsPasswordModalOpen(true);
    } else if (!isEditingMode) {
      setIsEditing(false);
    }
  }, [isEditingMode]);

  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    setIsEditing(true);
  };

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    setIsEditingMode(false);
  };

  const handleEditDashboard = async (id: string, field: string, value: string) => {
    setDashboards(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const saveDashboards = async () => {
    try {
      console.log("Starting save process for", dashboards.length, "items");
      
      // Separate new and existing dashboards
      for (const d of dashboards) {
        if (typeof d.id === 'string' && d.id.startsWith('new-')) {
          console.log("Creating new dashboard (stripping temp ID):", d.title);
          // EXPLICITLY pass only title and description, let Supabase handle the ID
          await kshCdpoAPI.createDashboard(d.title, d.description);
        } else {
          console.log("Updating existing dashboard:", d.id, d.title);
          await kshCdpoAPI.updateDashboard(d.id, d.title, d.description);
        }
      }

      console.log("All dashboards processed successfully");
      setIsEditing(false);
      setIsEditingMode(false);
      await load(); 
      alert("Изменения сохранены!");
    } catch (err) {
      console.error("Save error detailed:", err);
      alert("Ошибка при сохранении: " + (err as Error).message);
    }
  };

  const createNewDashboard = () => {
    const newDash = {
      id: `new-${Date.now()}`,
      title: "Новый раздел",
      description: "Описание и итоги квартала"
    };
    setDashboards([...dashboards, newDash]);
  };

  const deleteDashboard = async (id: string) => {
    try {
      if (!id.startsWith('new-')) {
        await kshCdpoAPI.deleteDashboard(id);
      }
      setDashboards(dashboards.filter(d => d.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      alert("Ошибка при удалении: " + (err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-4 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">КШ CDPO</h1>
            <p className="text-gray-400 text-lg">
              Выберите дашборд для просмотра и настройки показателей
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {dashboards.map((dashboard) => (
            <div key={dashboard.id} className="relative group">
              {isEditing ? (
                <div className="h-[320px] w-full transition-all bg-white/[0.03] border border-white/10 rounded-3xl px-6 pt-8 flex flex-col items-center text-center overflow-hidden relative">
                  <CardHeader className="w-full p-0">
                    <div className="space-y-4 w-full">
                      <div className="bg-gradient-to-r from-[#34d399] to-[#3b82f6] bg-clip-text text-transparent text-[10px] font-bold uppercase tracking-widest mb-1">Заголовок</div>
                      <input 
                        value={dashboard.title} 
                        onChange={(e) => handleEditDashboard(dashboard.id, 'title', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xl font-bold text-center focus:border-[#34d399] outline-none transition-all"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="w-full p-0 mt-6 h-auto relative z-20">
                    <div className="space-y-4 w-full">
                      <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Описание</div>
                      <textarea 
                        value={dashboard.description} 
                        onChange={(e) => handleEditDashboard(dashboard.id, 'description', e.target.value)}
                        rows={2}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-gray-400 text-sm text-center focus:border-white/30 outline-none transition-all resize-none overflow-hidden"
                      />
                    </div>
                  </CardContent>
                  <button 
                    onClick={() => setDeleteTarget({ id: dashboard.id, title: dashboard.title })}
                    className="absolute top-4 right-4 p-2.5 text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all z-[100] shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              ) : (
                <Link to={`/ksh-cdpo/${dashboard.id}`}>
                  <Card className="h-[220px] w-full transition-all bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-white/20 rounded-3xl px-7 py-7 flex flex-col justify-between text-center overflow-hidden relative">
                    <CardHeader className="w-full p-0">
                      <div className="min-h-[82px] flex items-center justify-center">
                        <CardTitle className="text-[19px] md:text-[21px] font-bold bg-gradient-to-r from-[#34d399] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent leading-snug break-words whitespace-normal line-clamp-2">
                          {dashboard.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="w-full p-0">
                      <div className="min-h-[54px] flex items-start justify-center">
                        <p className="text-white/85 font-medium text-lg leading-snug break-words whitespace-normal line-clamp-2">
                          {dashboard.description?.trim() || 'Добавьте краткое описание раздела'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          ))}

          {isEditing && (
            <Card 
              onClick={createNewDashboard}
              className="h-[320px] w-full border border-dashed border-white/10 bg-transparent hover:bg-white/[0.02] hover:border-[#34d399]/30 transition-all cursor-pointer rounded-3xl flex flex-col items-center justify-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#34d399]/10 transition-colors">
                <Plus className="text-gray-500 group-hover:text-[#34d399] transition-colors" />
              </div>
              <span className="text-gray-500 group-hover:text-gray-300 transition-colors font-medium">Добавить раздел</span>
            </Card>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="fixed bottom-8 right-8 flex gap-3 z-[100]">
          <Button 
            onClick={() => { setIsEditing(false); setIsEditingMode(false); load(); }} 
            variant="outline"
            className="bg-white/5 border-white/10 text-white rounded-xl"
          >
            <X size={16} className="mr-2" /> Отмена
          </Button>
          <Button 
            onClick={saveDashboards}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20"
          >
            <Settings size={16} className="mr-2" /> Сохранить структуру
          </Button>
        </div>
      )}

      <DeleteConfirmModal 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteDashboard(deleteTarget.id)}
        title={deleteTarget?.title || ""}
      />

      <PasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={handlePasswordCancel} 
        onSuccess={handlePasswordSuccess} 
      />
    </div>
  );
}
