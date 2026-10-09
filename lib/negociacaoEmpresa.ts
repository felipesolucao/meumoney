import { normalizarTexto } from './crm';
import type { DadosNegociacao } from './negociacoes';

export type EmpresaNegociacao = {
  id: string; nome: string; cnpj: string | null;
  valorEmAberto: string | number | null; quantidadeParcelas: number | null;
  telefone: string | null; telefone2?: string | null; email: string | null;
};

export function pesquisarEmpresas(empresas: EmpresaNegociacao[], termo: string) {
  const busca = normalizarTexto(termo);
  const digitos = termo.replace(/\D/g, '');
  return empresas.filter(e => normalizarTexto(e.nome).includes(busca)
    || Boolean(digitos && e.cnpj?.replace(/\D/g, '').includes(digitos)));
}

export function preencherEmpresa(dados: DadosNegociacao, empresa: EmpresaNegociacao): DadosNegociacao {
  const valor = Math.round(Number(empresa.valorEmAberto) * 100);
  const debito = Number.isSafeInteger(valor) && valor > 0 && valor <= 2000000000 ? valor : dados.debitoCentavos;
  return {
    ...dados, leadId: empresa.id, empresa: empresa.nome, cnpj: empresa.cnpj ?? '',
    telefone: empresa.telefone ?? '', telefone2: empresa.telefone2 ?? '',
    debitoCentavos: debito,
    totalCentavos: dados.parcelas.length ? dados.totalCentavos : debito,
    parcelasOriginais: empresa.quantidadeParcelas && empresa.quantidadeParcelas > 0 && empresa.quantidadeParcelas <= 10000 ? empresa.quantidadeParcelas : dados.parcelasOriginais,
  };
}
