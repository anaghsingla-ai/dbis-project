import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { ScrollText, RefreshCw, Filter, ShieldCheck, ArrowRight, User } from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Select, EmptyState } from '../../components/common/Input';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/common/Table';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [tableFilter, setTableFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/audit-logs?table_name=${tableFilter}&limit=150`);
      if (res.success) setLogs(res.logs);
    } catch (err) {
      showToast('Error loading audit logs: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [tableFilter]);

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <ScrollText className="w-6 h-6 text-cyan-400" />
            Institutional Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immutable audit logs recording student record updates, application progression, and offer lifecycle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            options={[
              { value: '', label: 'All Audited Tables' },
              { value: 'Student', label: 'Student Records' },
              { value: 'Application', label: 'Application Statuses' },
              { value: 'Offer', label: 'Placement Offers' }
            ]}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={loadLogs}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-cyan-400" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-lg overflow-hidden">
        {logs.length === 0 && !loading ? (
          <div className="p-8">
            <EmptyState
              icon={<ScrollText className="w-8 h-8 text-cyan-400/60" />}
              title="No audit logs recorded yet"
              description="Audit records are generated automatically whenever student marks, applications, or offer statuses transition."
            />
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Log ID</Th>
                <Th>Target Table</Th>
                <Th>Record ID</Th>
                <Th>Field Modified</Th>
                <Th>Old Value &rarr; New Value</Th>
                <Th className="text-right">Timestamp</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logs.map((log) => (
                <Tr key={log.log_id}>
                  <Td>
                    <span className="font-mono text-slate-400 text-xs">#{log.log_id}</span>
                  </Td>
                  <Td>
                    <Badge variant="cyan" size="sm">{log.table_name}</Badge>
                  </Td>
                  <Td>
                    <span className="font-mono font-semibold text-slate-200">ID: #{log.record_id}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-cyan-300 font-semibold">{log.field_name}</span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-500 line-through">{log.old_value || 'NULL'}</span>
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                      <span className="text-emerald-400 font-bold">{log.new_value}</span>
                    </div>
                  </Td>
                  <Td className="text-right text-slate-400 font-mono text-xs">
                    {log.changed_at?.replace('T', ' ').substring(0, 19)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
