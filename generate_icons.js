// Pure Node.js PNG generator using zlib to create valid PNG icons with an English Vocab book design
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(size) {
    const width = size;
    const height = size;

    // RGBA buffer with filter byte per scanline
    const stride = width * 4 + 1;
    const rawBuffer = Buffer.alloc(height * stride);

    // Draw an attractive icon:
    // Rounded box background with gradient / vibrant Indigo/Violet color (#4F46E5 -> #7C3AED)
    const radius = Math.floor(size * 0.22);
    const cx = size / 2;
    const cy = size / 2;

    for (let y = 0; y < height; y++) {
        const rowOffset = y * stride;
        rawBuffer[rowOffset] = 0; // Filter byte: None

        for (let x = 0; x < width; x++) {
            const pxOffset = rowOffset + 1 + x * 4;

            // Check rounded rect boundary
            const dx = Math.abs(x - cx + 0.5) - (cx - radius);
            const dy = Math.abs(y - cy + 0.5) - (cy - radius);
            const isInside = (dx <= 0 && dy <= 0) ||
                             (dx > 0 && dy <= 0 && dx <= radius) ||
                             (dx <= 0 && dy > 0 && dy <= radius) ||
                             (dx > 0 && dy > 0 && (dx * dx + dy * dy <= radius * radius));

            if (isInside) {
                // Background Gradient: #4f46e5 (79, 70, 229) to #9333ea (147, 51, 234)
                const t = (x + y) / (width + height);
                let r = Math.round(79 + t * (147 - 79));
                let g = Math.round(70 + t * (51 - 70));
                let b = Math.round(229 + t * (234 - 229));
                let a = 255;

                // Character "E" in center
                const nx = x / width;
                const ny = y / height;

                const inE = (nx >= 0.28 && nx <= 0.40 && ny >= 0.25 && ny <= 0.75) || // spine
                            (nx >= 0.28 && nx <= 0.72 && ny >= 0.25 && ny <= 0.37) || // top bar
                            (nx >= 0.28 && nx <= 0.64 && ny >= 0.44 && ny <= 0.56) || // mid bar
                            (nx >= 0.28 && nx <= 0.72 && ny >= 0.63 && ny <= 0.75);   // bot bar

                const inDot = (nx >= 0.62 && nx <= 0.74 && ny >= 0.44 && ny <= 0.56);

                if (inE) {
                    r = 255; g = 255; b = 255; a = 255;
                } else if (inDot) {
                    r = 56; g = 189; b = 248; a = 255; // Sky blue dot
                }

                rawBuffer[pxOffset] = r;
                rawBuffer[pxOffset + 1] = g;
                rawBuffer[pxOffset + 2] = b;
                rawBuffer[pxOffset + 3] = a;
            } else {
                // Transparent
                rawBuffer[pxOffset] = 0;
                rawBuffer[pxOffset + 1] = 0;
                rawBuffer[pxOffset + 2] = 0;
                rawBuffer[pxOffset + 3] = 0;
            }
        }
    }

    const compressed = zlib.deflateSync(rawBuffer);

    // PNG file chunks
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    function createChunk(type, data) {
        const length = Buffer.alloc(4);
        length.writeUInt32BE(data.length, 0);

        const typeBuffer = Buffer.from(type, 'ascii');
        const crcBuffer = Buffer.alloc(4);

        const chunkData = Buffer.concat([typeBuffer, data]);
        const crc = crc32(chunkData);
        crcBuffer.writeInt32BE(crc, 0);

        return Buffer.concat([length, typeBuffer, data, crcBuffer]);
    }

    // IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData.writeUInt8(8, 8); // bit depth
    ihdrData.writeUInt8(6, 9); // color type: RGBA
    ihdrData.writeUInt8(0, 10); // compression
    ihdrData.writeUInt8(0, 11); // filter
    ihdrData.writeUInt8(0, 12); // interlace
    const ihdrChunk = createChunk('IHDR', ihdrData);

    // IDAT
    const idatChunk = createChunk('IDAT', compressed);

    // IEND
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
}

function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ -1;
}

// Ensure icons folder exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach(size => {
    const png = createPng(size);
    const filePath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filePath, png);
    console.log(`Created: ${filePath}`);
});
