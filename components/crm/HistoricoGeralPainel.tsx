'use client';
import type { EstagioConfigCrm } from '../../lib/crm';
import PopupCentral from '../PopupCentral';
import MovimentacoesHistorico from './MovimentacoesHistorico';

export default function HistoricoGeralPainel({ estagios, onFechar, onAbrirLead }: {
  estagios: EstagioConfigCrm[];
  onFechar: () => void;
  onAbrirLead: (id: string) => void;
}) {
  return <PopupCentral titulo="Histórico geral do CRM" onFechar={onFechar} className="crm-alertas-dialog">
    <p className="crm-alertas-intro">Movimentações e edições de todas as empresas, das mais recentes para as mais antigas.</p>
    <MovimentacoesHistorico estagios={estagios} onAbrirLead={onAbrirLead} />
  </PopupCentral>;
}
