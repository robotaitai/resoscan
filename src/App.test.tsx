import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the heading', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /resoscan/i }),
    ).toBeInTheDocument()
  })

  it('renders the mic permission hint', () => {
    render(<App />)
    expect(
      screen.getByText(/microphone permission required/i),
    ).toBeInTheDocument()
  })

  it('renders the grant button', () => {
    render(<App />)
    const button = screen.getByRole('button', {
      name: /grant microphone access/i,
    })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })
})
