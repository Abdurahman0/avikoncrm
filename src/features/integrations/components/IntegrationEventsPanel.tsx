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
import { EmptyState, PageCard, PageSection } from '../../../components/shared/page';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { resolveIntlLocale } from '../../../i18n/locale';
import { services } from '../../../services';
import type { IntegrationEvent, PaginationMeta, SelectOption } from '../../../types/domain';

const PAGE_SIZE = 10;
const EMPTY_META: PaginationMeta = { page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 };

export default function IntegrationEventsPanel({ language }: { language: string }) {
  const locale = resolveIntlLocale(language);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [processed, setProcessed] = useState('all');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<IntegrationEvent[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [selected, setSelected] = useState<IntegrationEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => setPage(1), [search, platform, processed]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);

    services.integrations.listEvents({
      page,
      pageSize: PAGE_SIZE,
      search: search.trim() || undefined,
      platform: platform === 'all' ? undefined : platform,
      processed: processed === 'all' ? undefined : processed === 'yes',
      ordering: '-created_at',
    }).then((result: { items: IntegrationEvent[]; meta: PaginationMeta }) => {
      if (!active) return;
      setItems(result.items);
      setMeta(result.meta);
    }).catch(() => {
      if (!active) return;
      setItems([]);
      setMeta(EMPTY_META);
      setFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [page, platform, processed, search]);

  const platformOptions = useMemo<SelectOption[]>(() => [
    { value: 'all', label: 'All platforms' },
    { value: 'telegram', label: 'Telegram' },
    { value: 'instagram', label: 'Instagram' },
  ], []);

  const processedOptions = useMemo<SelectOption[]>(() => [
    { value: 'all', label: 'All states' },
    { value: 'yes', label: 'Processed' },
    { value: 'no', label: 'Pending' },
  ], []);

  const columns = useMemo<DataTableColumn<IntegrationEvent>[]>(() => [
    { key: 'platform', label: 'Platform', render: event => <span className="text-sm font-semibold text-text-primary">{event.platform}</span> },
    { key: 'event_type', label: 'Event', render: event => <span className="text-sm font-semibold text-text-primary">{event.event_type || '-'}</span> },
    { key: 'external_id', label: 'External ID', render: event => <span className="text-xs text-text-secondary">{event.external_id || '-'}</span> },
    { key: 'processed', label: 'State', render: event => <StatusBadge status={event.processed ? 'processed' : 'pending'} tone={event.processed ? 'success' : 'warning'} label={event.processed ? 'Processed' : 'Pending'} /> },
    { key: 'error', label: 'Error', render: event => <span className="text-xs text-danger">{event.error_message || '-'}</span> },
    { key: 'created_at', label: 'Received', render: event => <span className="text-xs text-text-secondary">{formatLocalizedDate(event.created_at, language, { locale, withYear: true, withTime: true, shortMonth: true, fallback: '-' })}</span> },
  ], [language, locale]);

  return (
    <PageSection>
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search integration events" />
        <FilterSelect value={platform} options={platformOptions} onChange={setPlatform} disabled={loading} />
        <FilterSelect value={processed} options={processedOptions} onChange={setProcessed} disabled={loading} />
      </FilterBar>

      {failed ? (
        <PageCard><EmptyState title="Events could not be loaded" description="Check the API connection and retry." /></PageCard>
      ) : (
        <PageCard>
          <DataTable data={items} columns={columns} rowKey="id" loading={loading} selectedRowKey={selected?.id ?? null} onRowClick={setSelected} emptyTitle="No integration events" emptyDescription="No events match the current filters." />
        </PageCard>
      )}

      {!loading && meta.totalItems > 0 ? (
        <Pagination currentPage={Math.min(page, meta.totalPages)} totalPages={meta.totalPages} totalItems={meta.totalItems} onPageChange={setPage} />
      ) : null}

      {selected ? (
        <PageCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="m-0 text-base font-semibold text-text-primary">{selected.event_type}</h3>
              <p className="mt-1 text-xs text-text-secondary">{selected.id}</p>
            </div>
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-subtle" onClick={() => setSelected(null)}>Close</button>
          </div>
          <pre className="mt-3 max-h-[360px] overflow-auto rounded-lg bg-surface-subtle p-3 text-xs leading-5 text-text-primary">{JSON.stringify(selected.payload ?? {}, null, 2)}</pre>
        </PageCard>
      ) : null}
    </PageSection>
  );
}
