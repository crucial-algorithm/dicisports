import { db } from '~/server/db.server';
import { dbDiscountCodeToDiscountCode } from '~/server/db/codecs.server';


async function findDiscountCodesForOrganiser(organiserId: string) {

  return (await db.discountCode.findMany({
    where: {
      organiserId
    }
  })).map(dbDiscountCodeToDiscountCode);
}

export { findDiscountCodesForOrganiser };
