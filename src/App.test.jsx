import { render, screen } from '@testing-library/react';
import App from './App.jsx';
import Studio from './components/Studio.jsx';

test('renders the public studio as the default route', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /design, simulate, and build/i })).toBeInTheDocument();
});

test('renders the smart plant pot studio workspace', () => {
  render(<Studio />);

  expect(screen.getByRole('heading', { name: /design, simulate, and build/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /shape the pot/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^petg$/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /start building/i })).toBeInTheDocument();
});
