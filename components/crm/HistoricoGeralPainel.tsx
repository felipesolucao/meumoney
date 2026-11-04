'use client';
import type { EstagioConfigCrm } from '../../lib/crm';
import PopupCentral from '../PopupCentral';
import MovimentacoesHistorico from './MovimentacoesHistorico';
import ImportacoesHistorico from './ImportacoesHistorico';
import { useState } from 'react';

export default function HistoricoGeralPainel({ estagios, onFechar, onAbrirLead, onAtualizado }: {
  estagios: EstagioConfigCrm[];
  onFechar: () => void;
  onAbrirLead: (id: string) => void;
  onAtualizado: () => void;
}) {
  const [versao, setVersao] = useState(0);
  return <PopupCentral titulo="Histórico geral do CRM" onFechar={onFechar} className="crm-alertas-dialog">
    <p className="crm-alertas-intro">Importações, atualizações de débitos, movimentações e edições da sua conta.</p>
    <ImportacoesHistorico onAtualizado={() => { setVersao(v => v + 1); onAtualizado(); }} />
    <MovimentacoesHistorico key={versao} estagios={estagios} onAbrirLead={onAbrirLead} />
  </PopupCentral>;
}
