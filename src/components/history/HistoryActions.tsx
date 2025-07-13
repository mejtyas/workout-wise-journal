
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';

interface HistoryActionsProps {
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function HistoryActions({ onExport, onImport }: HistoryActionsProps) {
  return (
    <div className="flex gap-2">
      <Button onClick={onExport} variant="outline">
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
      <Button variant="outline" onClick={() => document.getElementById('csvImport')?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        Import CSV
      </Button>
      <input
        id="csvImport"
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={onImport}
      />
    </div>
  );
}
