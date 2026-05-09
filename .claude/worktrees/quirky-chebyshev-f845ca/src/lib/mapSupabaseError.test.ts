import { describe, it, expect } from 'vitest';
import { formatPostgrestError, mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';

// ────────────────────────────────────────────────────────────────
// formatPostgrestError
// ────────────────────────────────────────────────────────────────
describe('formatPostgrestError', () => {
  it('returns empty string for null', () => {
    expect(formatPostgrestError(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatPostgrestError(undefined)).toBe('');
  });

  it('returns trimmed string for string input', () => {
    expect(formatPostgrestError('  hello  ')).toBe('hello');
  });

  it('returns message from Error instance', () => {
    expect(formatPostgrestError(new Error('oops'))).toBe('oops');
  });

  it('aggregates message + details + hint from Error with extra props', () => {
    const err = Object.assign(new Error('msg'), { details: 'det', hint: 'hnt' });
    expect(formatPostgrestError(err)).toBe('msg — det — hnt');
  });

  it('aggregates message + details + hint from plain object', () => {
    const err = { message: 'msg', details: 'det', hint: 'hnt' };
    expect(formatPostgrestError(err)).toBe('msg — det — hnt');
  });

  it('skips empty / falsy parts', () => {
    const err = { message: '', details: 'useful info', hint: undefined };
    expect(formatPostgrestError(err)).toBe('useful info');
  });

  it('uses only details when message is absent', () => {
    const err = { details: 'FK violation on table profils' };
    expect(formatPostgrestError(err)).toBe('FK violation on table profils');
  });

  it('falls back to String() for primitive numbers', () => {
    expect(formatPostgrestError(42)).toBe('42');
  });
});

// ────────────────────────────────────────────────────────────────
// mapSupabaseErrorToFrench
// ────────────────────────────────────────────────────────────────
describe('mapSupabaseErrorToFrench', () => {
  it('handles empty string → generic fallback', () => {
    expect(mapSupabaseErrorToFrench('')).toContain('Une erreur');
  });

  it('detects RPC missing via code 42883', () => {
    const msg = 'ERROR: 42883: function creer_flotte_esamba does not exist';
    expect(mapSupabaseErrorToFrench(msg)).toContain('migrations');
  });

  it('detects RPC missing via "could not find the function"', () => {
    expect(mapSupabaseErrorToFrench('could not find the function')).toContain('migrations');
  });

  it('detects RLS policy violation', () => {
    expect(mapSupabaseErrorToFrench('new row violates row-level security policy')).toContain('droits');
  });

  it('detects unique constraint (23505)', () => {
    expect(mapSupabaseErrorToFrench('duplicate key value violates unique constraint')).toContain('doublon');
  });

  it('detects FK constraint (23503)', () => {
    expect(mapSupabaseErrorToFrench('violates foreign key constraint')).toContain('invalide');
  });

  it('detects not-null constraint (23502)', () => {
    expect(mapSupabaseErrorToFrench('null value in column violates not-null constraint')).toContain('obligatoire');
  });

  it('detects network error', () => {
    expect(mapSupabaseErrorToFrench('failed to fetch')).toContain('connexion');
  });

  it('detects session / JWT expiry', () => {
    expect(mapSupabaseErrorToFrench('invalid JWT token')).toContain('Session');
  });

  it('returns generic fallback for unknown message', () => {
    expect(mapSupabaseErrorToFrench('random unknown error xyz')).toContain('Une erreur');
  });

  it('passes through already-French messages containing "introuvable"', () => {
    expect(mapSupabaseErrorToFrench('Véhicule introuvable dans cette flotte')).toBe('Véhicule introuvable dans cette flotte');
  });

  it('passes through already-French messages containing "Impossible"', () => {
    expect(mapSupabaseErrorToFrench('Impossible de créer la flotte.')).toBe('Impossible de créer la flotte.');
  });
});
