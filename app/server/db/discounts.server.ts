import { db } from '~/server/db.server';
import { dbDiscountCodeToDiscountCode } from '~/server/db/codecs.server';


async function findDiscountCodesForOrganizer(organizerId: string) {

  return (await db.discountCode.findMany({
    where: {
      organizerId
    }
  })).map(dbDiscountCodeToDiscountCode);
}

export { findDiscountCodesForOrganizer };
