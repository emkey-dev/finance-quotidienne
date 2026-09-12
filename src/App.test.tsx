import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Finance Quotidienne', () => {
  it('adds an expense and updates the balance', () => {
    render(<App />)

    expect(screen.getByText('Solde du mois')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /ajouter une opération/i }))
    fireEvent.click(screen.getByRole('button', { name: /dépense/i }))
    fireEvent.change(screen.getByLabelText(/libellé/i), { target: { value: 'Médecin' } })
    fireEvent.change(screen.getByLabelText(/montant/i), { target: { value: '45.50' } })
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    expect(screen.getByText('Médecin')).toBeInTheDocument()
    expect(screen.getByText('-45,50 €')).toBeInTheDocument()
  })
})
