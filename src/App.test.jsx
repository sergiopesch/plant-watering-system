import { render, screen } from '@testing-library/react';
import App from './App.jsx';
import Studio, { buildInternalTubePath, getCadEnvelopeRadiusAtY } from './components/Studio.jsx';

test('renders the public studio as the default route', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /design, simulate, and build/i })).toBeInTheDocument();
});

test('renders the smart plant pot studio workspace', () => {
  render(<Studio />);

  expect(screen.getByRole('heading', { name: /design, simulate, and build/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /cleaner way to shape/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/^mode$/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^profile$/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^material$/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/exploded view/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/move x/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^rotate/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/rim radius/i)).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: /physics/i })).toBeInTheDocument();
  expect(screen.getByText(/hoop stress/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^scenario$/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/^temperature/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^humidity/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^light/i)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /start building/i })).toBeInTheDocument();
});

test('keeps the CAD irrigation tube inside the pot wall envelope', () => {
  const dimensions = {
    baseY: -1.33,
    outerBottom: 0.72,
    outerShoulder: 0.92,
    outerTop: 1.03,
    radius: 1,
    topY: 1.33,
    wall: 0.085,
  };

  for (const point of buildInternalTubePath(dimensions)) {
    const radialDistance = Math.hypot(point.x, point.z);
    const shellRadius = getCadEnvelopeRadiusAtY(point.y, dimensions);

    expect(radialDistance).toBeLessThan(shellRadius - 0.11);
  }

  const sensorSpineRadialDistance = Math.hypot(dimensions.radius * 0.58, dimensions.radius * 0.2);
  const sensorShellRadius = getCadEnvelopeRadiusAtY(0.1, dimensions);

  expect(sensorSpineRadialDistance).toBeLessThan(sensorShellRadius - 0.11);
});
