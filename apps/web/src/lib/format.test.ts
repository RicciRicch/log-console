import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatTime } from './format';

describe('formati iz PRODUCT.md', () => {
  it('datum: 08.11.2026.', () => {
    expect(formatDate('2026-11-08T10:00:00Z')).toBe('08.11.2026.');
  });

  it('datum i vreme se računaju po beogradskom vremenu', () => {
    // 23:30 UTC je već sledeći dan u Beogradu (UTC+1 zimi)
    expect(formatDate('2026-11-08T23:30:00Z')).toBe('09.11.2026.');
    expect(formatTime('2026-11-08T13:35:00Z')).toBe('14:35');
  });

  it('novac: 1.250,00 RSD', () => {
    expect(formatMoney(1250)).toBe('1.250,00 RSD');
    expect(formatMoney(441374)).toBe('441.374,00 RSD');
  });
});
