import { DiscountCodeStatus } from '@prisma/client';

import { db } from '~/server/db.server';

import { dbDiscountCodeToDiscountCode } from '~/server/db/codecs.server';
import type { DiscountCode, DiscountCodeInput } from '~/types';

import Id from '../utils/Id.server';


async function findDiscountCodesForOrganizer(organizerId: string) {

  return (await db.discountCode.findMany({
    where: {
      organizerId,
      status: { not: DiscountCodeStatus.deleted }
    }, 
    orderBy: {
      createdAt: 'asc'
    }
  })).map(dbDiscountCodeToDiscountCode);
}

async function upsertDiscountCode(data: DiscountCodeInput) {
  const now = new Date();

  return await db.discountCode.upsert({
    where: {
      code_organizerId: { code: data.code, organizerId: data.organizerId }
    },
    update: {
      code: data.code,
      value: data.value * 1000,
      fixed: data.fixed,
      status: DiscountCodeStatus.auto,
      active: true
    },
    create: {
      id: Id(),
      code: data.code,
      value: data.value * 1000,
      fixed: data.fixed,
      organizerId: data.organizerId,
      active: true,
      createdById: data.createdById,
      createdAt: now,
      updatedAt: now
    }
  });
}

async function findDiscountCodeById(id: string): Promise<DiscountCode | null> {
  return await db.discountCode.findUnique({
    where: { id }
  });
}

async function deleteDiscountCode(id: string) {
  return await db.discountCode.update({
    where: { id },
    data: {
      status: DiscountCodeStatus.deleted,
      active: false
    }
  });
}

async function disableDiscountCode(id: string) {
  return await db.discountCode.update({
    where: { id },
    data: {
      active: false
    }
  });
}

export {
  findDiscountCodesForOrganizer,
  upsertDiscountCode,
  findDiscountCodeById,
  deleteDiscountCode,
  disableDiscountCode
};
