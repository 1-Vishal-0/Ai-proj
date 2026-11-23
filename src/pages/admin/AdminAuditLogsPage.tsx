import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, Activity, Clock, User, Download } from 'lucide-react';
import { db } from '../../services/db/database';
import { exportToCSV } from '../../services/export.service';

export const AdminAuditLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const logs = db.getAuditLogs(100);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === 'all' || log.user_role === selectedRole;
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;

    return matchesSearch && matchesRole && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  const handleExportLogs = () => {
    const today = new Date().toISOString().split('T')[0];
    const headers = ['Timestamp', 'User Name', 'Role', 'Action', 'Entity', 'Entity ID', 'IP Address', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.user_name,
      l.user_role,
      l.action,
      l.entity,
      l.entity_id,
      l.ip_address || 'N/A',
      l.details,
    ]);
    exportToCSV(`System_Audit_Logs_${today}.csv`, headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">System Activity & Security Audit Trail</h2>
          <p className="text-xs text-slate-500">
            Immutable log of all attendance markings, manual overrides, code creations, and role actions
          </p>
        </div>
        <button
          onClick={handleExportLogs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-white hover:bg-slate-900 transition self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor, action description or record ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action Code</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4 text-right">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No matching audit log records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      {log.user_name}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.user_role === 'admin'
                            ? 'bg-indigo-100 text-indigo-700'
                            : log.user_role === 'teacher'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {log.user_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {log.entity}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-sm break-words">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
