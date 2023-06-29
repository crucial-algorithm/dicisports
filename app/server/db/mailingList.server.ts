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

async function findMailingListEnrolledEmail(email: string, organiserId: string): Promise<{
  email: string;
  organiserId: string;
  createdAt: Date;
}> {
  return await db.mailingList.findUnique({
    where: {
      email_organiserId: {
        email, organiserId
      }
    }
  });
}

export { addEmailToMailingList, findMailingListEnrolledEmail };
