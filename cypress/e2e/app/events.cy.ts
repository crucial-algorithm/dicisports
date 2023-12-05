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
        'https://www.google.com/maps/search/?api=1&query=41.16121699250155%2C-7.788708435515758';
      const granfondo =
        'O Granfondo tem 154km de distância e irá testar as vossas capacidades. Estão prontos para o desafio ?';

      const months = [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro'
      ];

      const formatter = (date: Date) => {
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();

        return `${day} ${months[month]}, ${year}`;
      };

      cy.visitAndWaitForHydration('/pt/event/love-tiles-douro-granfondo-2023')
        .get('[data-cy=image0]')
        .should('be.visible')

        .get('[data-cy=name]')
        .contains(name)

        .get('[data-cy=date]')
        .contains(formatter(new Date(`${new Date().getUTCFullYear() + 1}-10-21`)))

        .get('[data-cy=location-link]')
        .should('have.attr', 'href')
        .and('include', locationLink)

        .get('[data-cy=difficulty]')
        .contains('Especialista')

        .get('[data-cy=race]')
        .should('have.length', 3)

        .get('[data-cy=location]')
        .contains('Peso da Régua')

        .get('[data-cy=price]')
        .contains('10€')

        .get('[data-cy=description]')
        .contains(description)

        .get('[data-cy=perk]')
        .should('have.length', 5)

        .get('[data-cy=perk-aaa-unavailable]')
        .should('exist')

        .get('[data-cy=perk-ccc-available]')
        .should('exist')

        .get('[data-cy=perk-ddd-available]')
        .should('exist')

        .get('[data-cy=directions]')
        .contains('Carro: Saida pela A3 direção a Braga')

        .get('div[data-cy=document-extension]')
        .contains('PDF')

        .get('[data-cy=document-label]')
        .contains('Circuito')

        .get('[data-cy=regulation]')
        .should('exist');

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
        '/event/MY4bvgxDbMtGv8rbYe5d/race/xaXaCzs2t7D8DpRNnffM/gpx'
      );
    });

    it('Should show an handled message when accessing an unpublished event', () => {
      cy.visitAndWaitForHydration('/event/flavius-challenge-ocr').get(
        'p[data-cy=event-not-found]'
      );
    });

    it('Should show error message when accessing an non existing event', () => {
      cy.visitAndWaitForHydration('/event/non-existing-event').get(
        'p[data-cy=event-not-found'
      );
    });

    it('Should delete event', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/event/bQmGXYkbhJetjk6mniMt')

        .intercept('POST', '/o/event/bQmGXYkbhJetjk6mniMt*')
        .as('DeleteEvent')

        .get('button[name=delete-button]')
        .click()

        .get('.cy-delete-dialog')
        .should('exist')

        .get('button.cy-primary')
        .should('exist')
        .click()

        .wait('@DeleteEvent')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o');
        })

        .get('[data-cy=event-bQmGXYkbhJetjk6mniMt]')
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
      cy.loginOrganizer();
      cy.task('db:reset');
      cy.task('clearDownloadFolder');
    });

    it('should create an event', () => {
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

        .get('.p-dropdown')
        .click()
        .then(() => {
          cy.get('.p-dropdown-items > li').eq(2).click();
        })

        .pickDate('event-date', futureDate(11, 21).toISOString().split('T')[0])

        .pickLocationInInlinedMap('location')

        .get('#booking-external')
        .check()
        .get('input[name=booking-url]')
        .type('https://...')

        .get('input[name="/file/image/0"]')
        .selectFile('cypress/assets/logo.jpg', { force: true })

        .write('event-description', 'O Peso da Régua será ponto de partida')

        .get('input[data-cy=perk-0]')
        .uncheck()

        // Create a new race
        .get('#create-race')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.match(/.*\/new$/);
        })

        .get('input[name=name]')
        .type('a new race')

        .get('input[name=distance]')
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

        .pickDate(
          'earlyBirdValidUntil',
          futureDate(10, 21).toISOString().split('T')[0]
        )

        .write('description', '10km run')

        .get('input[name="track"]')
        .selectFile('cypress/assets/sample.gpx', { force: true })

        // End of new race
        .get('button[name=create-race-button]')
        .click()

        .wait('@EventRequests')

        .write('get-there', 'Carro: Saida pela A3 direção a Braga')

        // "Create" document
        .get('#create-document')
        .click()

        .get('input[name=name]')
        .type('a new document')

        .get('input[name="file"]')
        .selectFile('cypress/assets/sample.pdf', { force: true })

        .get('button[name=create-document-button]')
        .click()

        .wait('@EventRequests')

        .intercept('POST', '/o/event/*_data=routes*')
        .as('createEvent')

        .get('button[name=update-event]')
        .click()

        .wait('@createEvent')
        .wait('@EventRequests')

        .get('#publish')
        .should('exist');
    });

    it.only('should disable booking on the day before event date', () => {
      cy.intercept('GET', '/o/event/*?_data=routes*')
        .as('EventRequests')
        .visitAndWaitForHydration('/o')
        .get('button[name=create-event]')
        .click()

        .wait('@EventRequests')

        .pickDate('event-date', futureDate(10, 21).toISOString().split('T')[0])

        .get('input[name=booking-stops-at]')
        .should('exist')
        .click()

        .get(
          `[data-cy-year=${
            new Date().getUTCFullYear() + 1
          }][data-cy-month=10][data-cy-day=21]`
        )
        .parent()
        .should('exist')
        .and('have.class', 'p-disabled');
    });

    it('should publish an event', () => {
      cy.visitAndWaitForHydration('/o/event/TgKZi8NQKNoJQGArd3zc')

        .get('#publish')
        .click()

        .get('.cy-publish-dialog')
        .should('exist')

        .get('button.cy-primary')
        .should('exist')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/TgKZi8NQKNoJQGArd3zc/dashboard');
        })

        .visitAndWaitForHydration('/event/flavius-challenge-ocr')

        .get('[data-cy=event-not-found]')
        .should('not.exist');
    });

    it('should unpublish an event', () => {
      cy.intercept('POST', '/o/event/*_data=routes*')
        .as('unpublishEvent')

        .visitAndWaitForHydration('/o/event/bQmGXYkbhJetjk6mniMt')

        .get('#unpublish')
        .click()

        .get('.cy-unpublish-dialog')
        .should('exist')

        .get('button.cy-primary')
        .should('exist')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/bQmGXYkbhJetjk6mniMt');
        })

        .visitAndWaitForHydration('/event/trail-do-zezere')

        .get('[data-cy=event-not-found]')
        .should('exist');
    });

    it('should update a event', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/dashboard')
        .get('[data-cy="edit"]')
        .click()

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .write('event-description', 'event update')

        .get('button[name=update-event]')
        .click()

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')
        .reload()

        .get('[data-cy=description]')
        .contains('event update');
    });

    it('should change race order', () => {
      cy.intercept(
        'POST',
        '/o/event/MY4bvgxDbMtGv8rbYe5d/race/AhowRdNWCBQWSuivSt7h/move-down?*'
      )
        .as('MoveRaceDown')

        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .get('button[name=move-down-AhowRdNWCBQWSuivSt7h]')
        .click({ force: true })

        .wait('@MoveRaceDown')
        .reload()

        .get('a[data-cy=race-index-0]')
        .contains('Mediofondo')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')
        .reload()

        .get('div[data-cy=race-0]')
        .contains('Mediofondo');
    });

    it('should change document order', () => {
      cy.intercept(
        'POST',
        '/o/event/MY4bvgxDbMtGv8rbYe5d/doc/MY4bvgxDbMtGv8rbYe5d/move-down?*'
      )
        .as('MoveDocumentDown')

        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .get('button[name=move-down-MY4bvgxDbMtGv8rbYe5d]')
        .click({ force: true })

        .wait('@MoveDocumentDown')
        .reload()

        .get('a[data-cy=document-index-0]')
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
      cy.intercept('POST', '/o/event/MY4bvgxDbMtGv8rbYe5d*')
        .as('postPerk')
        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .get('input[name=new-perk-input]')
        .type('a new perk')

        // Click another thing to get input out of focus and add the new perk
        .get('body')
        .click()

        .get('button[name=update-event]')
        .click()

        .wait('@postPerk')
        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .get('[data-cy=perk-5]')
        .should('exist')
        .and('be.checked')

        .get('[data-cy=perk-label-5]')
        .contains('a new perk')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/event/love-tiles-douro-granfondo-2023');
        })

        .get('[data-cy^=perk-]')
        .contains('a new perk');
    });

    it('should display event preview', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/dashboard')
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

            // Check if it shows message when there is no races
            .get('[data-cy=no-races]')
            .should('exist');
        });
    });

    it('should not access a preview if user did not create such event', () => {
      cy.login()
        .visitAndWaitForHydration('/o/event/preview/MY4bvgxDbMtGv8rbYe5d')

        .get('p[data-cy=event-not-found]')
        .should('exist');
    });

    it('should delete document', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .intercept(
          'POST',
          '/o/event/MY4bvgxDbMtGv8rbYe5d/doc/MY4bvgxDbMtGv8rbYe5d/remove?*'
        )
        .as('DeleteDocument')

        .get('button[name=delete-MY4bvgxDbMtGv8rbYe5d]')
        .click()

        .get('.cy-delete-dialog')
        .should('exist')

        .get('button.cy-primary')
        .should('exist')
        .click()

        .wait('@DeleteDocument')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('[data-cy=document-extension]')
        .should('have.length', 1);
    });

    it('should create race', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/race/new')

        .get('input[name=name]')
        .type('a new race')

        .get('input[name=name]')
        .type('a new race')

        .get('input[name=distance]')
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

        // assumes seed data is creating a similar future date
        .pickDate(
          'earlyBirdValidUntil',
          futureDate(10, 10).toISOString().split('T')[0]
        )

        .write('description', '10km run')

        .get('input[name="track"]')
        .selectFile('cypress/assets/sample.gpx', { force: true })

        .intercept('POST', '/o/event/MY4bvgxDbMtGv8rbYe5d/race/*')
        .as('CreateRace')

        .get('button[name=create-race-button]')
        .click()

        .wait('@CreateRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('[data-cy=race]')
        .should('have.length', 4)
        .and('contain', 'a new race');
    });

    it('should update race', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .get('[data-cy=race-xaXaCzs2t7D8DpRNnffM]')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/o/event/MY4bvgxDbMtGv8rbYe5d/race/');
        })

        .get('input[name=name]')
        .type(' updated')

        .pickDate(
          'earlyBirdValidUntil',
          futureDate(10, 10).toISOString().split('T')[0]
        )

        .intercept('POST', '/o/event/MY4bvgxDbMtGv8rbYe5d/race/*')
        .as('UpdateRace')

        .get('button[name=create-race-button]')
        .click()

        .wait('@UpdateRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('[data-cy=race-name-xaXaCzs2t7D8DpRNnffM]')
        .should('exist')
        .and('contain', 'Granfondo updated');
    });

    it('should be able to upload a regulation pdf', () => {
      cy.loginOrganizer()

        .intercept('GET', '/o/event/*?_data=routes*')
        .as('EventRequests')
        .visitAndWaitForHydration('/o')

        .get('button[name=create-event]')
        .click()

        .wait('@EventRequests')

        .get('#regulation-option-file')
        .click()

        .get('#file .p-button > input')
        .selectFile('cypress/assets/sample.pdf', {
          action: 'drag-drop',
          force: true
        })

        .wait('@EventRequests')

        .location()
        .should((l) => expect(l.pathname).to.include('/o/event/'))

        .get('[data-cy=regulation]')
        .should('exist');
    });

    it('should be able to upload a regulation inline', () => {
      cy.loginOrganizer()

        .intercept('GET', '/o/event/*?_data=routes*')
        .as('EventRequests')
        .visitAndWaitForHydration('/o')

        .get('button[name=create-event]')
        .click()

        .wait('@EventRequests')

        .write(
          'regulation',
          'Devoluções aceites apenas com justificação válida.'
        )

        .intercept('POST', '/o/event/*_data=routes*')
        .as('createEvent')

        .get('button[name=create-event]')
        .click()

        .wait('@createEvent')

        .reload()
        .waitForHydration()

        .location()
        .should((l) => expect(l.pathname).to.include('/o/event/'))

        .get(
          'div[data-cy=editor-regulation] .ql-editor[contenteditable="true"]'
        )
        .contains('Devoluções aceites apenas com justificação válida.');
    });

    it('should display regulation', () => {
      cy.visit('/event/trilho-dos-moinhos/regulation')

        .get('div[data-cy=regulation]')
        .contains(
          'A inscrição é efetuada online, no site dos Amigos da Montanha, ou na sede da Associação, em Barcelinhos.'
        );
    });

    it('should be able to update inline regulation', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/event/gLqrDfMx6qkTHn6hoZqA')

        .write(
          'regulation',
          'Devoluções aceites apenas com justificação válida.'
        )

        .intercept('POST', '/o/event/*_data=routes*')
        .as('updateEvent')

        .get('button[name=update-event]')
        .click()

        .wait('@updateEvent')

        .visit('/event/trilho-dos-moinhos/regulation')

        .get('div[data-cy=regulation]')
        .contains('Devoluções aceites apenas com justificação válida.');
    });

    it('should create race without price early bird', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/race/new')

        .get('input[name=name]')
        .type('a new race')

        .get('input[name=distance]')
        .type('10')

        .pickOptionFromSelect('hour', 9)

        .get('input[name=elevationGain]')
        .type('9')

        .get('input[name=elevationLoss]')
        .type('8')

        .get('input[name=price]')
        .type('25')

        .write('description', '10km run')

        .get('input[name="track"]')
        .selectFile('cypress/assets/sample.gpx', { force: true })

        .intercept('POST', '/o/event/MY4bvgxDbMtGv8rbYe5d/race/*')
        .as('CreateRace')

        .get('button[name=create-race-button]')
        .click()

        .wait('@CreateRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('[data-cy=race]')
        .should('have.length', 4)
        .and('contain', 'a new race');
    });
    it('should unpublish and publish an event with internal booking', () => {
      cy.intercept('POST', '/o/event/*_data=routes*')
        .as('publishAndUnpublishEvent')

        .visitAndWaitForHydration('/o/event/gLqrDfMx6qkTHn6hoZqA')

        .get('#unpublish')
        .click()

        .get('.cy-unpublish-dialog')
        .should('exist')

        .get('button.cy-primary')
        .should('exist')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/gLqrDfMx6qkTHn6hoZqA');
        })

        .get('#publish')
        .click()

        .get('.cy-publish-dialog')
        .should('exist')

        .get('button.cy-primary')
        .should('exist')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/gLqrDfMx6qkTHn6hoZqA/dashboard');
        })

        .visitAndWaitForHydration('/event/trilho-dos-moinhos')

        .get('[data-cy=event-not-found]')
        .should('not.exist');
    });

    it('should save event changes when adding race/doc - not published', () => {
      cy.visitAndWaitForHydration('/o/event/TgKZi8NQKNoJQGArd3zc')

        .get('input[name=event-name]')
        .type(' updated')
        .should('have.value', 'Flavius Challenge OCR updated')

        .intercept('POST', '/o/event/TgKZi8NQKNoJQGArd3zc*')
        .as('addNewRace')

        .get('#create-race')
        .click()

        .wait('@addNewRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.match(/.*\/new$/);
        })

        .get('#cancel-button')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/TgKZi8NQKNoJQGArd3zc');
        })

        .get('input[name=event-name]')
        .should('have.value', 'Flavius Challenge OCR updated');
    });

    it('should save event changes when adding race/doc - published', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

        .get('input[name=event-name]')
        .type(' updated')
        .should('have.value', 'Love Tiles Douro Granfondo 2023 updated')

        .intercept('POST', '/o/event/MY4bvgxDbMtGv8rbYe5d*')
        .as('addNewRace')

        .get('#create-race')
        .click()

        .wait('@addNewRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.match(/.*\/new$/);
        })

        .get('#cancel-button')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .get('input[name=event-name]')
        .should('have.value', 'Love Tiles Douro Granfondo 2023');
    });

    it('should display and update starting bib number', () => {
      cy.visitAndWaitForHydration('/o/event/5n8epZbHczqAQtQaAh5R/dashboard')
        .get('[data-cy="edit"]')
        .click()

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/o/event/5n8epZbHczqAQtQaAh5R');
        })

        .intercept('POST', '/o/event/5n8epZbHczqAQtQaAh5R*')
        .as('UpdateEvent')

        .get('input[name=bib-number]')
        .should('have.value', '1')
        .clear()
        .type('200')

        .get('button[name=update-event]')
        .click()

        .wait('@UpdateEvent')

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/o/event/5n8epZbHczqAQtQaAh5R');
        })

        .reload()

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/o/event/5n8epZbHczqAQtQaAh5R');
        })

        .get('input[name=bib-number]')
        .should('have.value', '200');
    });

    it('should not update bib starting number when event has race participants', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')
        .get('input[name=bib-number]')
        .should('have.value', '1')
        .and('have.prop', 'disabled')

        .get('button[name=update-event]')
        .click()

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .reload()
        .waitForHydration()

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/o/event/MY4bvgxDbMtGv8rbYe5d');
        })

        .get('input[name=bib-number]')
        .should('have.value', '1')
        .and('have.prop', 'disabled');
    });

    it('should contain correct translations on first render', () => {
      cy.intercept('GET', '/o/event/*?_data=routes*')
        .as('EventRequests')
        .visitAndWaitForHydration('/o')
        .get('button[name=create-event]')
        .click()

        .wait('@EventRequests')

        .get(
          'div[data-cy=editor-event-description] > div > .p-editor-content > .ql-editor'
        )
        .invoke('attr', 'data-placeholder')
        .then((value) => {
          expect(value).to.eq('A edição deste ano será a melhor de sempre...');
        })

        .get(
          'div[data-cy=editor-get-there] > div > .p-editor-content > .ql-editor'
        )
        .invoke('attr', 'data-placeholder')
        .then((value) => {
          expect(value).to.eq('Como chegar lá... Onde estacionar...');
        });
    });

    it('should show handled error when location is not picked on map', () => {
      cy.visitAndWaitForHydration('/o/event/cmWJ3DMDwzJRwMaTQv53')

        .get('#publish')
        .click()

        .get('.cy-publish-dialog')
        .should('exist')

        .get('button.cy-primary')
        .should('exist')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/cmWJ3DMDwzJRwMaTQv53');
        })

        .get('p[role=alert]')
        .should('exist')
        .contains('Avenida Fernão De Magalhães, onde é? Defina no mapa.');
    });

    it('should redirect to external booking', () => {
      cy.visitAndWaitForHydration('/pt/event/corrida-spedro-one-place')
        .get('#book-race-2Q8dMm4gz7b2GeuGRocj')
        .should('have.prop', 'href')
        .and((l) => {
          expect(l).to.eq('https://registerandgo.net/?evento=1019');
        });
    });

    it('should download regulation', () => {
      cy.visitAndWaitForHydration('/pt/event/love-tiles-douro-granfondo-2023')
        .get('[data-cy=regulation]')
        .should('exist')
        .click()

        .readFile('./cypress/downloads/regulamento_v2.0.pdf');
    });

    context('Confirmation Prompt', () => {
      it('should show confirmation when trying to leave route with dirty form', () => {
        cy.on('window:confirm', (text) => {
          expect(text).to.eq(
            'Todas as alterações feitas serão perdidas. Quer continuar?'
          );
        });

        cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

          .get('input[name=event-name]')
          .clear()
          .type('a')

          .get('#back-button')
          .click();
      });

      it('should not block redirect - confirm', () => {
        cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

          .get('input[name=event-name]')
          .clear()
          .type('a')

          .get('#back-button')
          .click()

          .location()
          .should((l) => {
            expect(l.pathname).to.eq('/o/event/MY4bvgxDbMtGv8rbYe5d/dashboard');
          });
      });

      it('should block redirect - cancel', () => {
        // Cypress confirms all "confirm" prompts, this will make sure it presses "cancel" instead of "confirm"
        cy.on('window:confirm', () => false);

        cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d')

          .get('input[name=event-name]')
          .clear()
          .type('a')

          .get('#back-button')
          .click()

          .location()
          .should((l) => {
            expect(l.pathname).to.eq('/o/event/MY4bvgxDbMtGv8rbYe5d');
          });
      });
    });

    it('should allow to upload files without extension - documents', () => {
      cy.visitAndWaitForHydration('/o/event/bQmGXYkbhJetjk6mniMt/doc/new')
        .get('input[name=name]')
        .type('No Extension')

        .get('input[name="file"]')
        .selectFile('cypress/assets/no_extension_pdf', { force: true })

        .get('div[data-cy=uploaded-document]')
        .should('not.exist')

        .intercept('POST', '/o/event/bQmGXYkbhJetjk6mniMt/doc/new*')
        .as('UploadDocument')

        .get('button[name=create-document-button]')
        .click()

        .wait('@UploadDocument')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/bQmGXYkbhJetjk6mniMt');
        })

        .visitAndWaitForHydration('/pt/event/trail-do-zezere')

        .get('div[data-cy=document-extension]')
        .eq(1)
        .contains('PDF')

        .get('[data-cy=document-label]')
        .eq(1)
        .then((link) => {
          cy.request(link.prop('href')).its('status').should('eq', 200);
        });
    });

    it('should allow to upload files without extension - regulation', () => {
      cy.visitAndWaitForHydration('/o/event/bQmGXYkbhJetjk6mniMt')
        .get('#regulation-option-file')
        .click()

        .intercept('POST', '/o/event/bQmGXYkbhJetjk6mniMt/regulation/upload*')
        .as('UploadRegulation')

        .get('#file .p-button > input')
        .selectFile('cypress/assets/no_extension_pdf', {
          action: 'drag-drop',
          force: true
        })

        .wait('@UploadRegulation')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/event/bQmGXYkbhJetjk6mniMt');
        })

        .get('[data-cy=regulation]')
        .contains('no_extension_pdf')
        .then((link) => {
          cy.request(link.prop('href')).its('status').should('eq', 200);
        });
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
    .contains(`${distance}km`)

    .get(`[data-cy=race-time-${raceId}]`)
    .contains(time)

    .get(`[data-cy=race-price-${raceId}]`)
    .contains(`${price}€`)

    .get(`label[data-cy=see-more-${raceId}]`)
    .first()
    .click()

    .get(`div[data-cy=elevation-gain-${raceId}]`)
    .contains(`${elevationGain}m`);

  if (elevationLoss) {
    cy.get(`div[data-cy=elevation-loss-${raceId}]`).contains(
      `${elevationLoss}m`
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
      .readFile(`./cypress/downloads/${name}.gpx`);
  }
}

function futureDate(month = 10, day = 21, offset = 1) {
  const now = new Date();

  return new Date(`${now.getUTCFullYear() + offset}-${month}-${day}`);
}
