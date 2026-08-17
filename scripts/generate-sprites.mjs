import sharp from 'sharp';

async function generateSpriteFrames() {
  const { data: baseData, info } = await sharp('public/killua-pixel.png')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  const bodyBuf = Buffer.alloc(width * height * 4, 0);
  const leftLegBuf = Buffer.alloc(width * height * 4, 0);
  const rightLegBuf = Buffer.alloc(width * height * 4, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = baseData[idx], g = baseData[idx + 1], b = baseData[idx + 2], a = baseData[idx + 3];
      if (a === 0) continue;

      if (y < 235) {
        bodyBuf[idx] = r; bodyBuf[idx + 1] = g; bodyBuf[idx + 2] = b; bodyBuf[idx + 3] = a;
      } else {
        if (x <= 64) {
          leftLegBuf[idx] = r; leftLegBuf[idx + 1] = g; leftLegBuf[idx + 2] = b; leftLegBuf[idx + 3] = a;
        } else {
          rightLegBuf[idx] = r; rightLegBuf[idx + 1] = g; rightLegBuf[idx + 2] = b; rightLegBuf[idx + 3] = a;
        }
      }
    }
  }

  const blit = (target, source, dx, dy) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sIdx = (y * width + x) * 4;
        const a = source[sIdx + 3];
        if (a === 0) continue;

        const tx = x + dx;
        const ty = y + dy;
        if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
          const tIdx = (ty * width + tx) * 4;
          if (target[tIdx + 3] < 100) {
            target[tIdx] = source[sIdx];
            target[tIdx + 1] = source[sIdx + 1];
            target[tIdx + 2] = source[sIdx + 2];
            target[tIdx + 3] = source[sIdx + 3];
          }
        }
      }
    }
  };

  // 1. RUN FRAME 1 (Right leg step forward, Left leg back)
  const run1 = Buffer.alloc(width * height * 4, 0);
  blit(run1, bodyBuf, 3, 2);
  blit(run1, leftLegBuf, -5, 0);
  blit(run1, rightLegBuf, 9, 2);

  // 2. RUN FRAME 2 (Left leg step forward, Right leg back)
  const run2 = Buffer.alloc(width * height * 4, 0);
  blit(run2, bodyBuf, 3, 3);
  blit(run2, leftLegBuf, 9, 2);
  blit(run2, rightLegBuf, -5, 0);

  // 3. JUMP FRAME (Tucked legs airborne leap)
  const jump = Buffer.alloc(width * height * 4, 0);
  blit(jump, bodyBuf, 0, -2);
  blit(jump, leftLegBuf, -2, -10);
  blit(jump, rightLegBuf, 2, -10);

  // 4. GODSPEED FRAME (Pure Electric Blue & Cyan Lightning Aura)
  const godspeed = Buffer.alloc(width * height * 4, 0);
  blit(godspeed, bodyBuf, 0, 0);
  blit(godspeed, leftLegBuf, 0, 0);
  blit(godspeed, rightLegBuf, 0, 0);

  // Only brighten white/silver hair (preserve skin tone)
  for (let y = 0; y < 115; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (godspeed[idx + 3] > 100) {
        const r = godspeed[idx], g = godspeed[idx + 1], b = godspeed[idx + 2];
        const isHair = r > 210 && g > 210 && b > 210 && Math.abs(r - b) < 15;
        if (isHair) {
          godspeed[idx] = 238;
          godspeed[idx + 1] = 252;
          godspeed[idx + 2] = 255;
        }
      }
    }
  }

  // Pure electric blue / cyan / white lightning aura
  const aura = Buffer.from(godspeed);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (godspeed[idx + 3] < 30) {
        let minDist = 999;
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const tx = x + dx;
            const ty = y + dy;
            if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
              const nIdx = (ty * width + tx) * 4;
              if (godspeed[nIdx + 3] > 100) {
                const d = Math.hypot(dx, dy);
                if (d < minDist) minDist = d;
              }
            }
          }
        }
        if (minDist <= 4.2) {
          const isWhiteBolt = (x * 3 + y * 7) % 13 === 0;
          const isDeepBlue = (x + y) % 5 === 0;
          if (isWhiteBolt) {
            aura[idx] = 255; aura[idx + 1] = 255; aura[idx + 2] = 255; aura[idx + 3] = 250;
          } else if (isDeepBlue) {
            aura[idx] = 59; aura[idx + 1] = 130; aura[idx + 2] = 246; aura[idx + 3] = 240;
          } else {
            aura[idx] = 111; aura[idx + 1] = 227; aura[idx + 2] = 255; aura[idx + 3] = 255;
          }
        }
      }
    }
  }

  await sharp(run1, { raw: { width, height, channels: 4 } }).png().toFile('public/killua-run-1.png');
  await sharp(run2, { raw: { width, height, channels: 4 } }).png().toFile('public/killua-run-2.png');
  await sharp(jump, { raw: { width, height, channels: 4 } }).png().toFile('public/killua-jump.png');
  await sharp(aura, { raw: { width, height, channels: 4 } }).png().toFile('public/killua-godspeed.png');

  console.log('Fixed skin tone and generated pure electric blue Godspeed!');
}

generateSpriteFrames();
