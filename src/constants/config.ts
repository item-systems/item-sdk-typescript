export enum NeoN3NetworkOptions {
  LocalNet = 'http://127.0.0.1:50012',
  TestNet = 'https://testnet1.neo.coz.io:443',
  MainNet = 'https://mainnet1.neo.coz.io:443',
}

export enum NeoN3EllipticCurves {
  SECP256K1SHA256 = 22,
  SECP256R1SHA256 = 23,
  SECP256K1KECCAK256 = 122,
  SECP256R1KECCAK256 = 123,
}

export enum Challenges {
  ILS_PERMISSIVE = '01',
  ILS_RESTRICTIVE = '02',
  HTLS_PERMISSIVE = '03',
  HTLS_RESTRICTIVE = '04',
}
