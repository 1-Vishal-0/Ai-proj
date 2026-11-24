import React, { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  Search,
  X,
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { settingsService } from '../../services/settings.service';
import { useAuth } from '../../hooks/useAuth';
import { useDatabaseVersion } from '../../hooks/useDatabase';
import { notificationsService } from '../../services/notifications.service';
import { requestsService } from '../../services/requests.service';
import {
  NAV_BY_ROLE,
  NAV_MODULES_BY_ROLE,
  ROUTES,
  getModuleEntryPath,
  getModuleForPath,
  type NavBadgeKey,
  type NavModuleConfig,
} from '../../app/config/navigation';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../lib/cn';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
}) => {
  useDatabaseVersion();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
  const role = currentUser?.role || 'admin';

  const branding = settingsService.getSettings().short_name || 'Academic Portal';
  const modules = NAV_MODULES_BY_ROLE[role];
  const routeModule = getModuleForPath(location.pathname, role);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Keep contextual sidebar synced to route unless user explicitly picked another module
  const activeModule: NavModuleConfig = useMemo(() => {
    if (selectedModuleId) {
      const explicit = modules.find((m) => m.id === selectedModuleId);
      if (explicit) return explicit;
    }
    return routeModule;
  }, [modules, routeModule, selectedModuleId]);

  const topModules = modules.filter((m) => m.placement !== 'bottom');
  const bottomModules = modules.filter((m) => m.placement === 'bottom');

  const pendingCorrectionsCount = requestsService.getPendingCount();
  const unreadCount = currentUser
    ? notificationsService.getUnreadCount(currentUser.id)
    : 0;

  const getBadgeValue = (badgeKey?: NavBadgeKey) => {
    if (badgeKey === 'pendingCorrections' && pendingCorrectionsCount > 0) {
      return pendingCorrectionsCount;
    }
    if (badgeKey === 'unreadNotifications' && unreadCount > 0) {
      return unreadCount;
    }
    return undefined;
  };

  const getModuleBadgeCount = (mod: NavModuleConfig): number => {
    let total = 0;
    for (const g of mod.groups) {
      for (const item of g.items) {
        const val = getBadgeValue(item.badgeKey);
        if (val) total += val;
      }
    }
    return total;
  };

  const handleSelectModule = (mod: NavModuleConfig) => {
    setSelectedModuleId(mod.id);
    setSearchQuery('');
    if (isCollapsed) {
      onToggleCollapse();
    }
    const entry = getModuleEntryPath(mod);
    if (location.pathname !== entry) {
      navigate(entry);
    }
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    return NAV_BY_ROLE[role].filter((item) =>
      item.label.toLowerCase().includes(trimmedQuery)
    );
  }, [role, trimmedQuery]);

  const renderRailButton = (mod: NavModuleConfig) => {
    const Icon = mod.icon;
    const isActive = activeModule.id === mod.id;
    const badgeCount = getModuleBadgeCount(mod);

    return (
      <Tooltip key={mod.id} content={mod.label} side="right">
        <button
          type="button"
          onClick={() => handleSelectModule(mod)}
          aria-label={mod.label}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-md transition-colors',
            isActive
              ? 'bg-nav-active text-white'
              : 'text-white/80 hover:bg-nav-hover hover:text-white'
          )}
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
          {badgeCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-white" />
          )}
        </button>
      </Tooltip>
    );
  };

  const renderSidebarContent = (showCloseButton: boolean) => (role === 'admin' || role === 'hod') && (showCloseButton || !isCollapsed) ? (
    <div className="flex h-full w-[264px] max-w-[86vw] flex-col bg-slate-900 text-slate-100">
      <div className="flex min-h-16 items-center gap-3 border-b border-white/10 px-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-200 font-bold text-slate-900">{branding.slice(0,1).toUpperCase()}</span>
        <span className="flex-1 truncate font-semibold" title={branding}>{branding}</span>
        <button type="button" aria-label={showCloseButton ? 'Close navigation' : 'Collapse navigation'} onClick={showCloseButton ? onCloseMobile : onToggleCollapse} className="rounded p-2 hover:bg-white/10">
          {showCloseButton ? <X size={16}/> : <PanelLeftClose size={16}/>}
        </button>
      </div>
      <label className="mx-4 my-3 flex items-center gap-2 rounded-md border border-white/20 px-2 text-slate-300">
        <Search size={15}/><input aria-label="Search navigation" placeholder="Find a page" value={searchQuery}
          onChange={e=>setSearchQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white"/>
      </label>
      <nav aria-label="University workspace" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {modules.map(mod => {
          const items = mod.groups.flatMap(group=>group.items).filter(item=>!trimmedQuery || (mod.label+' '+item.label).toLowerCase().includes(trimmedQuery));
          if (!items.length) return null;
          return <section key={mod.id} className="mt-3"><h2 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{mod.label}</h2>
            {items.map(item=><NavLink key={item.path} to={item.path} onClick={showCloseButton ? onCloseMobile : undefined}
              className={({isActive})=>cn('flex items-center gap-3 rounded-md px-2 py-1.5 text-[13px]',isActive?'bg-teal-200/15 font-semibold text-teal-200':'text-slate-200 hover:bg-white/10')}>
              <item.icon className="h-4 w-4 shrink-0"/><span className="flex-1">{item.label}</span>{getBadgeValue(item.badgeKey)}
            </NavLink>)}</section>;
        })}
      </nav>
    </div>
  ) : (
    <div className="flex h-full">
      {/* Tier 1: Primary Icon Rail (#2828D6, 64px) */}
      <div className="flex w-16 shrink-0 flex-col items-center justify-between bg-nav-rail py-3.5 select-none">
        <div className="flex flex-col items-center gap-3">
          {/* Institution monogram */}
          <button
            type="button"
            onClick={() => {
              const first = modules[0];
              if (first) handleSelectModule(first);
            }}
            title={branding} aria-label={branding + ' home'}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 text-white font-semibold text-base tracking-tight hover:bg-white/20 transition-colors"
          >
            {branding.slice(0,1).toUpperCase()}
          </button>

          <div className="h-px w-8 bg-nav-divider my-0.5" />

          {/* Primary module icons */}
          <nav aria-label="Primary modules" className="flex flex-col items-center gap-1.5">
            {topModules.map(renderRailButton)}
          </nav>
        </div>

        {/* Bottom controls: Administration/Settings & Sign Out */}
        <div className="flex flex-col items-center gap-1.5 pt-3 border-t border-nav-divider">
          {bottomModules.map(renderRailButton)}

          <Tooltip content="Sign out" side="right">
            <button
              type="button"
              onClick={async () => {
                try {
                  await logout();
                  navigate(ROUTES.LOGIN, { replace: true });
                } catch (err) {
                  toast({ variant: 'error', title: 'Unable to sign out', description: err instanceof Error ? err.message : undefined });
                }
              }}
              aria-label="Sign out"
              className="flex h-10 w-10 items-center justify-center rounded-md text-white/80 hover:bg-nav-hover hover:text-white transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Tier 2: Contextual Navigation Panel (#3939E7, 232px) */}
      <div
        className={cn(
          'flex w-[232px] shrink-0 flex-col bg-nav-panel text-white transition-all',
          !showCloseButton && isCollapsed && 'hidden'
        )}
      >
        {/* Module Header */}
        <div className="flex h-14 items-center justify-between px-4">
          <h2 className="text-[17px] font-semibold text-white truncate">
            {activeModule.label}
          </h2>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="rounded-md p-1.5 text-nav-muted hover:bg-nav-hover hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Tooltip content="Collapse sidebar" side="right">
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse contextual sidebar"
                className="rounded-md p-1.5 text-nav-muted hover:bg-nav-hover hover:text-white transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </Tooltip>
          )}
        </div>

        {/* Translucent Search Input */}
        <div className="px-3.5 pb-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nav-muted"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search navigation"
              className="w-full h-9 rounded-md bg-nav-input pl-8 pr-7 text-[13px] text-white placeholder:text-nav-muted border border-transparent focus:border-white/30 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-nav-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        <nav
          aria-label="Module navigation"
          className="nav-scroll flex-1 overflow-y-auto px-3 pb-4 space-y-5"
        >
          {searchResults ? (
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[11px] font-medium text-nav-muted">
                Matching pages ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <p className="px-2 py-2 text-xs text-nav-muted">
                  No matching pages.
                </p>
              ) : (
                searchResults.map((item) => {
                  const Icon = item.icon;
                  const badge = getBadgeValue(item.badgeKey);
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        setSelectedModuleId(null);
                        setSearchQuery('');
                        onCloseMobile();
                      }}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-nav-active text-white'
                            : 'text-white/90 hover:bg-nav-hover hover:text-white'
                        )
                      }
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 opacity-90" strokeWidth={1.75} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {badge !== undefined && (
                        <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-white/15 text-white tabular-nums">
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })
              )}
            </div>
          ) : (
            activeModule.groups.map((group) => {
              const groupKey = `${activeModule.id}:${group.groupLabel}`;
              const canCollapse = activeModule.groups.length > 1;
              const isGroupCollapsed = canCollapse && !!collapsedGroups[groupKey];

              return (
                <div key={groupKey} className="space-y-1">
                  {canCollapse ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupKey)}
                      className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-medium text-nav-muted hover:text-white transition-colors"
                    >
                      <span>{group.groupLabel}</span>
                      {isGroupCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : (
                    <div className="px-2 py-1 text-[11px] font-medium text-nav-muted">
                      {group.groupLabel}
                    </div>
                  )}

                  {!isGroupCollapsed && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const badge = getBadgeValue(item.badgeKey);

                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => {
                              setSelectedModuleId(null);
                              onCloseMobile();
                            }}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-nav-active text-white'
                                  : 'text-white/90 hover:bg-nav-hover hover:text-white'
                              )
                            }
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                className="w-4 h-4 shrink-0 opacity-90"
                                strokeWidth={1.75}
                              />
                              <span className="truncate">{item.label}</span>
                            </span>
                            {badge !== undefined && (
                              <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-white/15 text-white tabular-nums">
                                {badge}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-primary/30 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer (< md) */}
      <aside
        aria-label="Mobile navigation"
        className={cn(
          'no-print fixed inset-y-0 left-0 z-50 h-full transition-transform duration-200 ease-out md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {renderSidebarContent(true)}
      </aside>

      {/* Tablet & Desktop Dual-Tier Sidebar (md+) */}
      <aside
        aria-label="Primary navigation"
        className="no-print hidden md:flex h-full shrink-0"
      >
        {renderSidebarContent(false)}
      </aside>
    </>
  );
};
