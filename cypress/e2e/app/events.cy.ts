describe('Event', () => {
  before(() => {
    cy.task('db:reset');
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
        'O Granfondo tem 154km de distância e irá testar as vossas capacidades.' +
        'Estão prontos para o desafio ?';

      cy.login()
        .visit('/event/love-tiles-douro-granfondo-2023')
        .wasImageLoaded('img[data-cy=images]')

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

        .get('[name=perk-checkbox1]')
        .should('be.checked')

        .get('[name=perk-checkbox2]')
        .should('be.checked')

        .get('[name=perk-checkbox5]')
        .should('be.checked')

        .get('[name=perk-checkbox8]')
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
      cy.login()
        .visit('/event/trail-do-zezere')

        .get('p[data-cy=event-not-public]');
    });

    it('Should show error message when accessing an non existing event', () => {
      cy.login()
        .visit('/event/asidjas')

        .get('p[data-cy=event-not-found');
    });
  });
});

function verifyRace(
  index: string,
  name: string,
  distance: number,
  time: string,
  price: number,
  elevationGain: number,
  elevationLoss?: number,
  description?: string,
  gpx?: string
) {
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.get(`[data-cy=race-name${index}]`)
    .contains(name)

    .get(`[data-cy=race-distance${index}]`)
    .contains(`${distance} km`)

    .get(`[data-cy=race-time${index}]`)
    .contains(time)

    .get(`[data-cy=race-price${index}]`)
    .contains(`€${price}`)

    .wait(500)

    .get(`label[data-cy=see-more${index}]`)
    .first()
    .click()

    .get(`div[data-cy=elevation-gain${index}]`)
    .contains(`${elevationGain} m`);

  if (elevationLoss) {
    cy.get(`div[data-cy=elevation-loss${index}]`).contains(
      `${elevationLoss} m`
    );
  }

  if (description) {
    cy.get(`[data-cy=race-description${index}]`).contains(description);
  }

  if (gpx) {
    cy.get(`[data-cy=gpx${index}]`)
      .should('have.attr', 'href')
      .and('include', gpx);
  }
}
