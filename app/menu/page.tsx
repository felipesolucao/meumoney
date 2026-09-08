// ============================================================================
// PÁGINA: Menu
// ============================================================================
import Link from "next/link";
import Image from "next/image";
import logo from "../../public/logo.png";
import { exigirSessao } from "../../lib/auth";
import BotaoSair from "../../components/BotaoSair";
import ThemeToggle from "../../components/ThemeToggle";
import {
  IconPlus,
  IconReceipt,
  IconWallet,
  IconCalendar,
  IconUser,
  IconUsers as IconClientes,
  IconDocument,
  IconChart,
  IconUsers,
  IconTag,
  IconBuilding,
  IconChat,
} from "../../components/Icons";

// "Empréstimos" e "Clientes" saíram do rodapé (BottomNav) para abrir espaço
// para o botão central de nova transação — por isso entram aqui, no topo da
// lista, para continuarem a um toque de distância.
const ITENS = [
  { href: "/emprestimos", icon: IconWallet, label: "Contratos", desc: "Valor total, recebido e pendente dos contratos" },
  { href: "/clientes", icon: IconClientes, label: "Clientes", desc: "Lista de clientes e contratos" },
  { href: "/financeiro/novo", icon: IconPlus, label: "Novo lançamento", desc: "Cadastrar uma receita ou despesa" },
  { href: "/financeiro/pagar", icon: IconReceipt, label: "Contas a pagar", desc: "Histórico de despesas" },
  { href: "/financeiro/receber", icon: IconWallet, label: "Contas a receber", desc: "Histórico de receitas" },
  { href: "/financeiro/categorias", icon: IconTag, label: "Categorias", desc: "Emoji, nome e histórico por categoria" },
  { href: "/financeiro/contas", icon: IconBuilding, label: "Contas bancárias", desc: "Saldo por conta e edição de saldo" },
  { href: "/financeiro/relatorios", icon: IconChart, label: "Relatório por categoria", desc: "Gráfico e percentual de gasto/receita" },
  { href: "/parcelas", icon: IconCalendar, label: "Parcelas", desc: "Ver todas as parcelas por período" },
  { href: "/clientes/novo", icon: IconUser, label: "Novo cliente", desc: "Cadastrar um novo cliente" },
  { href: "/contratos/novo", icon: IconDocument, label: "Novo contrato", desc: "Criar um novo empréstimo" },
  { href: "/modelos-cobranca", icon: IconChat, label: "Modelos de cobrança", desc: "Personalizar mensagens de cobrança" },
  { href: "/relatorios", icon: IconChart, label: "Relatórios", desc: "Visão geral da carteira" },
];

export default async function Menu() {
  const sessao = await exigirSessao();

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <Image src={logo} alt="MeuMoney" width={48} height={48} unoptimized />
        <div>
          <h1 className="text-2xl font-bold">MeuMoney</h1>
          <p className="text-muted text-sm">{sessao.email}</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-3">
        <Link href="/perfil" className="card flex items-center gap-3 block">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ background: "var(--gradient-avatar)" }}
          >
            {sessao.nome.trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold">{sessao.nome}</p>
            <p className="text-sm text-muted">Ver e editar meu perfil</p>
          </div>
        </Link>

        {sessao.papel === "admin" && (
          <Link href="/admin" className="card flex items-center gap-3 block" style={{ background: "var(--color-primary-surface)" }}>
            <div className="w-12 h-12 rounded-md bg-card flex items-center justify-center text-primary flex-shrink-0">
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
              <div className="w-12 h-12 rounded-md bg-background flex items-center justify-center text-primary flex-shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-bold">{item.label}</p>
                <p className="text-sm text-muted">{item.desc}</p>
              </div>
            </Link>
          );
        })}

        {/* Aparência — trocar entre tema claro e escuro (branco/preto) */}
        <ThemeToggle />

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
