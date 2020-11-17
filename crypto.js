var blake = require('blakejs');
var buffer = require('buffer');
var nf = require('node-forge');
var words = require('./words');
var aes = require('aes-js');
var base64 = require('js-base64');

// functions for interaction with SKynet registry
function NewHash() {
	return blake.blake2bInit(32, null);
}

export function HashAll(...args) {
	const h = NewHash();
	for (let i = 0; i < args.length; i++) {
		blake.blake2bUpdate(h, args[i]);
	}
	return blake.blake2bFinal(h);
}

export function HashDataKey(datakey) {
	return HashAll(encodeString(datakey));
}

export function HashRegistryEntry(registryEntry) {
	return HashAll(
		HashDataKey(registryEntry.datakey),
		encodeString(registryEntry.data),
		encodeNumber(registryEntry.revision)
	);
}

function encodeNumber(num) {
	const encoded = new Uint8Array(8);
	for (let index = 0; index < encoded.length; index++) {
		const byte = num & 0xFF;
		encoded[index] = byte;
		num = num >> 8;
	}
	return encoded;
}

export function encodeString(str) {
	const encoded = new Uint8Array(8 + str.length);
	encoded.set(encodeNumber(str.length));
	encoded.set(stringToUint8Array(str), 8);
	return encoded;
}

export function stringToUint8Array(str) {
	return Uint8Array.from(buffer.Buffer.from(str));
}

export function hexToUint8Array(str) {
	return new Uint8Array(str.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

// generate a public/private key pair
export function keyPairFromSeed(seed) {
	seed = nf.pkcs5.pbkdf2(seed, '', 1000, 32, nf.md.sha256.create());
	return nf.pki.ed25519.generateKeyPair({ seed });
}

// conversion of a 8-bit array to 11-bit and back
// currently limited to 32 bytes but this can be increased
function from32To24(arr32) {
	const arr24 = new Array(24);
	let bits = 8;
	let bits32 = 8;
	let bits24 = 11;
	let sh = 0;
	let maskLow = 0;
	let maskHigh = 7;
	let mask;
	let curr24 = 0;
	let curr32 = 0;
	let byte;
	while (curr32 < 32) {
		mask = (1 << (maskHigh + 1)) - (1 << maskLow);
		byte = arr32[curr32] & mask;
		if (sh >= maskLow) {
			arr24[curr24] |= byte << (sh - maskLow);
		} else {
			arr24[curr24] |= byte >> (maskLow - sh);
		};
		bits32 = bits32 - bits;
		if (bits32 == 0) {
			bits32 = 8;
			curr32++;
		};
		bits24 = bits24 - bits;
		if (bits24 == 0) {
			bits24 = 11;
			curr24++;
		};
		sh = (sh + bits) % 11;
		bits = Math.min(bits24, bits32);
		maskLow = (maskHigh + 1) % 8;
		maskHigh = maskLow + bits - 1;
	};
	return arr24;
}

function from24To32(arr24) {
	const arr32 = new Uint8Array(32);
	let bits = 8;
	let bits32 = 8;
	let bits24 = 11;
	let maskLow = 0;
	let maskHigh = 7;
	let mask;
	let curr24 = 0;
	let curr32 = 0;
	let byte;
	while (curr32 < 32) {
		mask = (1 << (maskHigh + 1)) - (1 << maskLow);
		byte = (arr24[curr24] & mask) >> maskLow;
		arr32[curr32] |= byte << (8 - bits32);
		bits32 = bits32 - bits;
		if (bits32 == 0) {
			bits32 = 8;
			curr32++;
		};
		bits24 = bits24 - bits;
		if (bits24 == 0) {
			bits24 = 11;
			curr24++;
		};
		bits = Math.min(bits24, bits32);
		maskLow = (maskHigh + 1) % 11;
		maskHigh = maskLow + bits - 1;
	};
	return arr32;
}

// generate 24-word seed from username/password
export async function generateSeed(login, password, appId) {
	const aesKey = HashDataKey(appId);
	const aesIV = new Uint8Array(16);
	aesIV.set(stringToUint8Array(appId).slice(0, 16));
	const input = new Uint8Array(32);
	input.set(aes.utils.utf8.toBytes(login));
	input.set(aes.utils.utf8.toBytes(password), 32 - password.length);
	const aesCbc = new aes.ModeOfOperation.cbc(aesKey, aesIV);
	const enc = aesCbc.encrypt(input);
	const num = from32To24(enc);
	return await words.getWords(num);
}

// recover username/password from the seed
export async function recoverPassword(seed, appId) {
	const aesKey = HashDataKey(appId);
	const aesIV = new Uint8Array(16);
	aesIV.set(stringToUint8Array(appId).slice(0, 16));
	const num = await words.getNumbers(seed);
	const enc = from24To32(num);
	const aesCbc = new aes.ModeOfOperation.cbc(aesKey, aesIV);
	const output = aesCbc.decrypt(enc);
	const str = aes.utils.utf8.fromBytes(output);
	const user = str.slice(0, str.indexOf(String.fromCharCode(0)));
	const pwd = str.slice(str.lastIndexOf(String.fromCharCode(0)) + 1);
	return { login: user, password: pwd };
}
