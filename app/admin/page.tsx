// Substitua o arquivo app/admin/page.tsx por este.
// O acesso continua protegido por exigirAdmin() e pelo middleware existente.
import { exigirAdmin } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { formatarData } from "../../lib/calculos";
import BotaoVoltar from "../../components/BotaoVoltar";
import BotaoSair from "../../components/BotaoSair";

export const dynamic = "force-dynamic";

function inicioDoDia(data: Date) {
  const resultado = new Date(data);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
}

function dataHaDias(dias: number) {
  const data = inicioDoDia(new Date());
  data.setDate(data.getDate() - dias);
  return data;
}

function formatarDataHora(data: Date | null) {
  if (!data) return "Ainda não adicionou transações";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function plural(quantidade: number, singular: string, pluralTexto: string) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;
}

export default async function PainelAdmin() {
  await exigirAdmin();

  const hoje = inicioDoDia(new Date());
  const inicio7Dias = dataHaDias(7);
  const inicio30Dias = dataHaDias(30);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

  const [
    totalUsuarios,
    novosNoMes,
    novosMesAnterior,
    totalLancamentos,
    lancamentos7Dias,
    lancamentos30Dias,
    usuariosComAtividade30Dias,
    usuarios,
  ] = await Promise.all([
    prisma.usuario.count({ where: { papel: "usuario" } }),
    prisma.usuario.count({ where: { papel: "usuario", criadoEm: { gte: inicioMes } } }),
    prisma.usuario.count({
      where: {
        papel: "usuario",
        criadoEm: { gte: inicioMesAnterior, lt: inicioMes },
      },
    }),
    prisma.lancamento.count(),
    prisma.lancamento.count({ where: { criadoEm: { gte: inicio7Dias } } }),
    prisma.lancamento.count({ where: { criadoEm: { gte: inicio30Dias } } }),
    prisma.usuario.count({
      where: {
        papel: "usuario",
        lancamentos: { some: { criadoEm: { gte: inicio30Dias } } },
      },
    }),
    prisma.usuario.findMany({
      where: { papel: "usuario" },
      orderBy: { criadoEm: "desc" },
      include: {
        _count: { select: { lancamentos: true } },
        lancamentos: {
          select: { criadoEm: true },
          orderBy: { criadoEm: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const usuariosAtivos7Dias = usuarios.filter((usuario) => {
    const ultimaAtividade = usuario.lancamentos[0]?.criadoEm;
    return ultimaAtividade && ultimaAtividade >= inicio7Dias;
  }).length;
  const semAtividade = totalUsuarios - usuariosComAtividade30Dias;
  const taxaAtivacao = totalUsuarios
    ? Math.round((usuariosComAtividade30Dias / totalUsuarios) * 100)
    : 0;
  const variacaoNovos = novosNoMes - novosMesAnterior;

  const indicadores = [
    {
      titulo: "Usuários cadastrados",
      valor: totalUsuarios,
      detalhe: `${plural(novosNoMes, "novo este mês", "novos este mês")}${
        variacaoNovos === 0
          ? ""
          : ` (${variacaoNovos > 0 ? "+" : ""}${variacaoNovos} vs. mês anterior)`
      }`,
      icone: "👥",
      cor: "var(--color-primary)",
    },
    {
      titulo: "Usuários ativos",
      valor: usuariosComAtividade30Dias,
      detalhe: `${taxaAtivacao}% adicionaram transações nos últimos 30 dias`,
      icone: "⚡",
      cor: "var(--color-success)",
    },
    {
      titulo: "Transações",
      valor: totalLancamentos,
      detalhe: `${plural(lancamentos7Dias, "criada nos últimos 7 dias", "criadas nos últimos 7 dias")}`,
      icone: "↕️",
      cor: "var(--color-warning)",
    },
  ];

  return (
    <div className="pb-8">
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/menu" />
        <div>
          <h1 className="text-2xl font-bold">Painel master</h1>
          <p className="text-muted text-sm">Acompanhe cadastros e uso da plataforma</p>
        </div>
      </div>

      <main className="px-5 mt-5 space-y-6">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {indicadores.map((indicador) => (
            <article key={indicador.titulo} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                    {indicador.titulo}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold" style={{ color: indicador.cor }}>
                    {indicador.valor}
                  </p>
                </div>
                <span className="text-2xl" aria-hidden="true">{indicador.icone}</span>
              </div>
              <p className="mt-2 text-xs text-muted">{indicador.detalhe}</p>
            </article>
          ))}
        </section>

        <section className="card" style={{ background: "var(--color-primary-surface)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Engajamento</p>
              <p className="mt-1 text-xl font-bold text-primary">
                {usuariosAtivos7Dias} {usuariosAtivos7Dias === 1 ? "usuário ativo" : "usuários ativos"} nesta semana
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-primary">{lancamentos30Dias}</p>
              <p className="text-xs text-muted">transações nos últimos 30 dias</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-card">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${taxaAtivacao}%` }}
              aria-label={`${taxaAtivacao}% dos usuários estão ativos nos últimos 30 dias`}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {semAtividade === 0
              ? "Todos os usuários cadastrados tiveram atividade recente."
              : `${plural(semAtividade, "usuário não registrou", "usuários não registraram")} transações nos últimos 30 dias.`}
          </p>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Usuários</p>
              <h2 className="text-lg font-bold">Atividade por conta</h2>
            </div>
            <span className="text-xs text-muted">Atualizado ao abrir a página</span>
          </div>

          <div className="space-y-3">
            {usuarios.length === 0 ? (
              <div className="card text-center text-sm text-muted py-8">
                Nenhum usuário comum foi cadastrado ainda.
              </div>
            ) : (
              usuarios.map((usuario) => {
                const ultimaAtividade = usuario.lancamentos[0]?.criadoEm ?? null;
                const ativo = Boolean(ultimaAtividade && ultimaAtividade >= inicio30Dias);

                return (
                  <article key={usuario.id} className="card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{usuario.nome || "Usuário"}</p>
                        <p className="text-sm text-muted truncate">{usuario.email}</p>
                      </div>
                      <span
                        className="badge shrink-0"
                        style={ativo
                          ? { background: "var(--color-success-subtle)", color: "var(--color-success)" }
                          : { background: "var(--color-primary-surface)", color: "var(--color-muted)" }}
                      >
                        <span className="badge-dot" />
                        {ativo ? "Ativo" : "Sem atividade"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs text-muted">
                      <div>
                        <p className="font-semibold uppercase tracking-wide">Cadastro</p>
                        <p className="mt-1 text-sm text-foreground">{formatarData(usuario.criadoEm)}</p>
                      </div>
                      <div>
                        <p className="font-semibold uppercase tracking-wide">Transações</p>
                        <p className="mt-1 text-sm text-foreground">{usuario._count.lancamentos}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted">
                      Última transação: <span className="font-medium text-foreground">{formatarDataHora(ultimaAtividade)}</span>
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <BotaoSair />
      </main>
    </div>
  );
}
