import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { getUserPermissionDescription, getUserPermissionLabel } from '../../../i18n/labels';
import { companyAccessService } from '../../../services/api/company-access.service';
import type { CompanyPermission, CompanyRole } from '../../../services/contracts';

interface CompanyRolesPanelProps {
  canCreate: boolean;
}

const inputClassName =
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary placeholder:text-text-muted outline-none transition duration-fast focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

function CompanyRolesPanel({ canCreate }: CompanyRolesPanelProps) {
  const { t, i18n } = useTranslation();
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [permissions, setPermissions] = useState<CompanyPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAccessCatalog() {
      setIsLoading(true);
      setHasError(false);

      try {
        const [nextRoles, nextPermissions] = await Promise.all([
          companyAccessService.listRoles(),
          companyAccessService.listPermissions(),
        ]);
        if (!active) return;
        setRoles(nextRoles);
        setPermissions(nextPermissions);
      } catch {
        if (!active) return;
        setHasError(true);
        setRoles([]);
        setPermissions([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadAccessCatalog();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const permissionByCode = useMemo(
    () => new Map(permissions.map((permission) => [permission.code, permission])),
    [permissions],
  );

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, CompanyPermission[]>();
    permissions.forEach((permission) => {
      const items = groups.get(permission.module) ?? [];
      items.push(permission);
      groups.set(permission.module, items);
    });

    return Array.from(groups.entries())
      .sort(([left], [right]) =>
        t(`companyRoles.modules.${left}`, { defaultValue: left }).localeCompare(
          t(`companyRoles.modules.${right}`, { defaultValue: right }),
          i18n.language,
        ),
      )
      .map(([module, items]) => ({
        module,
        items: [...items].sort((left, right) =>
          getUserPermissionLabel(t, left.code, left.label).localeCompare(
            getUserPermissionLabel(t, right.code, right.label),
            i18n.language,
          ),
        ),
      }));
  }, [i18n.language, permissions, t]);

  function getRoleName(role: CompanyRole): string {
    if (!role.is_system) return role.name;
    return t(`companyRoles.roleNames.${role.name.toLowerCase()}`, {
      defaultValue: role.name,
    });
  }

  function openForm() {
    setRoleName('');
    setSelectedCodes([]);
    setFormError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setIsFormOpen(false);
    setFormError(null);
  }

  function togglePermission(code: string) {
    setSelectedCodes((current) =>
      current.includes(code)
        ? current.filter((permissionCode) => permissionCode !== code)
        : [...current, code],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = roleName.trim();
    if (!name) {
      setFormError(t('companyRoles.form.nameRequired'));
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await companyAccessService.createRole({ name, permissions: selectedCodes });
      setIsFormOpen(false);
      setReloadToken((current) => current + 1);
    } catch (error) {
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : t('companyRoles.form.saveError'),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageCard>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
              {t('companyRoles.title')}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">
              {t('companyRoles.description')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-9 items-center rounded-lg bg-surface-subtle px-3 text-sm font-semibold text-text-primary">
              {roles.length} {t('companyRoles.records')}
            </span>
            {canCreate ? (
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                onClick={openForm}
              >
                <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
                {t('companyRoles.newRole')}
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <LoadingState
            title={t('companyRoles.loadingTitle')}
            description={t('companyRoles.loadingDescription')}
          />
        ) : hasError ? (
          <EmptyState
            title={t('companyRoles.errorTitle')}
            description={t('companyRoles.errorDescription')}
          />
        ) : roles.length === 0 ? (
          <EmptyState
            title={t('companyRoles.emptyTitle')}
            description={t('companyRoles.emptyDescription')}
          />
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-3 lg:grid-cols-2">
              {roles.map((role) => (
              <article
                key={role.id}
                className="grid content-start gap-3 rounded-xl bg-surface-subtle/70 p-4 ring-1 ring-border-soft/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="m-0 text-base font-semibold text-text-primary">
                      {getRoleName(role)}
                    </h3>
                    <p className="mt-1 text-[12px] text-text-muted">
                      {t('companyRoles.permissionCount', { count: role.permissions.length })}
                    </p>
                  </div>
                  <span
                    className={[
                      'inline-flex min-h-7 items-center rounded-pill px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em]',
                      role.is_system
                        ? 'bg-primary/12 text-text-accent'
                        : 'bg-success-bg text-success',
                    ].join(' ')}
                  >
                    {role.is_system
                      ? t('companyRoles.systemRole')
                      : t('companyRoles.customRole')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.map((code) => {
                    const permission = permissionByCode.get(code);
                    return (
                      <span
                        key={code}
                        className="inline-flex min-h-7 items-center rounded-lg bg-background-default px-2.5 text-[11px] font-semibold text-text-secondary ring-1 ring-border-soft/35"
                        title={getUserPermissionDescription(t, code)}
                      >
                        {getUserPermissionLabel(t, code, permission?.label)}
                      </span>
                    );
                  })}
                </div>
              </article>
              ))}
            </div>

            <section className="grid gap-3 border-t border-border-soft/50 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="m-0 text-[0.95rem] font-semibold text-text-primary">
                    {t('companyRoles.catalogTitle')}
                  </h3>
                  <p className="mt-1 text-[12px] text-text-secondary">
                    {t('companyRoles.catalogDescription')}
                  </p>
                </div>
                <span className="inline-flex min-h-8 items-center rounded-lg bg-primary/10 px-3 text-[12px] font-semibold text-text-accent">
                  {t('companyRoles.catalogCount', { count: permissions.length })}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {groupedPermissions.map((group) => (
                  <div
                    key={group.module}
                    className="grid content-start gap-2 rounded-xl bg-background-default/65 p-3 ring-1 ring-border-soft/35"
                  >
                    <h4 className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      {t(`companyRoles.modules.${group.module}`, {
                        defaultValue: group.module,
                      })}
                    </h4>
                    <div className="grid gap-1.5">
                      {group.items.map((permission) => (
                        <div
                          key={permission.code}
                          className="rounded-lg bg-surface-card px-3 py-2 ring-1 ring-border-soft/30"
                        >
                          <p className="m-0 text-sm font-semibold text-text-primary">
                            {getUserPermissionLabel(t, permission.code, permission.label)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-text-muted">
                            {permission.code}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </PageCard>

      {isFormOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
          onClick={closeForm}
          role="presentation"
        >
          <aside
            className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[680px] min-[641px]:p-5"
            onClick={(event) => event.stopPropagation()}
            aria-label={t('companyRoles.form.title')}
          >
            <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {t('companyRoles.form.eyebrow')}
                  </p>
                  <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                    {t('companyRoles.form.title')}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {t('companyRoles.form.subtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
                  onClick={closeForm}
                  disabled={isSaving}
                  aria-label={t('companyRoles.form.close')}
                >
                  <AppIcon name="close" className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </header>

            <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-1.5 rounded-xl bg-surface-card p-4 ring-1 ring-border-soft/40">
                <label
                  htmlFor="company-role-name"
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
                >
                  {t('companyRoles.form.name')}
                </label>
                <input
                  id="company-role-name"
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  className={inputClassName}
                  placeholder={t('companyRoles.form.namePlaceholder')}
                  disabled={isSaving}
                  maxLength={80}
                  required
                />
              </div>

              <div className="grid gap-3 rounded-xl bg-surface-card p-4 ring-1 ring-border-soft/40">
                <div>
                  <h3 className="m-0 text-sm font-semibold text-text-primary">
                    {t('companyRoles.form.permissionsTitle')}
                  </h3>
                  <p className="mt-1 text-[12px] text-text-secondary">
                    {t('companyRoles.form.permissionsDescription', {
                      count: selectedCodes.length,
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-8 items-center rounded-lg bg-primary/10 px-3 text-[12px] font-semibold text-text-accent ring-1 ring-primary/20 transition duration-fast hover:bg-primary/15 disabled:opacity-60"
                    onClick={() => setSelectedCodes(permissions.map((permission) => permission.code))}
                    disabled={isSaving || selectedCodes.length === permissions.length}
                  >
                    {t('companyRoles.form.selectAll')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-8 items-center rounded-lg bg-surface-subtle px-3 text-[12px] font-semibold text-text-primary ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-muted disabled:opacity-60"
                    onClick={() => setSelectedCodes([])}
                    disabled={isSaving || selectedCodes.length === 0}
                  >
                    {t('companyRoles.form.clearAll')}
                  </button>
                </div>

                {groupedPermissions.map((group) => (
                  <section key={group.module} className="grid gap-2">
                    <h4 className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      {t(`companyRoles.modules.${group.module}`, {
                        defaultValue: group.module,
                      })}
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.items.map((permission) => {
                        const checked = selectedCodes.includes(permission.code);
                        return (
                          <button
                            key={permission.code}
                            type="button"
                            className={[
                              'flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left ring-1 transition duration-fast',
                              checked
                                ? 'bg-primary/10 text-text-primary ring-primary/30'
                                : 'bg-surface-subtle text-text-secondary ring-border-soft/35 hover:bg-surface-muted',
                            ].join(' ')}
                            onClick={() => togglePermission(permission.code)}
                            disabled={isSaving}
                            aria-pressed={checked}
                          >
                            <span
                              className={[
                                'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                checked
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-border-soft bg-background-default',
                              ].join(' ')}
                            >
                              {checked ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                            </span>
                            <span className="grid gap-0.5">
                              <span className="text-sm font-semibold">
                                {getUserPermissionLabel(t, permission.code, permission.label)}
                              </span>
                              <span className="text-[12px] text-text-muted">
                                {getUserPermissionDescription(t, permission.code)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              {formError ? (
                <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving || !roleName.trim()}
                >
                  {isSaving ? t('companyRoles.form.saving') : t('companyRoles.form.submit')}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-primary ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-muted disabled:opacity-60"
                  onClick={closeForm}
                  disabled={isSaving}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default CompanyRolesPanel;
