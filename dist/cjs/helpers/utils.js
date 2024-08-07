"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
const neon_core_1 = require("@cityofzion/neon-core");
const neon_js_1 = require("@cityofzion/neon-js");
class Utils {
    static async transactionCompletion(txid, opts) {
        let options = {
            period: 500,
            timeout: 2500,
            node: 'http://127.0.0.1:50012',
        };
        options = { ...options, ...opts };
        const client = new neon_core_1.rpc.RPCClient(options.node);
        for (let i = 0; i < Math.floor(options.timeout / options.period); i++) {
            try {
                return await client.getApplicationLog(txid);
            }
            catch (e) { }
            await this.sleep(options.period);
        }
        throw new Error('Unable to locate the requested transaction.');
    }
    static async deployContract(node, networkMagic, nefRaw, manifestRaw, signer) {
        const config = {
            networkMagic,
            rpcAddress: node,
            account: signer,
        };
        const nef = neon_core_1.sc.NEF.fromBuffer(nefRaw);
        const manifest = neon_core_1.sc.ContractManifest.fromJson(manifestRaw);
        const assembledScript = new neon_core_1.sc.ScriptBuilder()
            .emit(neon_core_1.sc.OpCode.ABORT)
            .emitPush(neon_core_1.u.HexString.fromHex(signer.scriptHash))
            .emitPush(nef.checksum)
            .emitPush(manifest.name)
            .build();
        const scriptHash = neon_core_1.u.reverseHex(neon_core_1.u.hash160(assembledScript));
        console.log(`deploying ${manifest.name} to 0x${scriptHash} ...`);
        return neon_js_1.experimental.deployContract(nef, manifest, config);
    }
    static decodeNDEF(d) {
        if (d.indexOf('https://') === 0) {
            if (d.indexOf('?d=') !== -1) {
                d = d.split('?d=')[1];
            }
            else if (d.indexOf('?p=') !== -1) {
                d = d.split('?p=')[1];
            }
        }
        d = d.split('.').join('+');
        d = d.split('_').join('/');
        d = d.split('-').join('=');
        const payload = Buffer.from(d, 'base64');
        // support for both v1 and v2 ndef formats
        const pubKeyLength = 65;
        const messageLength = payload.length > 150 ? 32 : 5;
        const pubKeyUnencoded = payload.slice(0, pubKeyLength).toString('hex') || '';
        const pubKey = neon_core_1.wallet.getPublicKeyEncoded(pubKeyUnencoded);
        const msg = payload.slice(pubKeyLength, pubKeyLength + messageLength).toString('hex') || '';
        const sigRaw = payload.slice(pubKeyLength + messageLength);
        const sig = neon_core_1.u.ab2hexstring(Utils.processDERSignature(sigRaw)) || '';
        let validSignature;
        try {
            validSignature = neon_core_1.wallet.verify(msg, sig, pubKey);
        }
        catch (e) {
            validSignature = false;
        }
        const uriPubKey = this.encodePublicKey(pubKeyUnencoded);
        return {
            validSignature,
            uriPubKey,
            pubKeyUnencoded,
            pubKey,
            msg,
            sig,
        };
    }
    static encodePublicKey(pubKey) {
        return Buffer.from(pubKey, 'hex').toString('base64').split('=').join('-').split('/').join('_').split('+').join('.');
    }
    static processDERSignature(sigBytes) {
        // Drop the first three bytes. They are always `30 46 02`
        const header = {
            structure: sigBytes[0],
            length: sigBytes[1]
        };
        const bodyRaw = sigBytes.slice(2);
        let rPointer = 0;
        let body = {
            rHeader: 0,
            rLength: 0,
            r: new Uint8Array(),
            sHeader: 0,
            sLength: 0,
            s: new Uint8Array(),
        };
        body.rHeader = bodyRaw[rPointer];
        rPointer += 1;
        body.rLength = bodyRaw[rPointer];
        rPointer += 1;
        // account for "high r"
        const rRaw = bodyRaw.slice(rPointer, rPointer + body.rLength);
        body.r = (rRaw[0] === 0x00 && rRaw[1] > 0x7F) ? rRaw.slice(1) : rRaw;
        rPointer += body.rLength;
        body.sHeader = bodyRaw[rPointer];
        rPointer += 1;
        body.sLength = bodyRaw[rPointer];
        rPointer += 1;
        const sRaw = bodyRaw.slice(rPointer, rPointer + body.sLength);
        body.s = (sRaw[0] === 0x00 && sRaw[1] > 0x7F) ? sRaw.slice(1) : sRaw;
        const concat = new Uint8Array(body.r.length + body.s.length);
        concat.set(body.r);
        concat.set(body.s, body.r.length);
        return concat;
    }
    static isPublicKey(key, encoded) {
        try {
            let encodedKey;
            switch (key.substr(0, 2)) {
                case "04":
                    if (encoded === true) {
                        return false;
                    }
                    // Encode key
                    encodedKey = neon_core_1.wallet.getPublicKeyEncoded(key);
                    break;
                case "02":
                case "03":
                    if (encoded === false) {
                        return false;
                    }
                    encodedKey = key;
                    break;
                default:
                    return false;
            }
            const unencoded = neon_core_1.wallet.getPublicKeyUnencoded(encodedKey);
            const tail = parseInt(unencoded.substr(unencoded.length - 2, 2), 16);
            if (encodedKey.substr(0, 2) === "02" && tail % 2 === 0) {
                return true;
            }
            if (encodedKey.substr(0, 2) === "03" && tail % 2 === 1) {
                return true;
            }
            return false;
        }
        catch (e) {
            return false;
        }
    }
    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.Utils = Utils;
//# sourceMappingURL=utils.js.map