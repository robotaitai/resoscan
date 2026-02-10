import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App – landing screen', () => {
  it('renders the heading', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /resoscan/i }),
    ).toBeInTheDocument()
  })

  it('renders the sweep range', () => {
    render(<App />)
    expect(screen.getByText(/20 Hz/)).toBeInTheDocument()
  })

  it('renders the Start measurement button', () => {
    render(<App />)
    const button = screen.getByRole('button', {
      name: /start measurement/i,
    })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('navigates to audio setup on button click', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /start measurement/i }))

    // Audio setup screen should now be visible
    expect(
      screen.getByRole('heading', { name: /audio setup/i }),
    ).toBeInTheDocument()

    // Landing content should be gone
    expect(
      screen.queryByRole('button', { name: /start measurement/i }),
    ).not.toBeInTheDocument()
  })
})
