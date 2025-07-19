"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Challenges = exports.NeoN3EllipticCurves = exports.NeoN3NetworkOptions = void 0;
var NeoN3NetworkOptions;
(function (NeoN3NetworkOptions) {
    NeoN3NetworkOptions["LocalNet"] = "http://127.0.0.1:50012";
    NeoN3NetworkOptions["TestNet"] = "https://testnet1.neo.coz.io:443";
    NeoN3NetworkOptions["MainNet"] = "https://mainnet1.neo.coz.io:443";
})(NeoN3NetworkOptions = exports.NeoN3NetworkOptions || (exports.NeoN3NetworkOptions = {}));
var NeoN3EllipticCurves;
(function (NeoN3EllipticCurves) {
    NeoN3EllipticCurves[NeoN3EllipticCurves["SECP256K1SHA256"] = 22] = "SECP256K1SHA256";
    NeoN3EllipticCurves[NeoN3EllipticCurves["SECP256R1SHA256"] = 23] = "SECP256R1SHA256";
    NeoN3EllipticCurves[NeoN3EllipticCurves["SECP256K1KECCAK256"] = 122] = "SECP256K1KECCAK256";
    NeoN3EllipticCurves[NeoN3EllipticCurves["SECP256R1KECCAK256"] = 123] = "SECP256R1KECCAK256";
})(NeoN3EllipticCurves = exports.NeoN3EllipticCurves || (exports.NeoN3EllipticCurves = {}));
var Challenges;
(function (Challenges) {
})(Challenges = exports.Challenges || (exports.Challenges = {}));
//# sourceMappingURL=config.js.map