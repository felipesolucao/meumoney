// ============================================================================
// PÁGINA: Menu
// ============================================================================
import Link from "next/link";
import Image from "next/image";
import { exigirSessao } from "../../lib/auth";
import BotaoSair from "../../components/BotaoSair";
import {
  IconPlus,
  IconReceipt,
  IconWallet,
  IconCalendar,
  IconUser,
  IconDocument,
  IconChart,
  IconUsers,
} from "../../components/Icons";

const ITENS = [
  { href: "/financeiro/novo", icon: IconPlus, label: "Novo lançamento", desc: "Cadastrar uma receita ou despesa" },
  { href: "/financeiro/pagar", icon: IconReceipt, label: "Contas a pagar", desc: "Histórico de despesas" },
  { href: "/financeiro/receber", icon: IconWallet, label: "Contas a receber", desc: "Histórico de receitas" },
  { href: "/parcelas", icon: IconCalendar, label: "Parcelas", desc: "Ver todas as parcelas por período" },
  { href: "/clientes/novo", icon: IconUser, label: "Novo cliente", desc: "Cadastrar um novo cliente" },
  { href: "/contratos/novo", icon: IconDocument, label: "Novo contrato", desc: "Criar um novo empréstimo" },
  { href: "/relatorios", icon: IconChart, label: "Relatórios", desc: "Visão geral da carteira" },
];

export default async function Menu() {
  const sessao = await exigirSessao();

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <Image src="/logo.png" alt="MeuMoney" width={48} height={48} />
        <div>
          <h1 className="text-2xl font-bold">MeuMoney</h1>
          <p className="text-muted text-sm">{sessao.email}</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-3">
        {sessao.papel === "admin" && (
          <Link href="/admin" className="card flex items-center gap-3 block" style={{ background: "#eafaf0" }}>
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary flex-shrink-0">
              <IconUsers size={20} />
            </div>
            <div>
              <p className="font-bold">Painel de administrador</p>
              <p className="text-sm text-muted">Usuários cadastrados na plataforma</p>
            </div>
          </Link>
        )}

        {ITENS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="card flex items-center gap-3 block">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-primary flex-shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-bold">{item.label}</p>
                <p className="text-sm text-muted">{item.desc}</p>
              </div>
            </Link>
          );
        })}

        <div className="card">
          <p className="font-bold">Suporte</p>
          <p className="text-sm text-muted mt-1">
            Dúvidas ou problemas com o app? Entre em contato com o administrador do sistema.
          </p>
        </div>

        <BotaoSair />
      </div>
    </div>
  );
}
