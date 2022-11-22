describe('Search', () => {
  beforeEach(() => {
    cy.task('db:reset');
  });

  context('General', () => {
    it('should load groups', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .visit('/')

        .get('#search-button')
        .click()

        .wait('@search')

        .get('[data-cy=group-name]')
        .should('exist');
    });
    it.skip('should load groups from Porto', () => {
      //TODO: check how to allow location
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .visit('/')

        .get('#search-button')
        .click()

        .wait('@search');
    });

    it('should redirect to create a group form: authenticated', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .login()
        .visit('/')

        .get('#search-button')
        .click()

        .wait('@search')

        .get('button[name=create-your-group]')
        .click()

        .url()
        .should('include', `${Cypress.config().baseUrl}/m/group/`);
    });

    it('should favorite a group unauthenticated: login', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .visit('/')

        .get('#search-button')
        .click()

        .wait('@search')

        .intercept('GET', '/login?a=favorite&g=*_data=routes*')
        .as('loadLoginPage')

        .get('#add-favorite-0')
        .click()

        .wait('@loadLoginPage')

        .get('[name=email]')
        .type('regular@gmail.com', { delay: 1 })

        .get('[name=password]')
        .type('Password1', { delay: 1 })

        .intercept('POST', '/login*')
        .as('login')

        .get('button[name=login]')
        .click()

        .wait('@login')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/`)

        .visit('/m/groups')

        .get('button[name=groupId]')
        .should('have.length', 2);
    });

    it('should favorite a group unauthenticated: signup', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .visit('/')

        .get('#search-button')
        .click()

        .wait('@search')

        .intercept('GET', '/login?*_data=routes*')
        .as('loginPage')

        .get('#add-favorite-0')
        .click()

        .wait('@loginPage')

        .intercept('GET', '/signup?*_data=routes*')
        .as('signupPage')

        .get('#create-account')
        .click()

        .wait('@signupPage')

        .get('input[name=signup-email]')
        .type('a@gmail.com')

        .get('input[name=confirmation]')
        .type('a@gmail.com')

        .get('input[name=name]')
        .type('Projeto Pedal')

        .get('input[name=password]')
        .type('pp@password1')

        .intercept('GET', '/me?*_data=routes*')
        .as('signup')

        .get('button[name=create]')
        .click()

        .wait('@signup')

        .visit('/m/groups')

        .get('button[name=groupId]')
        .should('have.length', 1);
    });

    //TODO: check how to disbale popup prompt and check value
    it.skip('should copy from clipboard', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .visit('/')

        .get('#search-button')
        .click()

        .wait('@search')

        .window()
        .then((win) => {
          cy.stub(win, 'prompt')
            .returns(win.prompt)
            .as('copyToClipboardPrompt');
        })

        .get('button[name=share-1]')
        .click()
        .get('@copyToClipboardPrompt')
        .should('be.called');
    });

    context('Test all filters', () => {
      it('should return Morning groups', () => {
        cy.intercept('GET', '/?index=&coords=*_data=routes*')
          .as('applyFilters')
          .visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          )

          // Morning groups < 12H:00min
          .get('button[name=filters]')
          .click()

          .get('#4')
          .click()

          .get('#apply-filters')
          .click()

          .wait('@applyFilters')
          .reload()

          .get('[data-cy=group-schedule]')
          .each((text) => {
            // Get text from JQuery object and split day of the week and hour
            const schedule = Cypress.$(text).text().split(',');
            // Get time of the day from schedule
            const time = schedule[1];
            // Split time of the day and trim to get hour
            const hour = time.split(':')[0].trim();

            // Cast string to number and compare
            expect(Number(hour)).to.be.lessThan(12);
          });
      });

      it('should return Afternoon groups', () => {
        cy.intercept('GET', '/?index=&coords=*_data=routes*')
          .as('search')
          .visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          )

          // Afternoon groups > 13H:00min and < 20H:00min
          .get('button[name=filters]')
          .click()

          .get('#5')
          .click()

          .get('#apply-filters')
          .click()

          .wait('@search')
          .reload()

          .get('[data-cy=group-schedule]')
          .each((text) => {
            const schedule = Cypress.$(text).text().split(',');
            const time = schedule[1];
            const hour = time.split(':')[0].trim();

            expect(Number(hour)).to.be.lessThan(20);
            expect(Number(hour)).to.be.greaterThan(11);
          });
      });

      it('should return Noon groups', () => {
        cy.intercept('GET', '/?index=&coords=*_data=routes*')
          .as('search')
          .visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          )

          // Night groups > 20H:00min and < 23H:00min
          .get('button[name=filters]')
          .click()

          .get('#6')
          .click()

          .get('#apply-filters')
          .click()

          .wait('@search')
          .reload()

          .get('[data-cy=group-schedule]')
          .each((text) => {
            const schedule = Cypress.$(text).text().split(',');
            const time = schedule[1];
            const hour = time.split(':')[0].trim();

            expect(Number(hour)).to.be.lessThan(24);
            expect(Number(hour)).to.be.greaterThan(19);
          });
      });

      it('should return groups from each day of the week', () => {
        cy.intercept('GET', '/?index=&coords=*_data=routes*')
          .as('search')
          .visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          );

        // Sunday
        verifyDayOfWeek(1, 'Domingo');

        // Monday
        verifyDayOfWeek(2, 'Segunda-Feira');

        // Tuesday
        verifyDayOfWeek(3, 'Terça-Feira');

        // Wednesday
        verifyDayOfWeek(4, 'Quarta-Feira');

        // Thursday
        verifyDayOfWeek(5, 'Quinta-Feira');

        // Friday
        verifyDayOfWeek(6, 'Sexta-Feira');

        // Saturday
        verifyDayOfWeek(7, 'Sábado');
      });

      it("should return 'Convivio' groups", () => {
        cy.intercept('GET', '/*?coords=*_data=routes*')
          .as('search')
          .visitAndWaitForHydration('/')

          .get('#search-button')
          .click()

          .wait('@search')

          .get('button[name=filters]')
          .click()

          .get('#35')
          .click()

          .get('#apply-filters')
          .click()

          .wait('@search')
          .reload()

          .get('div[data-cy=group-spirit]')
          .should('contain', 'Convívio');
      });

      it("should return 'Desportivo' groups", () => {
        cy.intercept('GET', '/*?coords=*_data=routes*')
          .as('search')
          .visitAndWaitForHydration('/')

          .get('#search-button')
          .click()

          .wait('@search')

          .get('button[name=filters]')
          .click()

          .get('#36')
          .click()

          .get('#apply-filters')
          .click()

          .wait('@search')
          .reload()

          .get('div[data-cy=group-spirit]')
          .should('contain', 'Desportivo');
      });

      it("should return 'Treino' groups", () => {
        cy.intercept('GET', '/*?coords=*_data=routes*')
          .as('search')
          .visitAndWaitForHydration('/')

          .get('#search-button')
          .click()

          .wait('@search')

          .get('button[name=filters]')
          .click()

          .get('#37')
          .click()

          .get('#apply-filters')
          .click()

          .wait('@search')
          .reload()

          .get('div[data-cy=group-spirit]')
          .should('contain', 'Treino');
      });

      it("should return 'Amizade' groups", () => {
        cy.intercept('GET', '/*?coords=*_data=routes*')
          .as('search')
          .visitAndWaitForHydration('/')

          .get('#search-button')
          .click()

          .wait('@search')

          .get('button[name=filters]')
          .click()

          .get('#38')
          .click()

          .get('#apply-filters')
          .click()

          .wait('@search')
          .reload()

          .get('div[data-cy=group-spirit]')
          .should('contain', 'Amizade');
      });

      it("should return 'Turismo' groups", () => {
        cy.intercept('GET', '/*?coords=*_data=routes*')
          .as('search')
          .visitAndWaitForHydration('/')

          .get('#search-button')
          .click()

          .wait('@search')

          .get('button[name=filters]')
          .click()

          .get('#39')
          .click()

          .get('#apply-filters')
          .click()

          .wait('@search')
          .reload()

          .get('div[data-cy=group-spirit]')
          .should('contain', 'Turismo');
      });

      it('should return groups from each sport', () => {
        cy.intercept('GET', '/?actionId=search*_data=routes*')
          .as('selectSport')
          .intercept('GET', '/?index=&coords=*_data=routes*')
          .as('search');

        checkGroupsBySport(1, 3);
        checkGroupsBySport(2, 12);
        checkGroupsBySport(3, 5);
        checkGroupsBySport(4, 7);
        checkGroupsBySport(5, 3);
        checkGroupsBySport(6, 5);
        checkGroupsBySport(7, 4);
      });
    });

    it('should have whatsapp link', () => {
      cy.intercept('GET', '/?actionId=search*_data=routes*')
        .as('selectSport')
        .visitAndWaitForHydration('/')

        .get('[data-cy=4]')
        .click()

        .wait('@selectSport')

        .get('#whatsapp-GkoxmH5db6RXqBpExion')
        .should('be.visible');
    });

    it('should send whatsapp link when user is not authenticated', () => {
      cy.intercept('GET', '/?actionId=search*_data=routes*')
        .as('selectSport')
        .visitAndWaitForHydration('/')

        .get('[data-cy=4]')
        .click()

        .wait('@selectSport')

        .intercept('GET', '/login?a=*_data=routes*')
        .as('whatsappLink')

        .get('#whatsapp-GkoxmH5db6RXqBpExion')
        .should('be.visible')
        .click()

        .wait('@whatsappLink')

        .get('input[name=email]')
        .type('abcd@gmail.com')

        .intercept('GET', '/?actionId=*message=*_data=routes*')
        .as('sendEmail')

        .get('button[name=login]')
        .click()

        .wait('@sendEmail');
    });

    it('should return groups from \'Porto\'', () => {
      cy.intercept('GET', '/?index=*_data=routes*')
        .as('search')
        .visitAndWaitForHydration('/')

        .intercept('GET', 'https://api.mapbox.com/geocoding/v5/mapbox.places/Porto*')
        .as('mapBoxSearchResult')

        .get('input.react-select__input')
        .type('Porto, Porto, Portugal', { delay: 1 })

        .wait('@mapBoxSearchResult')

        .get('#react-select-2-listbox')
        .contains('Porto, Porto, Portugal')
        .click()

        .get('#search-button')
        .click()

        .wait('@search')

        .get('div[data-cy=group-entry]')
        .should('have.length', 2);
    });
  });
});

function verifyDayOfWeek(filterOption: number, dayOfWeek: string) {
  cy.get('button[name=filters]')
    .click()

    .pickOptionFromSelect('dow', filterOption)

    .get('#apply-filters')
    .click()

    .wait('@search')

    .get('[data-cy=group-schedule]')
    .should('contain', dayOfWeek);
}

function checkGroupsBySport(sport: number, length: number) {
  if (length > 10 && length <= 20) {
    cy.visitAndWaitForHydration('/')

      // Check if filter works from homepage
      .get(`[data-cy=${sport}]`)
      .click()

      .wait('@selectSport')

      .intercept('GET', '/?index=&coords=*_data=routes*')
      .as('seeMore')

      .get('#see-more')
      .click()

      .wait('@seeMore')

      .get('#see-more')
      .should('not.exist')

      .get('div[data-cy=group-entry]')
      .should('have.length', length)

      .visitAndWaitForHydration(
        '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
      )

      // Check if filter works from filter dialog
      .get('button[name=filters]')
      .click()

      .pickOptionFromSelect('sport', sport)

      .intercept('GET', `/?index=&coords*sport=${sport}*`)
      .as('applyFilter')

      .get('#apply-filters')
      .click()

      .wait('@applyFilter')

      .get('#see-more')
      .click()

      .wait('@seeMore')

      .get('div[data-cy=group-entry]')
      .should('have.length', length)

      .get('#see-more')
      .should('not.exist');
  } else {
    cy.visitAndWaitForHydration('/')

      .get(`[data-cy=${sport}]`)
      .click()

      .wait('@selectSport')

      .get('div[data-cy=group-entry]')
      .should('have.length', length)

      .get('#see-more')
      .should('not.exist')

      .visitAndWaitForHydration(
        '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
      )

      .get('button[name=filters]')
      .click()

      .pickOptionFromSelect('sport', sport)

      .get('#apply-filters')
      .click()

      .wait('@search')

      .get('div[data-cy=group-entry]')
      .should('have.length', length)

      .get('#see-more')
      .should('not.exist');
  }
}
