"""UID-pinned PC/SC bridge for the opt-in migration qualification.

No GlobalPlatform commands, pairing changes, or plaintext wallet commands.
EOF disconnects/powers down. APDU payloads are never written to logs.
"""
import argparse
import json
import re
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--uid', required=True)
    parser.add_argument('--reader', default='Identiv uTrust 3700 F CL Reader')
    parser.add_argument('--password-qualification', action='store_true',
                        help='Explicitly allow initial pairing and PAKE on this diagnostic UID')
    args = parser.parse_args()
    if not re.fullmatch(r'(?:[0-9A-Fa-f]{2}){4,10}', args.uid):
        raise ValueError('Expected an explicit hexadecimal physical card UID')
    from smartcard.System import readers

    matches = [reader for reader in readers() if str(reader) == args.reader]
    if len(matches) != 1:
        raise RuntimeError('Expected exactly one named reader')
    connection = matches[0].createConnection()
    connection.connect()
    try:
        uid, sw1, sw2 = connection.transmit([0xFF, 0xCA, 0, 0, 0])
        if (sw1, sw2) != (0x90, 0) or bytes(uid).hex().upper() != args.uid.upper():
            raise RuntimeError('Wrong physical card UID; no application command sent')
        print(json.dumps({'ready': True, 'uid': args.uid.upper()}), flush=True)
        allowed_aids = {bytes.fromhex(a) for a in (
            'FF6974656D73797303000000', 'FF6974656D73797304000201',
            'A000000151000000')}
        for line in sys.stdin:
            command = bytes.fromhex(json.loads(line)['command'])
            if len(command) < 5 or len(command) not in (5 + command[4], 6 + command[4]):
                raise ValueError('Invalid short APDU')
            if command[:4] == bytes.fromhex('00A40400'):
                if command[5:5 + command[4]] not in allowed_aids:
                    raise ValueError('SELECT target not allowed')
            elif command[0] != 0xA0 or command[1] not in (
                    (0x11, 0x20, 0x21, 0x25, 0x30) if args.password_qualification else (0x20, 0x21, 0x30)):
                raise ValueError('Only application tunnel commands are allowed')
            if command[1] == 0x11 and (command[2:5] != bytes([0, 0, 32]) or len(command) != 37):
                raise ValueError('Only initial 32-byte pairing is allowed')
            data, sw1, sw2 = connection.transmit(list(command))
            print(json.dumps({'response': bytes(data + [sw1, sw2]).hex()}), flush=True)
    finally:
        connection.disconnect()


if __name__ == '__main__':
    main()
