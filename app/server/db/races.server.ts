import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';

import type { Race } from '~/types';

async function createRace(eventId: string, name: string): Promise<Race | void>{
    const raceId = Id();
    const raceAt = new Date();

    await db.race.create({
       data:{
           id: raceId,
           name: name,
           distance: 10,
           createdAt: raceAt,
           updatedAt: raceAt,
           startTime: 10,
           elevationGain: 20,
           elevationLoss: 20,
           price: 10,
           validUntil: raceAt,
           raceDescription: 'lets run 10 miles',
           eventId: eventId
       }
    });
}

export { createRace };