'use strict'


const buffer = require('buffer');
const crc = require('crc');

function normalizeUUID(uuid) {
  // Noble stores UUIDs as lower case strings with no dashes
  // Note: the replace call isn't working...don't use dashes
  return uuid.replace('-', '').toLowerCase();
}

// ASCII only
function stringToBytes(string) {
  var array = new Uint8Array(string.length);
  for (var i = 0, l = string.length; i < l; i++) {
    array[i] = string.charCodeAt(i);
  }
  return array.buffer;
}

// ASCII only
function bytesToString(buffer) {
  return String.fromCharCode.apply(null, new Uint8Array(buffer));
}


function concatBuffers(buffers) {
  let length = 0
  for (let b of buffers)
    length += b.length
  let buf = buffer.Buffer.concat(buffers, length)
  return buf
}


function crc16(buf) {
  return crc.crc16ccitt(buf)
}


module.exports = {
  normalizeUUID: normalizeUUID,
  concatBuffers: concatBuffers,
  crc16: crc16,
  stringToBytes: stringToBytes,
  bytesToString: bytesToString
}
