import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    getAuth: vi.fn(() => ({})),
    onAuthStateChanged: vi.fn(() => vi.fn()),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    GoogleAuthProvider: vi.fn(() => ({})),
    TwitterAuthProvider: vi.fn(() => ({})),
  };
});

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  get: vi.fn(() => Promise.resolve({ exists: () => false })),
  set: vi.fn(() => Promise.resolve()),
}));
