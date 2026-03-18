import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Download, ChevronDown, ChevronUp, Loader2, Star } from 'lucide-react';
import { Button } from '../../ui/button';
import {
  searchHfModels,
  getRepoFiles,
  downloadHfModel,
  type HfModelInfo,
  type HfQuantVariant,
} from '../../../api';
import { toastError } from '../../../toasts';
import { errorMessage } from '../../../utils/conversionUtils';
import { useLocalization } from '../../../contexts/LocalizationContext';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return 'unknown';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
};

const formatDownloads = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

interface RepoData {
  variants: HfQuantVariant[];
  recommendedIndex: number | null;
}

interface Props {
  onDownloadStarted: (modelId: string) => void;
}

export const HuggingFaceModelSearch = ({ onDownloadStarted }: Props) => {
  const { t } = useLocalization();
  const tRef = useRef(t);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HfModelInfo[]>([]);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<Record<string, RepoData>>({});
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [directSpec, setDirectSpec] = useState('');
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const response = await searchHfModels({
        query: { q, limit: 20 },
      });
      if (response.data) {
        const modelsWithVariants = await Promise.all(
          response.data.map(async (model) => {
            try {
              const [author, repo] = model.repo_id.split('/');
              const filesResponse = await getRepoFiles({ path: { author, repo } });
              if (filesResponse.data && filesResponse.data.variants.length > 0) {
                return { model, data: filesResponse.data };
              }
            } catch {
              // Skip repos we can't fetch
            }
            return null;
          })
        );

        const validResults = modelsWithVariants.filter(Boolean) as {
          model: HfModelInfo;
          data: { variants: HfQuantVariant[]; recommended_index?: number | null };
        }[];

        setResults(validResults.map((r) => r.model));
        setRepoData((prev) => {
          const next = { ...prev };
          for (const r of validResults) {
            next[r.model.repo_id] = {
              variants: r.data.variants,
              recommendedIndex: r.data.recommended_index ?? null,
            };
          }
          return next;
        });

        if (validResults.length === 0) {
          setError(tRef.current('localInference.search.noResults'));
        }
      } else {
        console.error('Search response:', response);
        const errMsg = response.error
          ? tRef.current('localInference.search.searchError', {
              error: JSON.stringify(response.error),
            })
          : tRef.current('localInference.search.searchReturnedNoData');
        setError(errMsg);
      }
    } catch (e) {
      console.error('Search failed:', e);
      setError(tRef.current('localInference.search.searchFailed'));
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const toggleRepo = async (repoId: string) => {
    if (expandedRepo === repoId) {
      setExpandedRepo(null);
      return;
    }
    setExpandedRepo(repoId);

    if (!repoData[repoId]?.variants.length) {
      setLoadingFiles((prev) => new Set(prev).add(repoId));
      try {
        const [author, repo] = repoId.split('/');
        const response = await getRepoFiles({
          path: { author, repo },
        });
        if (response.data) {
          const variants = response.data.variants;
          setRepoData((prev) => ({
            ...prev,
            [repoId]: {
              variants,
              recommendedIndex: response.data!.recommended_index ?? null,
            },
          }));
        }
      } catch (e) {
        console.error('Failed to fetch repo files:', e);
      } finally {
        setLoadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(repoId);
          return next;
        });
      }
    }
  };

  const startDownload = async (repoId: string, quantization: string) => {
    const spec = `${repoId}:${quantization}`;
    setDownloading((prev) => new Set(prev).add(spec));
    try {
      const response = await downloadHfModel({
        body: { spec },
      });
      if (response.data) {
        onDownloadStarted(response.data);
      }
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(spec);
        return next;
      });
    }
  };

  const startDirectDownload = async () => {
    const spec = directSpec.trim();
    if (!spec) return;
    const key = `direct:${spec}`;
    setDownloading((prev) => new Set(prev).add(key));
    try {
      const response = await downloadHfModel({
        body: { spec },
        throwOnError: true,
      });
      if (response.data) {
        onDownloadStarted(response.data);
        setDirectSpec('');
      }
    } catch (e) {
      toastError({
        title: 'Direct download failed',
        msg: 'Failed to start the download. Check the spec: ' + errorMessage(e),
      });
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-text-default mb-2">
          {t('localInference.search.title')}
        </h4>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t('localInference.search.placeholder')}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border-subtle rounded-lg bg-background-default text-text-default placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
          )}
        </div>
      </div>

      {error && !searching && <p className="text-xs text-text-muted">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {results.map((model) => {
            const isExpanded = expandedRepo === model.repo_id;
            const data = repoData[model.repo_id];
            const variants = data?.variants || [];
            const recommendedIndex = data?.recommendedIndex ?? null;

            return (
              <div key={model.repo_id} className="border border-border-subtle rounded-lg">
                <button
                  onClick={() => toggleRepo(model.repo_id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-background-subtle rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-default truncate">
                        {model.repo_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-muted">
                        {formatDownloads(model.downloads)} downloads
                      </span>
                    </div>
                  </div>
                  {loadingFiles.has(model.repo_id) ? (
                    <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                  ) : isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  )}
                </button>

                {isExpanded && data && (
                  <div className="px-3 pb-3 border-t border-border-subtle">
                    <div className="space-y-2 mt-3">
                      {variants.map((variant, index) => {
                        const spec = `${model.repo_id}:${variant.quantization}`;
                        const isDownloading = downloading.has(spec);
                        const isRecommended = recommendedIndex === index;
                        return (
                          <div
                            key={variant.filename}
                            className="flex items-center gap-3 p-2 rounded-lg bg-background-subtle"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-text-default truncate">
                                  {variant.quantization}
                                </span>
                                {isRecommended && (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">
                                    <Star className="w-3 h-3" /> {t('localInference.recommended')}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">
                                {formatBytes(variant.size_bytes)} • {variant.filename}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              disabled={isDownloading}
                              onClick={() => startDownload(model.repo_id, variant.quantization)}
                            >
                              {isDownloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-border-subtle">
        <label className="text-xs font-medium text-text-muted">
          {t('localInference.search.directDownload')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={directSpec}
            onChange={(e) => setDirectSpec(e.target.value)}
            placeholder={t('localInference.search.directPlaceholder')}
            className="flex-1 px-3 py-2 text-sm border border-border-subtle rounded-lg bg-background-default text-text-default placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
          />
          <Button
            onClick={startDirectDownload}
            disabled={!directSpec.trim() || downloading.has(`direct:${directSpec.trim()}`)}
          >
            {downloading.has(`direct:${directSpec.trim()}`) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-text-muted">{t('localInference.search.directDescription')}</p>
      </div>
    </div>
  );
};
