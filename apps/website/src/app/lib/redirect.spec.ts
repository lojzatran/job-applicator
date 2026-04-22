import { getSafeNextPath } from './redirect';

describe('getSafeNextPath', () => {
  it('returns the normalized path for a safe value', () => {
    expect(getSafeNextPath(' /jobs ')).toBe('/jobs');
    expect(getSafeNextPath([' /jobs ', '/ignored'])).toBe('/jobs');
  });

  it('returns root for unsafe paths', () => {
    expect(getSafeNextPath(undefined)).toBe('/');
    expect(getSafeNextPath('jobs')).toBe('/');
    expect(getSafeNextPath('/\\evil.com')).toBe('/');
    expect(getSafeNextPath('//evil.com')).toBe('/');
    expect(getSafeNextPath(['//evil.com'])).toBe('/');
    expect(getSafeNextPath('/jobs\\evil')).toBe('/');
    expect(getSafeNextPath('/jobs\nadmin')).toBe('/');
    expect(getSafeNextPath('/path\twithtab')).toBe('/');
    expect(getSafeNextPath('')).toBe('/');
  });
});
