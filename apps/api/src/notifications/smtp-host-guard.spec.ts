import {
  allowedSmtpHosts,
  checkSmtpHost,
  isPublicAddress,
} from './smtp-host-guard';

describe('smtp-host-guard', () => {
  it.each([
    '10.1.2.3',
    '172.20.0.1',
    '192.168.1.1',
    '127.0.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fe80::1',
    'fd00::1',
    '::ffff:10.0.0.1',
    'not-an-ip',
  ])('%s is not public', (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each(['93.184.216.34', '8.8.8.8', '2606:4700::1111', '::ffff:8.8.8.8'])(
    '%s is public',
    (ip) => {
      expect(isPublicAddress(ip)).toBe(true);
    },
  );

  it('refuses a name when any resolved address is private', async () => {
    const lookup = jest.fn(async () => [
      { address: '93.184.216.34' },
      { address: '10.0.0.1' },
    ]);
    expect(await checkSmtpHost('smtp.example.com', new Set(), lookup)).toEqual({
      ok: false,
      reason: 'PRIVATE_ADDRESS',
    });
  });

  it('connects to the checked address, not the name', async () => {
    const lookup = jest.fn(async () => [{ address: '93.184.216.34' }]);
    expect(await checkSmtpHost('smtp.example.com', new Set(), lookup)).toEqual({
      ok: true,
      connectTo: '93.184.216.34',
    });
  });

  it('skips DNS for exempt hosts and literal IPs', async () => {
    const lookup = jest.fn();
    expect(
      await checkSmtpHost('Mailpit', allowedSmtpHosts(' mailpit ,x'), lookup),
    ).toEqual({ ok: true, connectTo: 'Mailpit' });
    expect(await checkSmtpHost('10.0.0.1', new Set(), lookup)).toEqual({
      ok: false,
      reason: 'PRIVATE_ADDRESS',
    });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('reports unresolvable names', async () => {
    const lookup = jest.fn(async () => {
      throw new Error('ENOTFOUND');
    });
    expect(await checkSmtpHost('x.invalid', new Set(), lookup)).toEqual({
      ok: false,
      reason: 'UNRESOLVABLE',
    });
  });
});
