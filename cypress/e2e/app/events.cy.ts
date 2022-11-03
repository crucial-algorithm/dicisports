describe('Event', () => {
  before(() => {
    cy.task('db:reset');
    cy.task('clearDownloadFolder');
  });

  context('Public', () => {
    it('Should display event', () => {
      const name = 'Love Tiles Douro Granfondo 2023';
      const description =
        'O Peso da Régua será ponto de partida e de reencontro, depois de serem atravessados os concelhos de Lamego, Armamar, ' +
        'Tabuaço, Penedono, Foz Coa e São João da Pesqueira.';
      const locationLink =
        'https://www.google.com/maps/search/?api=1&query=41.7352772%2C-7.4712548';
      const granfondo =
        'O Granfondo tem 154km de distância e irá testar as vossas capacidades. Estão prontos para o desafio ?';

      cy.loginAdmin()
        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')
        .get('[data-cy=image0]')
        .should('be.visible')

        .get('[data-cy=name]')
        .contains(name)

        .get('[data-cy=date]')
        .contains('30 Outubro, 2022')

        .get('[data-cy=location-link]')
        .should('have.attr', 'href')
        .and('include', locationLink)

        .get('[data-cy=race]')
        .should('have.length', 3)

        .get('[data-cy=location]')
        .contains('Chaves')

        .get('[data-cy=price]')
        .contains('10€')

        .get('[data-cy=description]')
        .contains(description)

        .get('[data-cy=perk]')
        .should('have.length', 10)

        .get('[name=perk-checkbox-bbb]')
        .should('be.checked')

        .get('[name=perk-checkbox-ccc]')
        .should('be.checked')

        .get('[name=perk-checkbox-fff]')
        .should('be.checked')

        .get('[name=perk-checkbox-iii]')
        .should('be.checked')

        .get('[data-cy=directions]')
        .contains('Carro: Saida pela A3 direção a Braga')

        .get('div[data-cy=document-extension]')
        .contains('PDF')

        .get('[data-cy=document-label]')
        .contains('Regulamento')
        .should('have.attr', 'href')
        .and('include', '/organizer/document/MY4bvgxDbMtGv8rbYe5d');

      verifyRace('AhowRdNWCBQWSuivSt7s', 'Mediofondo', 102, '08:30', 15, 1804);
      verifyRace('AhowRdNWCBQWSuivSt7h', 'Minifondo', 57, '08:30', 10, 800);
      verifyRace(
        'xaXaCzs2t7D8DpRNnffM',
        'Granfondo',
        154,
        '09:00',
        25,
        2274,
        576,
        granfondo,
        '/organizer/race/xaXaCzs2t7D8DpRNnffM'
      );
    });

    it('Should show an handled message when accessing an unpublished event', () => {
      cy.visit('/event/trail-do-zezere').get('p[data-cy=event-not-found]');
    });

    it('Should show error message when accessing an non existing event', () => {
      cy.visit('/event/non-existing-event').get('p[data-cy=event-not-found');
    });
  });

  context('Security', () => {
    it('should not access /organizer/event/create when not authenticated', () => {
      // TODO
    });

    it('should not allow a user from editing another user event', () => {
      // TODO
    });
  });

  context('Maintenance', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.task('cleanDownloadFolder');
      cy.loginAdmin();
    });

    it('should create and publish an event', () => {
      // TODO
    });

    it('should enable external booking address when option is selected, and save the url provided', () => {
      // TODO
    });

    it('should update a event', () => {
      // TODO
    });

    it('should change race order', () => {
      // TODO
    });

    it('should change document order', () => {
      // TODO
    });

    it('should download document', () => {
      // TODO
    });

    it('should add a new perk', () => {
      // TODO
    });

  });
});

function verifyRace(
  raceId: string,
  name: string,
  distance: number,
  time: string,
  price: number,
  elevationGain: number,
  elevationLoss?: number,
  description?: string,
  gpx?: string
) {
  cy.get(`[data-cy=race-name-${raceId}]`)
    .contains(name)

    .get(`[data-cy=race-distance-${raceId}]`)
    .contains(`${distance} km`)

    .get(`[data-cy=race-time-${raceId}]`)
    .contains(time)

    .get(`[data-cy=race-price-${raceId}]`)
    .contains(`€${price}`)

    .get(`label[data-cy=see-more-${raceId}]`)
    .first()
    .click()

    .get(`div[data-cy=elevation-gain-${raceId}]`)
    .contains(`${elevationGain} m`);

  if (elevationLoss) {
    cy.get(`div[data-cy=elevation-loss-${raceId}]`).contains(
      `${elevationLoss} m`
    );
  }

  if (description) {
    cy.get(`[data-cy=race-description-${raceId}]`).contains(description);
  }

  if (gpx) {
    cy.get(`[data-cy=gpx-${raceId}]`)
      .should('have.attr', 'href')
      .and('include', gpx);

    cy.get(`[data-cy=gpx-${raceId}]`)
      .click()
      .readFile('./cypress/downloads/Granfondo.gpx', { timeout: 8000 });
  }
}
