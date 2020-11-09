var crypto = require('./crypto');
var buffer = require('buffer');
var nf = require('node-forge');

// default Skynet portal
var defaultPortal = 'https://siasky.net';

export function setDefaultPortal(portal) {
	defaultPortal = portal;
}

// core function for interacting with Skynet
function executeRequest(method, link, data, options = {}) {
	return new Promise(function (resolve, reject) {
		let req = new XMLHttpRequest();
		req.open(method, defaultPortal + '/' + link);
		if (options && options.timeout) {
			req.timeout = options.timeout;
		} else {
			req.timeout = 5000;
		}
		if (options && options.onUploadProgress) {
			req.upload.onprogress = options.onUploadProgress;
		}
		req.onload = function () {
			if (this.status >= 200 && this.status < 300) {
				resolve(this);
			} else {
				reject(this);
			}
		}
		req.ontimeout = function () {
			resolve(this);
		}
		req.send(data);
	});
}

// these functions are meant to save text from html <textarea> elements
// to Skynet and retrieve it back
// can be easily implemented to support other file types as well
export async function uploadText(text, filename, options) {
	let file = new File([text], {type: 'text/plain'});
	let fd = new FormData();
	fd.append('file', file, filename);
	let req = await executeRequest('POST', 'skynet/skyfile', fd, options);
	if (req.status == 200) {
			return JSON.parse(req.responseText).skylink;
	} else {
		return '';
	}
}

export async function downloadText(skylink, options) {
	let req = await executeRequest('GET', skylink, null, options);
	if (req.status == 200) {
		const name = JSON.parse(req.getResponseHeader('skynet-file-metadata')).filename;
		return {name: name, text: req.responseText};
	} else {
		return null;
	}
}

// interaction with Skynet registry
export async function getEntry(publicKey, datakey) {
	let req = await executeRequest('GET', 'skynet/registry?publickey=ed25519:' +
		buffer.Buffer.from(publicKey).toString('hex') + '&datakey=' +
		buffer.Buffer.from(crypto.HashDataKey(datakey)).toString('hex'), null);
	if (req.status == 200) {
		const response = JSON.parse(req.responseText);
		const entry = {
			entry: {
				datakey,
				data: buffer.Buffer.from(crypto.hexToUint8Array(response.data)).toString(),
				revision: parseInt(response.revision, 10),
			},
			signature: buffer.Buffer.from(crypto.hexToUint8Array(response.signature)),
		};
		if (entry && !nf.pki.ed25519.verify({
			message: crypto.HashRegistryEntry(entry.entry),
			signature: entry.signature,
			publicKey,
		})) {
			throw new Error('Could not verify signature from retrieved, signed registry entry -- possibly corrupted entry');
		};
		return entry;
	} else {
		return null;
	}
}

export async function setEntry(privateKey, datakey, entry) {
	const publicKey = nf.pki.ed25519.publicKeyFromPrivateKey({ privateKey });
	let oldEntry;
	oldEntry = await getEntry(publicKey, datakey);
	entry.revision = 0;
	if (oldEntry) {
		entry.revision = oldEntry.entry.revision + 1;
	};
	const signature = nf.pki.ed25519.sign({
		message: crypto.HashRegistryEntry(entry),
		privateKey,
	});
	const data = {
		publickey: {
			algorithm: 'ed25519',
			key: Array.from(publicKey),
		},
		datakey: buffer.Buffer.from(crypto.HashDataKey(datakey)).toString('hex'),
		revision: entry.revision,
		data: Array.from(buffer.Buffer.from(entry.data)),
		signature: Array.from(signature),
	};
	let req = await executeRequest('POST', 'skynet/registry', JSON.stringify(data));
	if (req.status == 204) {
		return null;
	} else {
		throw new Error('Could not post registry entry: ' + req.responseText);
	}
}
