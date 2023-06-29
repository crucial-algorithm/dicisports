import { db } from '~/server/db.server';

async function addEmailToMailingList(
  email: string,
  organiserId: string
): Promise<void> {
  const now = new Date();

  await db.mailingList.create({
    data: {
      email,
      organiserId,
      createdAt: now
    }
  });
}

export { addEmailToMailingList };
