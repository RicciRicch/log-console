import { describe, expect, it } from 'vitest';
import { safeNextPath } from './paths';

describe('safeNextPath', () => {
  it('pušta putanje unutar aplikacije', () => {
    expect(safeNextPath('/korisnici')).toBe('/korisnici');
    expect(safeNextPath('/posiljke?status=delivered')).toBe('/posiljke?status=delivered');
  });

  it('odbija spoljne adrese', () => {
    expect(safeNextPath('https://zli-sajt.test')).toBe('/');
    expect(safeNextPath('//zli-sajt.test')).toBe('/');
    expect(safeNextPath('/\\zli-sajt.test')).toBe('/');
  });

  it('vraća podrazumevanu putanju za praznu vrednost', () => {
    expect(safeNextPath(undefined)).toBe('/');
    expect(safeNextPath(null, '/izbor-firme')).toBe('/izbor-firme');
  });
});
