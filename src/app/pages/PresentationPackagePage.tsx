import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronLeft, ChevronRight, Loader2, MoveUp, MoveDown, Settings, X, Trash2, Upload, Download } from 'lucide-react';
import { Button } from '../components/dashboard_new/ui/button';
import {
  presentationsAPI,
  type PresentationAssetPayload,
  type PresentationPackagePayload,
  type PresentationPagePayload,
} from '../utils/api';
import { PasswordModal } from '../components/PasswordModal';

const decodeBase64 = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const normalizeRelativePath = (value: string) =>
  value
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\//, '')
    .trim();

const getPageDisplayName = (fileName: string) => fileName.replace(/\.(html?|xhtml)$/i, '');

const isHtmlFile = (fileName: string) => /\.(html?|xhtml)$/i.test(fileName);

const toPackagePath = (file: File) => {
  const customPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return (customPath && customPath.trim()) || file.name;
};

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file as text'));
    reader.readAsText(file);
  });

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file as base64'));
    reader.readAsDataURL(file);
  });

const injectNavigationBridge = (html: string) => {
  const bridgeScript = `
<script>
(function () {
  var post = function(payload){
    try { window.parent.postMessage(payload, '*'); } catch (e) {}
  };

  document.addEventListener('click', function(event) {
    var target = event.target;
    if (!target) return;
    var anchor = target.closest ? target.closest('a[href]') : null;
    if (!anchor) return;
    var href = anchor.getAttribute('href');
    if (!href) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

    post({ type: 'presentation-nav', href: href });

    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      event.preventDefault();
    }
  }, true);
})();
</script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${bridgeScript}</body>`);
  }
  return `${html}${bridgeScript}`;
};

const rewriteAssetLinks = (html: string, assetsMap: Map<string, string>) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const resolveAssetUrl = (rawValue: string | null) => {
      if (!rawValue) return null;
      const trimmed = rawValue.trim();
      if (!trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('#')) {
        return null;
      }

      const [pathname, suffix = ''] = trimmed.split(/(?=[?#])/);
      const normalizedPath = normalizeRelativePath(pathname);
      const basename = normalizedPath.split('/').pop() || normalizedPath;

      const direct = assetsMap.get(normalizedPath);
      if (direct) return `${direct}${suffix}`;

      const byBasename = assetsMap.get(basename);
      if (byBasename) return `${byBasename}${suffix}`;

      return null;
    };

    doc.querySelectorAll('[src]').forEach((node) => {
      const element = node as HTMLElement;
      const next = resolveAssetUrl(element.getAttribute('src'));
      if (next) element.setAttribute('src', next);
    });

    doc.querySelectorAll('link[href]').forEach((node) => {
      const element = node as HTMLElement;
      const next = resolveAssetUrl(element.getAttribute('href'));
      if (next) element.setAttribute('href', next);
    });

    doc.querySelectorAll('style').forEach((styleNode) => {
      const raw = styleNode.textContent || '';
      const next = raw.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, path) => {
        const resolved = resolveAssetUrl(path);
        if (!resolved) return match;
        return `url(${quote}${resolved}${quote})`;
      });
      styleNode.textContent = next;
    });

    doc.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
      const styleValue = element.getAttribute('style') || '';
      const next = styleValue.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, path) => {
        const resolved = resolveAssetUrl(path);
        if (!resolved) return match;
        return `url(${quote}${resolved}${quote})`;
      });
      if (next !== styleValue) {
        element.setAttribute('style', next);
      }
    });

    return doc.documentElement.outerHTML;
  } catch (err) {
    console.error('Failed to rewrite HTML asset links:', err);
    return html;
  }
};

export function PresentationPackagePage() {
  const { presentationId } = useParams<{ presentationId: string }>();

  const [item, setItem] = useState<PresentationPackagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [orderDraft, setOrderDraft] = useState<string[]>([]);
  const [isOrderEditing, setIsOrderEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [showPageQuickNav, setShowPageQuickNav] = useState(false);
  const [pagesDraft, setPagesDraft] = useState<PresentationPagePayload[]>([]);
  const [assetsDraft, setAssetsDraft] = useState<PresentationAssetPayload[]>([]);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!presentationId) {
        setItem(null);
        setLoading(false);
        return;
      }

      try {
        const data = await presentationsAPI.getById(presentationId);
        setItem(data);
        setActivePageId(data?.pages?.[0]?.id || null);
        setOrderDraft(data?.pages?.map((page) => page.id) || []);
        setPagesDraft(data?.pages || []);
        setAssetsDraft(data?.assets || []);
      } catch (err) {
        console.error('Failed to load presentation package', err);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [presentationId]);

  const activePageIndex = useMemo(() => {
    if (!item || !activePageId) return -1;
    return item.pages.findIndex((page) => page.id === activePageId);
  }, [activePageId, item]);

  const activePage = useMemo(() => {
    if (!item || activePageIndex < 0) return null;
    return item.pages[activePageIndex] || null;
  }, [activePageIndex, item]);

  const assetsMap = useMemo(() => {
    const cleanupUrls: string[] = [];
    const map = new Map<string, string>();

    item?.assets.forEach((asset) => {
      const blob =
        asset.encoding === 'text'
          ? new Blob([asset.content], { type: asset.mimeType || 'text/plain' })
          : new Blob([decodeBase64(asset.content)], { type: asset.mimeType || 'application/octet-stream' });

      const url = URL.createObjectURL(blob);
      cleanupUrls.push(url);

      const normalized = normalizeRelativePath(asset.fileName);
      const basename = normalized.split('/').pop() || normalized;

      map.set(normalized, url);
      map.set(basename, url);
    });

    return { map, cleanupUrls };
  }, [item]);

  useEffect(() => {
    return () => {
      assetsMap.cleanupUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [assetsMap.cleanupUrls]);

  const srcDoc = useMemo(() => {
    if (!activePage) return '';
    const withAssets = rewriteAssetLinks(activePage.htmlContent, assetsMap.map);
    return injectNavigationBridge(withAssets);
  }, [activePage, assetsMap.map]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const payload = event.data as { type?: string; href?: string } | null;
      if (!payload || payload.type !== 'presentation-nav' || !payload.href || !item) return;

      const href = payload.href;
      if (href.startsWith('#')) return;

      let candidate = href;
      try {
        const parsed = new URL(href, 'https://local.presentation/');
        candidate = parsed.pathname;
      } catch {
        candidate = href;
      }

      const normalized = normalizeRelativePath(candidate);
      const basename = normalized.split('/').pop() || normalized;

      const target =
        item.pages.find((page) => normalizeRelativePath(page.fileName) === normalized) ||
        item.pages.find((page) => normalizeRelativePath(page.fileName).split('/').pop() === basename);

      if (target) {
        setActivePageId(target.id);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [item]);

  const goToPrev = () => {
    if (!item || activePageIndex <= 0) return;
    setActivePageId(item.pages[activePageIndex - 1].id);
  };

  const goToNext = () => {
    if (!item || activePageIndex >= item.pages.length - 1) return;
    setActivePageId(item.pages[activePageIndex + 1].id);
  };

  const moveDraftPage = (pageId: string, direction: 'up' | 'down') => {
    setOrderDraft((prev) => {
      const index = prev.indexOf(pageId);
      if (index < 0) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const current = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = current;
      return next;
    });
  };

  const openOrderEditor = () => {
    if (!item) return;
    setOrderDraft(item.pages.map((page) => page.id));
    setPagesDraft(item.pages);
    setAssetsDraft(item.assets);
    setPendingUploadFiles([]);
    setIsPasswordModalOpen(true);
  };

  const handleOrderPasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    setIsOrderEditing(true);
  };

  const handleOrderPasswordCancel = () => {
    setIsPasswordModalOpen(false);
  };

  const handleOrderCancel = () => {
    if (!item) return;
    setOrderDraft(item.pages.map((page) => page.id));
    setPagesDraft(item.pages);
    setAssetsDraft(item.assets);
    setPendingUploadFiles([]);
    setIsOrderEditing(false);
  };

  const handleDeleteDraftPage = (pageId: string) => {
    setPagesDraft((prev) => prev.filter((page) => page.id !== pageId));
    setOrderDraft((prev) => prev.filter((id) => id !== pageId));

    if (activePageId === pageId) {
      const nextId = orderDraft.find((id) => id !== pageId) || null;
      setActivePageId(nextId);
    }
  };

  const handleImportFilesToDraft = async () => {
    if (pendingUploadFiles.length === 0) {
      alert('Выберите файлы для загрузки.');
      return;
    }

    try {
      setIsUploadingFiles(true);

      const nextPages = [...pagesDraft];
      const nextAssets = [...assetsDraft];

      const pageIndexByPath = new Map(
        nextPages.map((page, index) => [normalizeRelativePath(page.fileName), index] as const),
      );
      const assetIndexByPath = new Map(
        nextAssets.map((asset, index) => [normalizeRelativePath(asset.fileName), index] as const),
      );

      const addedPageIds: string[] = [];

      for (const file of pendingUploadFiles) {
        const fileName = toPackagePath(file);
        const normalizedPath = normalizeRelativePath(fileName);

        if (isHtmlFile(fileName)) {
          const htmlContent = await readFileAsText(file);
          const existingIndex = pageIndexByPath.get(normalizedPath);

          if (typeof existingIndex === 'number') {
            nextPages[existingIndex] = {
              ...nextPages[existingIndex],
              fileName,
              htmlContent,
            };
          } else {
            const pageId = crypto.randomUUID();
            nextPages.push({
              id: pageId,
              fileName,
              htmlContent,
            });
            pageIndexByPath.set(normalizedPath, nextPages.length - 1);
            addedPageIds.push(pageId);
          }
          continue;
        }

        const isTextAsset = /^text\//.test(file.type) || /\.(css|js|json|map|svg|txt)$/i.test(fileName);
        const content = isTextAsset ? await readFileAsText(file) : await readFileAsBase64(file);
        const assetPayload: PresentationAssetPayload = {
          id: crypto.randomUUID(),
          fileName,
          mimeType: file.type || 'application/octet-stream',
          encoding: isTextAsset ? 'text' : 'base64',
          content,
        };

        const existingIndex = assetIndexByPath.get(normalizedPath);
        if (typeof existingIndex === 'number') {
          assetPayload.id = nextAssets[existingIndex].id;
          nextAssets[existingIndex] = assetPayload;
        } else {
          nextAssets.push(assetPayload);
          assetIndexByPath.set(normalizedPath, nextAssets.length - 1);
        }
      }

      setPagesDraft(nextPages);
      setAssetsDraft(nextAssets);
      setOrderDraft((prev) => {
        const existing = new Set(prev);
        const kept = prev.filter((id) => nextPages.some((page) => page.id === id));
        const tail = nextPages.filter((page) => !existing.has(page.id)).map((page) => page.id);
        return [...kept, ...tail];
      });

      if (!activePageId && nextPages[0]) {
        setActivePageId(nextPages[0].id);
      } else if (addedPageIds[0]) {
        setActivePageId(addedPageIds[0]);
      }

      setPendingUploadFiles([]);
    } catch (err) {
      alert('Ошибка при загрузке файлов: ' + (err as Error).message);
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const downloadHtmlFile = (fileName: string, htmlContent: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadActiveHtml = () => {
    if (!activePage) return;
    downloadHtmlFile(activePage.fileName, activePage.htmlContent);
  };

  const handleDownloadAllHtml = () => {
    if (!item || item.pages.length === 0) return;
    item.pages.forEach((page) => {
      downloadHtmlFile(page.fileName, page.htmlContent);
    });
  };

  const handleOrderSave = async () => {
    if (!item) return;
    try {
      setIsSavingOrder(true);
      const draftById = new Map(pagesDraft.map((page) => [page.id, page]));
      const orderedPages = orderDraft
        .map((pageId) => draftById.get(pageId))
        .filter((page): page is PresentationPagePayload => Boolean(page));
      const tailPages = pagesDraft.filter((page) => !orderedPages.some((ordered) => ordered.id === page.id));
      const finalPages = [...orderedPages, ...tailPages];

      await presentationsAPI.updatePackageContent(item.id, {
        pages: finalPages,
        assets: assetsDraft,
      });
      const fresh = await presentationsAPI.getById(item.id);
      setItem(fresh);
      if (fresh) {
        setOrderDraft(fresh.pages.map((page) => page.id));
        setPagesDraft(fresh.pages);
        setAssetsDraft(fresh.assets);
        const stillExists = fresh.pages.some((page) => page.id === activePageId);
        if (!stillExists) {
          setActivePageId(fresh.pages[0]?.id || null);
        }
      }
      setIsOrderEditing(false);
    } catch (err) {
      alert('Ошибка при сохранении порядка: ' + (err as Error).message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-3">Пакет не найден</h1>
          <p className="text-gray-400 mb-6">Эта презентация была удалена или еще не создана.</p>
          <Link to="/presentations">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">Вернуться к списку</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen pb-28">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/presentations" className="text-sm text-gray-300 hover:text-white transition-colors">
            ← К списку презентаций
          </Link>
          <button
            type="button"
            onClick={openOrderEditor}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all"
            title="Настройки просмотра"
          >
            <Settings size={18} />
          </button>
        </div>

        {showPageQuickNav && (
          <div className="flex flex-wrap gap-2">
            {item.pages.map((page, index) => {
              const isActive = page.id === activePageId;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActivePageId(page.id)}
                  className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-red-500 border-red-500/60 text-white shadow-lg shadow-red-500/30'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {index + 1}. {getPageDisplayName(page.fileName)}
                </button>
              );
            })}
          </div>
        )}

        {isOrderEditing && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-white font-semibold">Настройки просмотра</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleOrderCancel}
                  disabled={isSavingOrder}
                  className="bg-white/5 border-white/10 text-white"
                >
                  <X size={16} className="mr-2" />
                  Закрыть
                </Button>
                <Button
                  onClick={() => void handleOrderSave()}
                  disabled={isSavingOrder}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Settings size={16} className="mr-2" />
                  {isSavingOrder ? 'Сохраняю...' : 'Сохранить порядок'}
                </Button>
              </div>
            </div>
            <label className="flex items-center gap-3 text-gray-200 mb-4">
              <input
                type="checkbox"
                checked={showPageQuickNav}
                onChange={(event) => setShowPageQuickNav(event.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/40"
              />
              <span>Показывать кнопки с названиями HTML-страниц</span>
            </label>
            <div className="text-white font-semibold mb-2">Порядок лендингов</div>
            <div className="space-y-2">
              {orderDraft.map((pageId, index) => {
                const page = pagesDraft.find((entry) => entry.id === pageId);
                if (!page) return null;

                return (
                  <div
                    key={pageId}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/10 text-white text-xs flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div className="flex-1 text-gray-200 text-sm truncate">{getPageDisplayName(page.fileName)}</div>
                    <button
                      type="button"
                      onClick={() => moveDraftPage(pageId, 'up')}
                      disabled={index === 0}
                      className="p-2 rounded-xl border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDraftPage(pageId, 'down')}
                      disabled={index === orderDraft.length - 1}
                      className="p-2 rounded-xl border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MoveDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDraftPage(pageId)}
                      className="p-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
              <div className="text-white font-semibold">Добавить или заменить страницы/ассеты</div>
              <label className="w-full border border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-400/40 hover:bg-white/[0.02] transition-all">
                <Upload size={18} className="text-gray-300" />
                <span className="text-sm text-gray-200">Выбрать файлы</span>
                <input
                  type="file"
                  multiple
                  accept=".html,.htm,.xhtml,.css,.js,.json,.map,.svg,.png,.jpg,.jpeg,.gif,.webp,.ico,.woff,.woff2,.ttf,.otf,.txt"
                  className="hidden"
                  onChange={(event) => setPendingUploadFiles(Array.from(event.target.files || []))}
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-gray-400">К загрузке: {pendingUploadFiles.length} файлов</div>
                <Button
                  onClick={() => void handleImportFilesToDraft()}
                  disabled={isUploadingFiles || pendingUploadFiles.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Upload size={14} className="mr-2" />
                  {isUploadingFiles ? 'Загрузка...' : 'Применить файлы'}
                </Button>
              </div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
              <div className="text-white font-semibold">Выгрузка HTML</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadActiveHtml}
                  disabled={!activePage}
                  className="bg-white/5 border-white/10 text-white"
                >
                  <Download size={14} className="mr-2" />
                  Выгрузить текущий HTML
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadAllHtml}
                  disabled={!item.pages.length}
                  className="bg-white/5 border-white/10 text-white"
                >
                  <Download size={14} className="mr-2" />
                  Выгрузить все HTML
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <iframe
            ref={iframeRef}
            key={activePage?.id || 'empty'}
            title={activePage?.fileName || 'presentation-preview'}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            className="w-full h-[86vh] bg-white"
          />
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-2">
          <Button
            variant="outline"
            onClick={goToPrev}
            disabled={activePageIndex <= 0}
            className="bg-white/5 border-white/10 text-white"
          >
            <ChevronLeft size={16} className="mr-2" />
            Назад
          </Button>
          <Button
            variant="outline"
            onClick={goToNext}
            disabled={activePageIndex < 0 || activePageIndex >= item.pages.length - 1}
            className="bg-white/5 border-white/10 text-white"
          >
            Вперед
            <ChevronRight size={16} className="ml-2" />
          </Button>
        </div>
      </div>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handleOrderPasswordCancel}
        onSuccess={handleOrderPasswordSuccess}
      />
    </div>
  );
}
