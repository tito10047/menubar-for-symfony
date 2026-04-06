import { ServerListParser } from '../../../src/core/parsers/ServerListParser';

describe('ServerListParser', () => {
    let parser: ServerListParser;

    beforeEach(() => {
        parser = new ServerListParser();
    });

    it('should parse running and stopped servers from table output', () => {
        const output = `
+----------------------------+-------------+---------+
| Directory                  | Port        | Domains |
+----------------------------+-------------+---------+
| /home/user/project1        | 8000        |         |
| /home/user/project2        | Not running |         |
+----------------------------+-------------+---------+
`;
        const result = parser.parse(output);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            directory: '/home/user/project1',
            port: 8000,
            url: 'https://127.0.0.1:8000',
            isRunning: true,
        });
        expect(result[1]).toEqual({
            directory: '/home/user/project2',
            port: 8000,
            url: '',
            isRunning: false,
        });
    });

    it('should build URL from domain when present', () => {
        const output = `
+----------------------------+------+------------------+
| Directory                  | Port | Domains          |
+----------------------------+------+------------------+
| /home/user/myapp           | 8001 | myapp.wip        |
+----------------------------+------+------------------+
`;
        const result = parser.parse(output);

        expect(result).toHaveLength(1);
        expect(result[0].url).toBe('https://myapp.wip');
        expect(result[0].domain).toBe('myapp.wip');
    });

    it('should return empty array on empty output', () => {
        expect(parser.parse('')).toEqual([]);
        expect(parser.parse('   ')).toEqual([]);
    });

    it('should skip header, separator, and invalid lines', () => {
        const output = `
+------------------+------+
| Directory        | Port |
+------------------+------+
`;
        expect(parser.parse(output)).toEqual([]);
    });
});
