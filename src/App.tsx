import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowDownRight, ArrowUpRight, Plus, WalletCards, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import './styles.css'

type TransactionType = 'income' | 'expense'
type Transaction = { id: string | number; label: string; amount: number; category: string; type: TransactionType; date: string }

const initialTransactions: Transaction[] = [
  { id: 1, label: 'Salaire', amount: 2400, category: 'Revenus', type: 'income', date: '01/09/2026' },
  { id: 2, label: 'Loyer', amount: 820, category: 'Logement', type: 'expense', date: '02/09/2026' },
  { id: 3, label: 'Courses', amount: 64.2, category: 'Alimentation', type: 'expense', date: '08/09/2026' },
]

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const today = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<TransactionType>('expense')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Alimentation')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) return
    supabase.from('transactions').select('*').order('occurred_on', { ascending: false }).then(({ data }) => {
      if (data) setTransactions(data.map(tx => ({ id: tx.id, label: tx.label, amount: Number(tx.amount), category: tx.category, type: tx.kind, date: new Intl.DateTimeFormat('fr-FR').format(new Date(tx.occurred_on)) })))
    })
  }, [session])

  const totals = useMemo(() => transactions.reduce((acc, tx) => {
    acc[tx.type] += tx.amount
    return acc
  }, { income: 0, expense: 0 }), [transactions])
  const balance = totals.income - totals.expense
  const remaining = Math.max(0, 1500 - totals.expense)

  async function addTransaction() {
    const parsedAmount = Number(amount.replace(',', '.'))
    if (!label.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return
    const transaction = { id: Date.now(), label: label.trim(), amount: parsedAmount, category, type, date: today }
    if (supabase && session) {
      const { data, error } = await supabase.from('transactions').insert({ label: transaction.label, amount: transaction.amount, category, kind: type, user_id: session.user.id }).select().single()
      if (error || !data) return
      transaction.id = data.id
    }
    setTransactions(current => [transaction, ...current])
    setLabel('')
    setAmount('')
    setIsOpen(false)
  }

  if (session === undefined) return <main className="app-shell"><p className="hero">Chargement sécurisé…</p></main>
  if (supabase && !session) return <AuthPanel />

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><WalletCards size={24} /><span>Finances</span><strong>quotidiennes</strong></div>
      <button className="primary-button" onClick={() => setIsOpen(true)}><Plus size={18} /> Ajouter une opération</button>
    </header>

    <section className="hero">
      <p className="eyebrow">SEPTEMBRE 2026</p>
      <h1>Bonjour, Marx</h1>
      <p>Voici le point sur vos finances ce mois-ci.</p>
    </section>

    <section className="cards" aria-label="Résumé financier">
      <article className="balance-card"><span>Solde du mois</span><strong>{euro.format(balance)}</strong><small><ArrowUpRight size={15} /> Disponible après vos dépenses</small></article>
      <article className="metric-card"><span>Revenus</span><strong>{euro.format(totals.income)}</strong><small className="positive"><ArrowUpRight size={15} /> Ce mois</small></article>
      <article className="metric-card"><span>Dépenses</span><strong>{euro.format(totals.expense)}</strong><small className="negative"><ArrowDownRight size={15} /> Ce mois</small></article>
      <article className="metric-card"><span>Budget restant</span><strong>{euro.format(remaining)}</strong><small>sur 1 500,00 €</small></article>
    </section>

    <section className="grid">
      <article className="panel transaction-panel">
        <div className="panel-heading"><div><h2>Dernières opérations</h2><p>Vos mouvements les plus récents</p></div><button className="text-button" onClick={() => setIsOpen(true)}>Ajouter</button></div>
        <div className="transactions">
          {transactions.map(tx => <div className="transaction" key={tx.id}>
            <div className={`icon ${tx.type}`} aria-hidden="true">{tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}</div>
            <div><strong>{tx.label}</strong><span>{tx.category} · {tx.date}</span></div>
            <b className={tx.type}>{tx.type === 'income' ? '+' : '-'}{euro.format(tx.amount)}</b>
          </div>)}
        </div>
      </article>
      <article className="panel budget-panel">
        <div className="panel-heading"><div><h2>Budget du mois</h2><p>Suivi de vos enveloppes</p></div></div>
        <BudgetRow name="Logement" spent={820} max={850} color="#6d5dfc" />
        <BudgetRow name="Alimentation" spent={128} max={350} color="#f59e0b" />
        <BudgetRow name="Transport" spent={72} max={180} color="#10b981" />
        <BudgetRow name="Loisirs" spent={42} max={150} color="#ec4899" />
      </article>
    </section>

    {isOpen && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="close-button" aria-label="Fermer" onClick={() => setIsOpen(false)}><X size={20} /></button>
      <p className="eyebrow">NOUVELLE OPÉRATION</p><h2 id="modal-title">Ajouter une opération</h2>
      <div className="type-selector"><button className={type === 'expense' ? 'selected expense' : ''} onClick={() => setType('expense')}>Dépense</button><button className={type === 'income' ? 'selected income' : ''} onClick={() => setType('income')}>Revenu</button></div>
      <label>Libellé<input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex. Courses" autoFocus /></label>
      <label>Montant<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" /></label>
      <label>Catégorie<select value={category} onChange={e => setCategory(e.target.value)}><option>Alimentation</option><option>Logement</option><option>Transport</option><option>Loisirs</option><option>Revenus</option><option>Autre</option></select></label>
      <button className="primary-button full" onClick={addTransaction}>Enregistrer</button>
    </section></div>}
  </main>
}

function AuthPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [message, setMessage] = useState('')

  async function submit() {
    if (!supabase || !email || password.length < 6) { setMessage('Saisissez un e-mail et un mot de passe d’au moins 6 caractères.'); return }
    const action = isSignup ? supabase.auth.signUp({ email, password }) : supabase.auth.signInWithPassword({ email, password })
    const { error } = await action
    setMessage(error ? error.message : isSignup ? 'Compte créé. Vérifiez votre e-mail pour confirmer votre inscription.' : '')
  }

  return <main className="app-shell auth-shell"><section className="modal auth-panel">
    <div className="brand"><WalletCards size={24} /><span>Finances</span><strong>quotidiennes</strong></div>
    <p className="eyebrow">ESPACE PERSONNEL</p><h2>{isSignup ? 'Créer un compte' : 'Connexion'}</h2>
    <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Mot de passe<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
    {message && <p className="auth-message">{message}</p>}
    <button className="primary-button full" onClick={submit}>{isSignup ? 'Créer mon compte' : 'Se connecter'}</button>
    <button className="text-button auth-switch" onClick={() => { setIsSignup(!isSignup); setMessage('') }}>{isSignup ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}</button>
  </section></main>
}

function BudgetRow({ name, spent, max, color }: { name: string; spent: number; max: number; color: string }) {
  const percent = Math.min(100, (spent / max) * 100)
  return <div className="budget-row"><div><span>{name}</span><strong>{euro.format(spent)} <small>sur {euro.format(max)}</small></strong></div><div className="progress"><i style={{ width: `${percent}%`, backgroundColor: color }} /></div></div>
}
