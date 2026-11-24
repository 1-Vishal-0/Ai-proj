import React, { useState } from 'react';
import { Download } from 'lucide-react';
import type { AuditLog } from '../../../types';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { settingsService } from '../../../services/settings.service';
import { reportsService } from '../../../services/reports.service';
import {
  Badge,
  Button,
  DataTable,
  FilterBar,
  PageHeader,
  SearchInput,
  Select,
  type DataColumn,
} from '../../../components/ui';
import { getTodayIsoDate } from '../../../lib/date';

export const AdminAuditLogsPage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const [older,setOlder] = useState<AuditLog[]>([]);
  const [loading,setLoading] = useState(false);
  const [endReached,setEndReached] = useState(false);
  const recent = settingsService.getAuditLogs(100);
  const logs = [...new Map([...recent,...older].map(row=>[row.id,row])).values()];
  const loadMore = async () => {
    setLoading(true);
    try {
      const rows = await settingsService.getOlderAuditLogs(logs[logs.length-1]);
      setOlder(previous=>[...previous,...rows]);
      setEndReached(rows.length<100);
    } catch(error) {
      toast({variant:'error',title:'Unable to load older activity',description:error instanceof Error ? error.message : undefined});
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.user_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entity_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === 'all' || log.user_role === selectedRole;
    const matchesAction =
      selectedAction === 'all' || log.action === selectedAction;

    return matchesSearch && matchesRole && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  const handleExportLogs = () => {
    const today = getTodayIsoDate();
    const headers = [
      'Timestamp',
      'User Name',
      'Role',
      'Action',
      'Entity',
      'Entity ID',
      'IP Address',
      'Details',
    ];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.user_name,
      l.user_role,
      l.action,
      l.entity,
      l.entity_id,
      l.ip_address || '',
      l.details,
    ]);
    reportsService.exportCSV(`System_Audit_Logs_${today}.csv`, headers, rows);
    toast({
      variant: 'success',
      title: 'Audit log exported',
      description: `${filteredLogs.length} audit event(s) downloaded as CSV.`,
    });
  };

  const columns: DataColumn<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortValue: (l) => l.timestamp,
      render: (l) => (
        <span className="font-mono text-[11px] text-secondary tabular-nums whitespace-nowrap">
          {new Date(l.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      sortValue: (l) => l.user_name,
      render: (l) => (
        <span className="font-medium text-primary whitespace-nowrap">
          {l.user_name}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (l) => (
        <Badge
          variant={
            l.user_role === 'admin'
              ? 'primary'
              : l.user_role === 'teacher'
              ? 'success'
              : 'info'
          }
        >
          {l.user_role || 'Operator'}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortValue: (l) => l.action,
      render: (l) => (
        <span className="font-mono text-[11px] font-semibold text-brand-600">
          {l.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (l) => (
        <span className="font-mono text-[11px] text-secondary">{l.entity}<small className="block break-all">{l.entity_id}</small></span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (l) => (
        <span className="text-secondary max-w-sm break-words block">
          {l.details}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'IP',
      align: 'right',
      render: (l) => (
        <span className="font-mono text-[11px] text-muted">
          {l.ip_address || ''}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Trail"
        description="Chronological security and modification log across attendance, timetable and directory actions"
        actions={
          <Button
            variant="outline"
            onClick={handleExportLogs}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        }
      />

      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search actor, action code or details..."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
          <Select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="hod">Department head</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </Select>
          <Select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            aria-label="Filter by action"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </Select>
        </div>
      </FilterBar>

      <DataTable
        data={filteredLogs}
        columns={columns}
        keyExtractor={(l) => l.id}
        pageSize={15}
        stickyHeader
        selectable
        renderMobileCard={(l) => (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold text-brand-600">
                {l.action}
              </span>
              <Badge variant="neutral">{l.user_role}</Badge>
            </div>
            <p className="text-xs text-primary">{l.details}</p>
            <p className="text-xs break-all">{l.entity} {l.entity_id}</p>
            <p className="text-[11px] font-mono text-muted">
              {l.user_name} • {new Date(l.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      />
      {recent.length === 100 && !endReached && <Button variant="outline" disabled={loading} onClick={loadMore}>
        {loading ? 'Loading activity…' : 'Load older activity'}
      </Button>}
    </div>
  );
};
