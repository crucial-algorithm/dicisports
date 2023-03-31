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
        .contains('30 Outubro, 2023')

        .get('[data-cy=location-link]')
        .should('have.attr', 'href')
        .and('include', locationLink)

        .get('[data-cy=difficulty]')
        .contains('Difícil')

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
        .and('include', '/o/document/MY4bvgxDbMtGv8rbYe5d');

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
        '/o/race/gpx/xaXaCzs2t7D8DpRNnffM'
      );
    });

    it('Should show an handled message when accessing an unpublished event', () => {
      cy.visitAndWaitForHydration('/event/trail-do-zezere').get('p[data-cy=event-not-found]');
    });

    it('Should show error message when accessing an non existing event', () => {
      cy.visitAndWaitForHydration('/event/non-existing-event').get('p[data-cy=event-not-found');
    });

    it('Should delete event', () => {
      cy.loginAdmin()
        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .intercept('POST', '/o/event/MY4bvgxDbMtGv8rbYe5d*')
        .as('DeleteEvent')

        .get('button[name=delete-button]')
        .click()

        .get('button[name=confirm-delete]')
        .should('exist')
        .click()

        .wait('@DeleteEvent')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o');
        })

        .get('[data-cy=event-MY4bvgxDbMtGv8rbYe5d]')
        .should('not.exist');
    });
  });

  context('Security', () => {
    it('should not access /o/event/create when not authenticated', () => {
      cy.visitAndWaitForHydration('/o/event/create')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/login`);
    });

    it('should not allow a user from editing another user event', () => {
      cy.login()
        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/`);
    });
  });

  context('Maintenance', () => {
    beforeEach(() => {
      cy.loginOrganiser();
      cy.task('db:reset');
      cy.task('clearDownloadFolder');
    });

    it.skip('should load events in mobile', () => {
      cy.visitAndWaitForHydration('/')
        .get('[data-cy=mobile-menu]')
        .click()
        .get('[data-cy=m-events]')
        .click()
        .get('button[name=create-event]')
        .should('exist');
    });

    it.skip('should load events in desktop', () => {
      cy.viewport(1024, 768)
        .visitAndWaitForHydration('/')
        .get('[data-cy=events]')
        .click()
        .get('button[name=create-event]')
        .should('exist');
    });

    it('should create an event', () => {
      const description = 'O Peso da Régua será ponto de partida';

      cy.intercept('GET', '/o/event/*?_data=routes*')
        .as('EventRequests')
        .visitAndWaitForHydration('/o')
        .get('button[name=create-event]')
        .click()

        .wait('@EventRequests')

        .get('input[name=event-name]')
        .type('a new event')
        .should('have.value', 'a new event')

        .pickOptionFromSelect('sport', 4)
        .pickOptionFromSelect('difficulty', 1)

        .get('input[name=event-date]')
        .type(new Date(Date.now() + 86400 * 1000).toISOString().split('T')[0])

        .pickLocationInMap('open-map')

        .get('#booking-external')
        .check()
        .get('input[name=booking-url]')
        .type('https://...')

        .get('input[name="/file/image/0"]')
        .selectFile('cypress/assets/logo.jpg', { force: true })

        .get('textarea[name=event-description]')
        .type(description)
        .should('have.value', description)

        .get('input[data-cy=perk-1]')
        .check()

        .get('input[data-cy=perk-5]')
        .check()

        .get('input[data-cy=perk-6]')
        .check()

        // Create a new race
        .get('button[name=create-race]')
        .click()

        .get('input[name=race-name]')
        .type('a new race')

        .get('input[name=race-distance]')
        .type('10')

        .pickOptionFromSelect('hour', 9)

        .get('input[name=elevationGain]')
        .type('9')

        .get('input[name=elevationLoss]')
        .type('8')

        .get('input[name=price]')
        .type('25')

        .get('input[name=priceEarlyBird]')
        .type('15')

        .get('input[name=race-date]')
        .type(new Date(Date.now() + 86400 * 1000).toISOString().split('T')[0])

        .get('textarea[name=race-description]')
        .type('10km run')

        .get('input[name="/file/gpx/"]')
        .selectFile('cypress/assets/sample.gpx', { force: true })

        // End of new race
        .get('button[name=create-race-button]')
        .click()

        .wait('@EventRequests')

        .get('textarea[name=get-there]')
        .type('Carro: Saida pela A3 direção a Braga')

        // "Create" document
        .get('button[name=create-document]')
        .click()

        .get('input[name=document-name]')
        .type('a new document')

        .get('input[name="/file/misc/"]')
        .selectFile('cypress/assets/sample.pdf', { force: true })

        .get('button[name=create-document-button]')
        .click()

        .wait('@EventRequests')

        .intercept('POST', '/o/event/*_data=routes*')
        .as('createEvent')

        .get('button[name=create-event]')
        .click()

        .wait('@createEvent')
        .wait('@EventRequests')

        .get('button[name=update-event]')

        .get('#publish')
        .should('exist');
    });

    it('should publish an event', () => {
      cy.intercept('POST', '/o/event/*_data=routes*')
        .as('publishEvent')

        .visitAndWaitForHydration('/o/event/bQmGXYkbhJetjk6mniMt')

        .get('#publish')
        .click()

        .wait('@publishEvent')

        .visitAndWaitForHydration('/event/trail-do-zezere')

        .get('[data-cy=event-not-found]')
        .should('not.exist');
    });

    it('should unpbulish an event', () => {
      cy.intercept('POST', '/o/event/*_data=routes*')
        .as('unpublishEvent')

        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .get('#unpublish')
        .click()

        .wait('@unpublishEvent')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('[data-cy=event-not-found]')
        .should('exist');
    });

    it('should update a event', () => {
      cy.visitAndWaitForHydration('/o/dashboard/MY4bvgxDbMtGv8rbYe5d')
        .get('[data-cy="edit"]')
        .click()

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .get('textarea[name=event-description]')
        .clear()
        .type('event update')

        .get('button[name=update-event]')
        .click()

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/o/dashboard/MY4bvgxDbMtGv8rbYe5d');
        })

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')
        .reload()

        .get('[data-cy=description]')
        .contains('event update');
    });

    it('should change race order', () => {
      cy.intercept('POST', '/o/race/AhowRdNWCBQWSuivSt7h/move-down?*')
        .as('MoveRaceDown')

        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .get('button[name=move-down-AhowRdNWCBQWSuivSt7h]')
        .click({ force: true })

        .wait('@MoveRaceDown')
        .reload()

        .get('div[data-cy=race-index-0]')
        .contains('Mediofondo')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')
        .reload()

        .get('div[data-cy=race-0]')
        .contains('Mediofondo');
    });

    it('should change document order', () => {
      cy.intercept('POST', '/o/document/MY4bvgxDbMtGv8rbYe5d/move-down?*')
        .as('MoveDocumentDown')

        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .get('button[name=move-down-MY4bvgxDbMtGv8rbYe5d]')
        .click({ force: true })

        .wait('@MoveDocumentDown')
        .reload()

        .get('div[data-cy=document-index-0]')
        .contains('Circuito')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')
        .reload()

        .get('div[data-cy=document-0]')
        .contains('Circuito');
    });

    it('should download document', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .get('[data-cy=download-MY4bvgxDbMtGv8rbYe5d]')
        .then((link) => {
          cy.request(link.prop('href')).its('status').should('eq', 200);
        });
    });

    it('should add a new perk', () => {
      cy.intercept('POST', '/o/event/*?_data=routes*')
        .as('postPerk')
        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .get('input[name=new-perk-input]')
        .type('a new perk')

        // Click another thing to get input out of focus and add the new perk
        .get('textarea[name=event-description]')
        .click()

        .get('button[name=update-event]')
        .click()

        .wait('@postPerk')
        .waitForHydration()

        .contains('a new perk')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('label[data-cy=perk-9]')
        .contains('a new perk');
    });

    it('should display event preview', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')
        .get('#preview-button')
        .should('exist')
        .then((link) => {
          cy.request(link.prop('href')).its('status').should('eq', 200);
          cy.visitAndWaitForHydration(link.prop('href'))
            .get('[data-cy=name]')
            .contains('Love Tiles Douro Granfondo 2023');
        });
    });

    it('should not have preview button if event is not created yet', () => {
      cy.intercept('GET', '/o/event/*?_data=routes*')
        .as('EventRequests')
        .visitAndWaitForHydration('/o')
        .get('button[name=create-event]')
        .click()

        .wait('@EventRequests')

        .get('#preview-button')
        .should('not.exist');
    });

    it('should preview saved event', () => {
      cy.intercept('GET', '/o/event/*?_data=routes*')
        .as('EventRoute')
        .visitAndWaitForHydration('/o')
        .get('div[data-cy=event-cmWJ3DMDwzJRwMaTQv53]')
        .click()

        .wait('@EventRoute')

        .get('#preview-button')
        .should('exist')
        .then((link) => {
          cy.request(link.prop('href')).its('status').should('eq', 200);
          cy.visitAndWaitForHydration(link.prop('href'))
            .get('[data-cy=name]')
            .contains('A new event')

            // Check if it shows message when there is no races, documents, etc.
            .get('[data-cy=no-races]')
            .should('exist')

            .get('[data-cy=no-documents]')
            .should('exist')

            .get('[data-cy=no-description]')
            .should('exist');
        });
    });

    it('should not access a preview if user did not create such event', () => {
      cy.login()
        .visitAndWaitForHydration('/o/event/preview/MY4bvgxDbMtGv8rbYe5d')

        .get('p[data-cy=event-not-found]')
        .should('exist');
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
      .readFile('./cypress/downloads/Granfondo.gpx');
  }
}
