// CSV Export Utility for Attendance & Academic Reports
// Smart Attendance & Academic Management System

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (cell: string | number): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const institutionalHeader = [
    '# SMART ATTENDANCE & ACADEMIC MANAGEMENT PORTAL',
    '# College of Engineering & Technology - Academic Record',
    `# Report: ${filename.replace(/_/g, ' ').replace('.csv', '')} | Exported: ${new Date().toLocaleString()}`,
    '# ----------------------------------------------------------------------------------------',
  ].join('\r\n');

  const csvContent = institutionalHeader + '\r\n' + [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  // Check if running in browser DOM environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
