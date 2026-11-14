import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './auth-provider';
import { CheckoutProvider, useCheckout } from './checkout-provider';

const order = { id: 'order-a', orderCode: 'order-a', status: 'PENDING' as const, totalAmount: 25000, createdAt: '2026-01-01', items: [] };
function Probe() {
  const auth = useAuth();
  const checkout = useCheckout();
  return <>
    <button onClick={() => auth.signIn('token-a', { id: 'a', email: 'a@example.invalid', loyaltyPoints: 0, role: 'CUSTOMER' })}>Account A</button>
    <button onClick={() => auth.signIn('token-b', { id: 'b', email: 'b@example.invalid', loyaltyPoints: 0, role: 'CUSTOMER' })}>Account B</button>
    <button onClick={() => checkout.setOrder(order)}>Save order</button>
    <button onClick={auth.logout}>Logout</button>
    <output data-testid="order">{checkout.order?.id ?? 'none'}</output>
    <output data-testid="ready">{String(checkout.hydrated)}</output>
  </>;
}
afterEach(() => { cleanup(); window.sessionStorage.clear(); vi.unstubAllGlobals(); });
it('separates saved checkout orders by account and restores the correct account snapshot', async () => {
  window.sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
  render(<AuthProvider><CheckoutProvider><Probe /></CheckoutProvider></AuthProvider>);
  fireEvent.click(screen.getByText('Account A'));
  await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
  fireEvent.click(screen.getByText('Save order'));
  expect(screen.getByTestId('order').textContent).toBe('order-a');
  fireEvent.click(screen.getByText('Account B'));
  expect(screen.getByTestId('order').textContent).toBe('none');
  await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
  fireEvent.click(screen.getByText('Account A'));
  await waitFor(() => expect(screen.getByTestId('order').textContent).toBe('order-a'));
  fireEvent.click(screen.getByText('Logout'));
  expect(screen.getByTestId('order').textContent).toBe('none');
});
