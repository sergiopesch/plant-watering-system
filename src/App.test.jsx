import { render, screen } from '@testing-library/react';
import App from './App.jsx';

test('renders sign up prompt on the auth screen', () => {
  render(<App />);
  expect(screen.getByText(/sign up with/i)).toBeInTheDocument();
});
