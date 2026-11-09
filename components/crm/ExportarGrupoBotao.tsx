"use client";

import { useState } from 'react';
import type { LeadCrmResumo, EstagioConfigCrm } from '../../lib/crm';
import { useToast } from '../ToastProvider';
import { IconDocument } from '../Icons';

export default function ExportarGrupoBotao({ leads, grupo }: { leads: LeadCrmResumo[]; grupo: EstagioConfigCrm }) {
  const [exportando, setExportando] = useState(false);
  const showToast = useToast();
  async function exportar() {
    if (exportando) return;
    setExportando(true);
    try {
      const { baixarRelatorioGrupo } = await import('../../lib/crmGrupoExcel');
      await baixarRelatorioGrupo(leads, grupo);
    } catch {
      showToast('Não foi possível gerar o relatório Excel. Tente novamente.', 'erro');
    } finally {
      setExportando(false);
    }
  }
  return (
    <button
      type="button"
      className="crm-btn crm-btn-ghost crm-btn-sm crm-column-add"
      disabled={exportando}
      onClick={() => void exportar()}
      title={`Exportar todas as empresas de ${grupo.label}, independentemente dos filtros`}
      aria-label={`Exportar Excel do grupo ${grupo.label}`}
    >
      <IconDocument size={13} /> {exportando ? 'Gerando Excel…' : 'Exportar Excel'}
    </button>
  );
}
