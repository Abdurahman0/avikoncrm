import { useEffect, useMemo, useState } from 'react';
import {
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
  SearchInput,
  StatusBadge,
  type DataTableColumn,
} from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import {
  EmptyState,
  LoadingState,
  PageCard,
  PageHeader,
  PageLayout,
  PageSection,
} from '../../../components/shared/page';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import type {
  PaginationMeta,
  SelectOption,
  SystemHealth,
} from '../../../types/domain';
import type { ApiLog } from '../../../services/contracts';

type LogOrdering = '-created_at' | 'created_at';

type RowLog = {
  id: string;
  type: 'audit';
  title: string;
  secondary: string;
  level: string;
  createdAt: string;
};

const PAGE_SIZE = 10;
const DEFAULT_ORDERING: LogOrdering = '-created_at';

const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

const tablePrimaryTextClassName =
  'block text-sm font-semibold leading-[1.35] text-text-primary [overflow-wrap:anywhere]';

const tableSecondaryTextClassName =
  'block text-[12px] leading-[1.45] text-text-secondary [overflow-wrap:anywhere]';

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';
const healthCardClassName =
  'grid gap-2 rounded-lg bg-surface-subtle/80 p-3';

function getHealthTone(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'ok' || status === 'success') {
    return 'success';
  }

  if (status === 'error') {
    return 'danger';
  }

  return 'warning';
}

function getHealthLabel(status: string): string {
  if (status === 'ok' || status === 'success') {
    return 'OK';
  }

  if (status === 'error') {
    return 'DOWN';
  }

  return 'DEGRADED';
}

function mapApiLogToRow(log: ApiLog): RowLog {
  return {
    id: log.id,
    type: 'audit',
    title: `${log.method || 'GET'} ${log.endpoint || '-'}`,
    secondary: String(log.error ?? log.status_code ?? '-'),
    level: String(log.level ?? '-'),
    createdAt: log.created_at ?? '',
  };
}

function LogsPage() {
  const [search, setSearch] = usePersistentState('logs:search', '');
  const [ordering, setOrdering] = useState<LogOrdering>(DEFAULT_ORDERING);
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState<RowLog[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>(DEFAULT_PAGINATION_META);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, ordering]);

  useEffect(() => {
    let isActive = true;

    async function loadHealth() {
      setIsHealthLoading(true);

      try {
        const result = await services.logs.getHealth();
        if (!isActive) {
          return;
        }

        setHealth(result);
      } catch {
        if (!isActive) {
          return;
        }

        setHealth(null);
      } finally {
        if (isActive) {
          setIsHealthLoading(false);
        }
      }
    }

    void loadHealth();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadLogs() {
      setIsLoading(true);
      setHasError(false);

      try {
        const params = {
          page: currentPage,
          page_size: PAGE_SIZE,
          search: search.trim() || undefined,
          ordering,
        };

        const result = await services.logs.listApiLogs(params);

        if (!isActive) {
          return;
        }

        const pageSize = result.page_size ?? PAGE_SIZE;
        const totalItems = result.total ?? result.count ?? result.items.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

        if (currentPage > totalPages) {
          setCurrentPage(totalPages);
          return;
        }

        setLogs((result.items as ApiLog[]).map(mapApiLogToRow));
        setPaginationMeta({
          page: result.page ?? currentPage,
          pageSize,
          totalItems,
          totalPages,
        });
      } catch {
        if (!isActive) {
          return;
        }

        setHasError(true);
        setLogs([]);
        setPaginationMeta(DEFAULT_PAGINATION_META);
      } finally {
        if (isActive) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      }
    }

    void loadLogs();

    return () => {
      isActive = false;
    };
  }, [currentPage, ordering, search]);

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-created_at', label: "Qo'shilgan (yangi)" },
      { value: 'created_at', label: "Qo'shilgan (eski)" },
    ],
    [],
  );

  const columns = useMemo<DataTableColumn<RowLog>[]>(() => {
    return [
      {
        key: 'type',
        label: 'Turi',
        render: (log) => (
          <StatusBadge
            status={log.type}
            tone="info"
            label={log.type.toUpperCase()}
          />
        ),
      },
      {
        key: 'title',
        label: 'Sarlavha',
        render: (log) => <span className={tablePrimaryTextClassName}>{log.title}</span>,
      },
      {
        key: 'secondary',
        label: 'Batafsil',
        render: (log) => <span className={tableSecondaryTextClassName}>{log.secondary}</span>,
      },
      {
        key: 'level',
        label: 'Level',
        render: (log) => <span className={tablePrimaryTextClassName}>{log.level}</span>,
      },
      {
        key: 'createdAt',
        label: "Qo'shilgan",
        render: (log) => <span className={tablePrimaryTextClassName}>{log.createdAt}</span>,
      },
    ];
  }, []);

  const header = (
    <PageHeader
      eyebrow="Jurnallar"
      title="Jurnallar"
      subtitle="API va AI loglarini kuzating"
      actions={
        <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
          <AppIcon name="logs" className="h-3.5 w-3.5" aria-hidden="true" />
          {paginationMeta.totalItems} ta
        </span>
      }
    />
  );

  if (!hasLoadedOnce && isLoading) {
    return (
      <PageLayout header={header}>
        <PageSection>
          <PageCard>
            <LoadingState title="Yuklanmoqda..." description="Log yozuvlari olinmoqda." />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  if (hasError) {
    return (
      <PageLayout header={header}>
        <PageSection>
          <PageCard>
            <EmptyState
              title="Jurnallarni yuklab bo'lmadi"
              description="Sahifani yangilab qayta urinib ko'ring."
            />
          </PageCard>
        </PageSection>
      </PageLayout>
    );
  }

  return (
    <PageLayout header={header}>
      <PageSection>
        <FilterBar>
          <SearchInput value={search} onChange={setSearch} placeholder="Xabar bo'yicha qidirish" />

          <label className="grid min-w-[min(220px,100%)] flex-[1_1_220px] gap-1.5 min-[640px]:flex-[0_1_240px]">
            <span className={labelClassName}>Saralash</span>
            <FilterSelect
              value={ordering}
              options={orderingOptions}
              onChange={(value) => setOrdering(value as LogOrdering)}
              disabled={isLoading}
            />
          </label>
        </FilterBar>

        <PageCard>
          <div className="grid gap-3 px-1 pb-3">
            <div className={healthCardClassName}>
              <span className={labelClassName}>API status</span>
              {isHealthLoading ? (
                <span className={tableSecondaryTextClassName}>Yuklanmoqda...</span>
              ) : (
                <StatusBadge
                  status={health?.status ?? 'warning'}
                  tone={getHealthTone(health?.status ?? 'warning')}
                  label={getHealthLabel(health?.status ?? 'warning')}
                />
              )}
            </div>
          </div>
        </PageCard>

        <PageCard>
          <DataTable
            data={logs}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            emptyTitle="Loglar topilmadi"
            emptyDescription="Qidiruv yoki filterlarni o'zgartirib qayta urinib ko'ring."
          />
        </PageCard>

        {!isLoading && paginationMeta.totalItems > 0 ? (
          <Pagination
            currentPage={Math.min(currentPage, paginationMeta.totalPages)}
            totalPages={paginationMeta.totalPages}
            totalItems={paginationMeta.totalItems}
            onPageChange={setCurrentPage}
          />
        ) : null}
      </PageSection>
    </PageLayout>
  );
}

export default LogsPage;
