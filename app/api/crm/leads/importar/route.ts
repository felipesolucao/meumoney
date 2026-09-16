// ============================================================================
// API: /api/crm/leads/importar
// POST -> importa leads em massa a partir de um CSV (exportado do Excel,
//         Google Sheets etc). A primeira linha deve ser o cabeçalho.
// ----------------------------------------------------------------------------
// Cada linha vira um novo lead. Colunas não reconhecidas (ver
// CAMPOS_IMPORTACAO em lib/crm.ts) são preservadas em "camposExtras", sem
// perder informação — o usuário disse que vai complementar a planilha com
// novas colunas ao longo do tempo. Depois de criado, cada lead passa pelas
// automações do usuário (ver lib/crmAutomacao.ts) — útil pra planilha já vir
// com uma coluna "STATUS" que deve empurrar o lead pra uma etapa específica.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { EstagioLeadCrm } from "@prisma/client";
import { prisma } from "../../../../../lib/prisma";
import { obterSessao } from "../../../../../lib/auth";
import { CAMPOS_IMPORTACAO, ESTAGIOS, ESTAGIOS_IDS, normalizarTexto } from "../../../../../lib/crm";
import { aplicarAutomacoes } from "../../../../../lib/crmAutomacao";

// Aceita CSV separado por vírgula ou por ponto-e-vírgula (padrão do Excel
// em português), com campos entre aspas quando o valor tem o separador.
function analisarCsv(texto: string): string[][] {
  const separador = (texto.split("\n")[0]?.match(/;/g)?.length ?? 0) > (texto.split("\n")[0]?.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  const texto2 = texto.replace(/\r\n/g, "\n");
  for (let i = 0; i < texto2.length; i++) {
    const c = texto2[i];
    if (dentroDeAspas) {
      if (c === '"' && texto2[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        dentroDeAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroDeAspas = true;
    } else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((v) => v.trim() !== ""));
}

function paraNumero(valor: string): number | null {
  if (!valor) return null;
  const limpo = valor.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : null;
}

// Aceita dd/mm/aaaa, dd/mm/aa (formato comum de planilha brasileira) ou
// qualquer formato que o Date do JS já reconheça (ISO, etc).
function paraData(valor: string | undefined): Date | null {
  if (!valor) return null;
  const v = valor.trim();
  const brasileiro = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brasileiro) {
    const [, dia, mes, ano] = brasileiro;
    const anoCompleto = ano.length === 2 ? 2000 + parseInt(ano, 10) : parseInt(ano, 10);
    const data = new Date(Date.UTC(anoCompleto, parseInt(mes, 10) - 1, parseInt(dia, 10)));
    return Number.isNaN(data.getTime()) ? null : data;
  }
  const data = new Date(v);
  return Number.isNaN(data.getTime()) ? null : data;
}

function paraEstagio(valor: string | undefined): EstagioLeadCrm {
  if (!valor) return "primeira_tentativa";
  const alvo = normalizarTexto(valor);
  const encontrado = ESTAGIOS.find((e) => normalizarTexto(e.label) === alvo || e.id === alvo);
  if (encontrado) return encontrado.id;
  const direto = ESTAGIOS_IDS.find((id) => id === alvo);
  return direto ?? "primeira_tentativa";
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const conteudo: string | undefined = body?.csv;
  if (!conteudo || !conteudo.trim()) {
    return NextResponse.json({ error: "Envie o conteúdo do CSV." }, { status: 400 });
  }

  const linhas = analisarCsv(conteudo);
  if (linhas.length < 2) {
    return NextResponse.json({ error: "A planilha precisa de um cabeçalho e ao menos uma linha de dados." }, { status: 400 });
  }

  const cabecalho = linhas[0].map((c) => normalizarTexto(c));
  const indicePorChave = new Map<string, number>();
  cabecalho.forEach((coluna, indice) => {
    const campo = CAMPOS_IMPORTACAO.find((c) => c.aliases.includes(coluna));
    if (campo && !indicePorChave.has(campo.chave)) indicePorChave.set(campo.chave, indice);
  });

  if (!indicePorChave.has("nome")) {
    return NextResponse.json({ error: 'A planilha precisa de uma coluna "Nome" (ou "Associado").' }, { status: 400 });
  }

  const contadorPorEstagio = new Map<string, number>();
  for (const info of ESTAGIOS_IDS) {
    const atual = await prisma.leadCrm.count({ where: { usuarioId: sessao.id, estagio: info } });
    contadorPorEstagio.set(info, atual);
  }

  const linhasDeDados = linhas.slice(1);
  let importados = 0;

  for (const linha of linhasDeDados) {
    const pega = (chave: string) => {
      const indice = indicePorChave.get(chave);
      return indice !== undefined ? linha[indice]?.trim() : undefined;
    };
    const nome = pega("nome");
    if (!nome) continue;

    const estagio = paraEstagio(pega("estagioLabel"));
    const ordem = contadorPorEstagio.get(estagio) ?? 0;
    contadorPorEstagio.set(estagio, ordem + 1);

    // Colunas extras da planilha (não mapeadas) viram camposExtras, para o
    // usuário complementar o modelo aos poucos sem perder dado nenhum.
    const camposExtras: Record<string, string> = {};
    cabecalho.forEach((coluna, indice) => {
      const campo = CAMPOS_IMPORTACAO.find((c) => c.aliases.includes(coluna));
      if (!campo && linha[indice]?.trim()) camposExtras[linhas[0][indice].trim()] = linha[indice].trim();
    });

    const textoParcelas = pega("quantidadeParcelas");
    const textoColaboradores = pega("quantidadeColaboradores");

    let lead = await prisma.leadCrm.create({
      data: {
        nome,
        estagio,
        ordem,
        codigo: pega("codigo") || null,
        valorEmAberto: paraNumero(pega("valorEmAberto") ?? ""),
        valorPago: paraNumero(pega("valorPago") ?? ""),
        quantidadeParcelas: textoParcelas ? parseInt(textoParcelas, 10) || null : null,
        quantidadeColaboradores: textoColaboradores ? parseInt(textoColaboradores, 10) || null : null,
        cnpj: pega("cnpj") || null,
        telefone: pega("telefone") || null,
        telefone2: pega("telefone2") || null,
        email: pega("email") || null,
        sindicatoPatronal: pega("sindicatoPatronal") || null,
        origem: pega("origem") || null,
        observacoes: pega("observacoes") || null,
        parcelaMaisAntiga: paraData(pega("parcelaMaisAntiga")),
        parcelaMaisRecente: paraData(pega("parcelaMaisRecente")),
        dataUltimoContato: paraData(pega("dataUltimoContato")),
        statusPlanilha: pega("statusPlanilha") || null,
        camposExtras: Object.keys(camposExtras).length > 0 ? camposExtras : undefined,
        usuarioId: sessao.id,
      },
    });

    lead = await aplicarAutomacoes(sessao.id, lead);
    importados++;
  }

  if (importados === 0) {
    return NextResponse.json({ error: "Nenhuma linha válida encontrada (verifique a coluna Nome/Associado)." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, importados });
}
