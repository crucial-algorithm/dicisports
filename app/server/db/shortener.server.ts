import { db } from '~/server/db.server';

import Id from '~/server/utils/Id.server';


function pickRandomCharsFromStr(str: string, count: number) {
    const result = [];

    for (let i = 0; i < count; i++) {
        result.push(str[Math.floor(Math.random() * str.length)]);
    }
    return result.join('');
}

async function createUrl(target: string, expiresAt: Date) {

  const id = Id();

  // loop until we find a unique url in database
  while (true) {
    const url = pickRandomCharsFromStr(id, 5);
    const exists = await findActiveUrl(url);

    if (!exists) {
      await db.urlShortener.create({
        data: {
          id: id,
          url,
          target,
          expiresAt
        }
      });

      return url;
    }
  }
}

async function findActiveUrl(url: string) {
  return await db.urlShortener.findFirst({
    where: {
      url: url,
      expiresAt: {
        gt: new Date()
      }
    }
  });
}


export {
    createUrl as createShortUrl,
    findActiveUrl
};
