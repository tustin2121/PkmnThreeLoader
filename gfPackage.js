// gfPackage.js
// https://github.com/gdkchan/SPICA/blob/master/SPICA.WinForms/Formats/GFPackage.cs

function parseHeader(data) {
	if (data.limit < 0x80) return null;
	let magic0 = data.readUint8();
	let magic1 = data.readUint8();
	if (magic0 < 'A'.charCodeAt(0) || magic0 > 'Z'.charCodeAt(0)) return null;
	if (magic1 < 'A'.charCodeAt(0) || magic1 > 'Z'.charCodeAt(0)) return null;
	let header = {
		magic : String.fromCharCode(magic0) + String.fromCharCode(magic1),
		entries : [],
	};
	
	let numEntries = data.readUint16();
	let pos = data.offset;
	for (let i = 0; i < numEntries; i++) {
		data.offset = pos + i * 4;
		let startAddr = data.readUint32();
		let endAddr = data.readUint32();
		header.entries.push({
			address: (pos-4) + startAddr,
			length: endAddr - startAddr,
		});
	}
	return header;
}

function isValid(data) {
	let pos = data.offset;
	try {
		if (data.limit < 0x80) return false;
		let magic0 = data.readUint8();
		let magic1 = data.readUint8();
		if (magic0 < 'A'.charCodeAt(0) || magic0 > 'Z'.charCodeAt(0)) return false;
		if (magic1 < 'A'.charCodeAt(0) || magic1 > 'Z'.charCodeAt(0)) return false;
		return true;
	}
	finally {
		data.offset = pos;
	}
}

module.exports = { parseHeader, isValid };