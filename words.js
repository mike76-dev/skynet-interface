var skynet = require('./skynet');

// this is where the list of 2048 English words is stored
// someone has to pin this file
const wordsFile = 'GAAkCKHUdy8SVidL3RF9TsyfdfFp3ouvZrg04k55oPnrfQ';

// generate a passphrase from a numeric array
export async function getWords(numbers) {
	let text = await skynet.downloadText(wordsFile);
	if (text) {
		let lines = text.text.split('\n');
		let result = numbers.map((i) => {return lines[i]}).join(' ');
		return result;
	} else {
		return null;
	}
}

// generate a numeric array from a passphrase
export async function getNumbers(phrase) {
	let text = await skynet.downloadText(wordsFile);
	if (text) {
		let lines = text.text.split('\n');
		let words = phrase.split(' ');
		let result = new Array(words.length);
		let b = true;
		let n;
		words.forEach((w, i) => {
			n = lines.indexOf(words[i]);
			if (n < 0) b = false;
			result[i] = n;
		});
		if (b) {
			return result;
		} else {
			return null;
		}
	} else {
		return null;
	}
}
