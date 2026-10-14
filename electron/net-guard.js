/**
 * Network address guard for the Electron main process.
 *
 * Decides whether a hostname or resolved IP points at private, loopback,
 * link-local or otherwise non-public address space. Used by the proxy IPC
 * handlers so a renderer (or a redirect) cannot reach the local network.
 *
 * Invariants:
 *  - Input is whatever `new URL(...).hostname` returns, so IPv6 literals arrive
 *    WITH brackets and may be hex-normalised (`[::ffff:7f00:1]`). Brackets and
 *    trailing dots are stripped before any check.
 *  - IPv6 forms that embed an IPv4 address (mapped, NAT64, 6to4, compatible)
 *    are decoded and judged as that IPv4 address.
 *  - Unknown or unparsable IP-looking input is treated as private (fail closed).
 */
const net = require('net');

const PRIVATE_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.localdomain', '.home.arpa', '.intranet', '.corp'];

function normaliseHost(hostname) {
    let host = String(hostname || '').trim().toLowerCase();
    if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
    const zone = host.indexOf('%');
    if (zone >= 0) host = host.slice(0, zone);
    return host.replace(/\.+$/, '');
}

function isPrivateIPv4(a, b, c) {
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24, TEST-NET-1
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
    return a >= 224; // multicast and reserved
}

/** Parse an IPv6 string into eight 16-bit groups, or null when invalid. */
function parseIPv6(text) {
    let s = text;
    const dotted = s.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (dotted) {
        const o = dotted.slice(1).map(Number);
        if (o.some((n) => n > 255)) return null;
        const tail = ((o[0] << 8) | o[1]).toString(16) + ':' + ((o[2] << 8) | o[3]).toString(16);
        s = s.slice(0, dotted.index) + tail;
    }
    const halves = s.split('::');
    if (halves.length > 2) return null;
    const head = halves[0] ? halves[0].split(':') : [];
    const tailParts = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    const fill = 8 - head.length - tailParts.length;
    if (halves.length === 1 ? head.length !== 8 : fill < 1) return null;
    const parts = halves.length === 1 ? head : [...head, ...Array(fill).fill('0'), ...tailParts];
    const groups = parts.map((p) => (/^[0-9a-f]{1,4}$/.test(p) ? parseInt(p, 16) : NaN));
    return groups.some(Number.isNaN) ? null : groups;
}

function v4FromGroups(hi, lo) {
    return isPrivateIPv4(hi >> 8, hi & 255, lo >> 8);
}

function isPrivateIPv6(address) {
    const g = parseIPv6(address);
    if (!g) return true;
    const leadingZeros = g.slice(0, 5).every((x) => x === 0);
    if (g.every((x) => x === 0)) return true; // ::
    if (leadingZeros && g[5] === 0xffff) return v4FromGroups(g[6], g[7]); // ::ffff:a.b.c.d
    if (leadingZeros && g[5] === 0) return true; // ::1 and deprecated IPv4-compatible
    if (g[0] === 0x64 && g[1] === 0xff9b) { // NAT64
        if (g.slice(2, 6).every((x) => x === 0)) return v4FromGroups(g[6], g[7]);
        return true; // 64:ff9b:1::/48 is local-use
    }
    if (g[0] === 0x2002) return v4FromGroups(g[1], g[2]); // 6to4
    if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo
    if (g[0] === 0x2001 && g[1] === 0xdb8) return true; // documentation
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local
    return (g[0] & 0xff00) === 0xff00; // multicast
}

/** True when an IP address (as returned by DNS or a URL host) is non-public. */
function isPrivateAddress(address) {
    const host = normaliseHost(address);
    const version = net.isIP(host);
    if (version === 4) {
        const [a, b, c] = host.split('.').map(Number);
        return isPrivateIPv4(a, b, c);
    }
    if (version === 6) return isPrivateIPv6(host);
    return true; // not an IP: callers must only pass IPs here
}

/** True when a hostname is, or by name must be treated as, non-public. */
function isPrivateHost(hostname) {
    const host = normaliseHost(hostname);
    if (!host) return true;
    if (net.isIP(host)) return isPrivateAddress(host);
    if (host === 'localhost' || !host.includes('.')) return true; // single-label names resolve locally
    return PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

module.exports = { normaliseHost, isPrivateAddress, isPrivateHost };
