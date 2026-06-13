import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePhoneAuth } from '@/hooks/usePhoneAuth';

describe('usePhoneAuth', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('rejette un numéro invalide renvoyé par otp-send', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: false,
        reason: 'invalid_phone',
        message: 'Format invalide.',
      }),
    });

    const { result } = renderHook(() => usePhoneAuth());

    await act(async () => {
      await result.current.sendOtp('+123');
    });

    await waitFor(() => {
      expect(result.current.state.step).toBe('error');
    });

    expect(result.current.state.errorMessage).toBe('Format invalide.');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/otp-send');
    expect(init.method).toBe('POST');
  });

  it('passe en otp_sent après envoi réussi', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        channel: 'sms',
        retryAfter: 60,
        maskedPhone: '+237••••678',
      }),
    });

    const { result } = renderHook(() => usePhoneAuth());

    await act(async () => {
      await result.current.sendOtp('+237612345678');
    });

    await waitFor(() => {
      expect(result.current.state.step).toBe('otp_sent');
    });

    expect(result.current.state.phone).toBe('+237612345678');
    expect(result.current.state.cooldownSeconds).toBe(60);
  });
});
