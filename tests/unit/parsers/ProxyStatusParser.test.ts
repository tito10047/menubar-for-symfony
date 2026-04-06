import { ProxyStatusParser } from '../../../src/core/parsers/ProxyStatusParser';

describe('ProxyStatusParser', () => {
    let parser: ProxyStatusParser;

    beforeEach(() => {
        parser = new ProxyStatusParser();
    });

    it('should detect running proxy with domain entries', () => {
        const output = `
Listening on https://127.0.0.1:7080
+--------------+--------------------------+
| Domain       | Directory                |
+--------------+--------------------------+
| myapp.wip    | /home/user/myapp         |
| other.wip    | /home/user/other         |
+--------------+--------------------------+
`;
        const result = parser.parse(output);

        expect(result.isRunning).toBe(true);
        expect(result.proxies).toHaveLength(2);
        expect(result.proxies[0]).toEqual({ domain: 'myapp.wip', directory: '/home/user/myapp' });
        expect(result.proxies[1]).toEqual({ domain: 'other.wip', directory: '/home/user/other' });
    });

    it('should return not running when output contains "not running"', () => {
        const output = `
Proxy server is not running.
`;
        const result = parser.parse(output);

        expect(result.isRunning).toBe(false);
        expect(result.proxies).toHaveLength(0);
    });

    it('should return not running on empty output', () => {
        expect(parser.parse('')).toEqual({ isRunning: false, proxies: [] });
    });

    it('should deduplicate domains', () => {
        const output = `
Listening on https://127.0.0.1:7080
| myapp.wip | /home/user/myapp |
| myapp.wip | /home/user/myapp |
`;
        const result = parser.parse(output);
        expect(result.proxies).toHaveLength(1);
    });
});
