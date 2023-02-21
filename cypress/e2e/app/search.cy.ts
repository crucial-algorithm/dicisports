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
    it('should return groups from Porto', () => {
      cy.intercept('GET', '*coords=*&search=*&page=*&actionId=search*')
        .as('search')
        .visitAndWaitForHydration('/')

        .intercept(
          'GET',
          'https://api.mapbox.com/geocoding/v5/mapbox.places/Porto*'
        )
        .as('mapBoxSearchResult')

        .get('input.react-select__input')
        .type('Porto, Porto, Portugal', { delay: 1 })

        .wait('@mapBoxSearchResult')

        .get('#react-select-3-option-0')
        .contains('Porto, Porto, Portugal')
        .click()

        .get('#search-button')
        .click()

        .wait('@search')

        .get('div[data-cy=group-entry]')
        .should('have.length', 2);
    });

    it('should redirect to create a group form: authenticated', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .login()
        .visit('/')

        .get('#search-button')
        .click()

        .wait('@search')

        .reload()
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

    it('should copy to clipboard', { browser: 'chrome' }, () => {
      cy.visitAndWaitForHydration('/?actionId=search&sport=5')

        .get('button[name=share-334a3081b9dd416e384d]')
        .focus()
        .click()
        .then(() => {
          cy.assertValueCopiedToClipboard(
            '/group/associaco-recreativa-alfandega-da-fe'
          );
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

    it('should order by closest location', () => {
      const distances = [];

      cy.visitAndWaitForHydration(
        '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search',
        {
          onBeforeLoad(win: Cypress.AUTWindow) {
            const latitude = 41.15;
            const longitude = -8.61024;

            cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake(
              (cb) => {
                return cb({ coords: { latitude, longitude } });
              }
            );
          }
        }
      )

        .intercept('GET', '/*order=*')
        .as('order')

        .intercept('POST', '/action/*set-my-location*')
        .as('setLocation')

        .get('#sort-location')
        .click()

        .wait('@setLocation')

        .get('#sort-location')
        .click()

        .wait('@order')

        .get('#sort-location')
        .click()

        .wait('@order')
        .reload()

        .get('div[data-cy=distance]')
        .should('exist')
        .each((text) => {
          const distance = text.text().split(' ')[0];

          distances.push(Number(distance));
        })
        .then(() => {
          distances.map((distance, index) => {
            const next = distances[index === 9 ? index : index + 1];

            return expect(distance).not.to.be.greaterThan(next);
          });
        });
    });

    context('Test all filters', () => {
      it('should return Morning groups', () => {
        cy.intercept(
          'GET',
          '*coords=&search=&page=0&order=recent&sport=&dow=&value=&daypart=*&actionId=search&_data=routes*'
        )
          .as('applyFilters')
          .visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          )

          // Morning groups < 12H:00min
          .get('button[name=filters]')
          .click()

          .get('#daypart-Morning')
          .click()

          .get('#apply-filters')
          .click({ force: true })

          .wait('@applyFilters')

          .url()
          .should('include', '&daypart=Morning')
          .waitForHydration()

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
        cy.intercept(
          'GET',
          '*coords=&search=&page=0&order=recent&sport=&dow=&value=&daypart=*&actionId=search&_data=routes*'
        )
          .as('applyFilters')
          .visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          )

          // Afternoon groups > 13H:00min and < 20H:00min
          .get('button[name=filters]')
          .click()

          .get('#daypart-Afternoon')
          .click()

          .get('#apply-filters')
          .click({ force: true })

          .wait('@applyFilters')

          .url()
          .should('include', '&daypart=Afternoon')
          .waitForHydration()

          .get('[data-cy=group-schedule]')
          .each((text) => {
            const schedule = Cypress.$(text).text().split(',');
            const time = schedule[1];
            const hour = time.split(':')[0].trim();

            expect(Number(hour)).to.be.lessThan(20);
            expect(Number(hour)).to.be.greaterThan(11);
          });
      });

      it('should return Evening groups', () => {
        cy.intercept(
          'GET',
          '*coords=&search=&page=0&order=recent&sport=&dow=&value=&daypart=*&actionId=search&_data=routes*'
        )
          .as('applyFilters')
          .visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          )

          // Night groups > 20H:00min and < 23H:00min
          .get('button[name=filters]')
          .click()

          .get('#daypart-Evening')
          .click()

          .get('#apply-filters')
          .click({ force: true })

          .wait('@applyFilters')

          .url()
          .should('include', '&daypart=Evening')
          .waitForHydration()

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
        cy.intercept(
          'GET',
          '*coords=&search=&page=0&order=recent&sport=*&dow=*&value=*&actionId=search&_data=root*'
        )
          .as('search')
          .visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          );

        // Sunday
        verifyDayOfWeek(1, 'Domingo', 6);

        // Monday
        verifyDayOfWeek(2, 'Segunda-Feira', 0);

        // Tuesday
        verifyDayOfWeek(3, 'Terça-Feira', 1);

        // Wednesday
        verifyDayOfWeek(4, 'Quarta-Feira', 2);

        // Thursday
        verifyDayOfWeek(5, 'Quinta-Feira', 3);

        // Friday
        verifyDayOfWeek(6, 'Sexta-Feira', 4);

        // Saturday
        verifyDayOfWeek(7, 'Sábado', 5);
      });

      it('should return Convívio groups', () => {
        checkGroupsBySpirit(1, 'Convívio');
      });

      it('should return Desportivo groups', () => {
        checkGroupsBySpirit(2, 'Desportivo');
      });

      it('should return Treino groups', () => {
        checkGroupsBySpirit(3, 'Treino');
      });

      it('should return Amizade groups', () => {
        checkGroupsBySpirit(4, 'Amizade');
      });

      it('should return Turismo groups', () => {
        checkGroupsBySpirit(5, 'Turismo');
      });

      context('should return groups from each sport', () => {
        it('Running', () => {
          cy.intercept('GET', '/?actionId=search*_data=routes*')
            .as('selectSport')
            .intercept('GET', '/?index=&coords=*_data=routes*')
            .as('search')
            .intercept(
              'GET',
              '*coords=&search=&page=*&order=*&sport=*&dow=&value=&actionId=search&_data=routes*'
            )
            .as('applyFilters');

          checkGroupsBySport(1, 3);
        });

        it('Trail', () => {
          cy.intercept('GET', '/?actionId=search*_data=routes*')
            .as('selectSport')
            .intercept('GET', '/?index=&coords=*_data=routes*')
            .as('search');

          checkGroupsBySport(2, 12);
        });

        it('Road', () => {
          cy.intercept('GET', '/?actionId=search*_data=routes*')
            .as('selectSport')
            .intercept('GET', '/?index=&coords=*_data=routes*')
            .as('search');

          checkGroupsBySport(3, 5);
        });

        it('BTT', () => {
          cy.intercept('GET', '/?actionId=search*_data=routes*')
            .as('selectSport')
            .intercept('GET', '/?index=&coords=*_data=routes*')
            .as('search');

          checkGroupsBySport(4, 7);
        });

        it('E-Bike', () => {
          cy.intercept('GET', '/?actionId=search*_data=routes*')
            .as('selectSport')
            .intercept('GET', '/?index=&coords=*_data=routes*')
            .as('search');

          checkGroupsBySport(5, 3);
        });

        it('Gravel', () => {
          cy.intercept('GET', '/?actionId=search*_data=routes*')
            .as('selectSport')
            .intercept('GET', '/?index=&coords=*_data=routes*')
            .as('search');

          checkGroupsBySport(6, 5);
        });

        it('Enduro', () => {
          cy.intercept('GET', '/?actionId=search*_data=routes*')
            .as('selectSport')
            .intercept('GET', '/?index=&coords=*_data=routes*')
            .as('search');

          checkGroupsBySport(7, 4);
        });
      });
    });
  });
});

function verifyDayOfWeek(filterOption: number, dayOfWeek: string, dow: number) {
  cy.get('button[name=filters]')
    .click()

    .pickOptionFromSelect('dow', filterOption)

    .get('#apply-filters')
    .click({ force: true })

    .wait('@search')

    .url()
    .should('include', `dow=${dow}`)
    .waitForHydration()

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
      .waitForHydration()

      .intercept(
        'GET',
        '*coords=&search=&page=*&order=recent&actionId=more&_data=routes*'
      )
      .as('seeMore')

      .get('#see-more')
      .click()

      .wait('@seeMore')
      .waitForHydration()

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

      .pickOptionFromSelect('sport', sport, true)

      .get('#apply-filters')
      .click({ force: true })

      .wait('@applyFilters')
      .waitForHydration()

      .get('#see-more')
      .click()

      .wait('@seeMore')
      .waitForHydration()

      .get('div[data-cy=group-entry]')
      .should('have.length', length)

      .get('#see-more')
      .should('not.exist');
  } else {
    cy.visitAndWaitForHydration('/')

      .get(`[data-cy=${sport}]`)
      .click()

      .wait('@selectSport')
      .waitForHydration()

      .get('div[data-cy=group-entry]')
      .should('have.length', length)

      .get('#see-more')
      .should('not.exist')

      .visitAndWaitForHydration(
        '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
      )

      .get('button[name=filters]')
      .click()

      .pickOptionFromSelect('sport', sport, true)

      .get('#apply-filters')
      .click({ force: true })

      .wait('@applyFilters')
      .waitForHydration()

      .get('div[data-cy=group-entry]')
      .should('have.length', length)

      .get('#see-more')
      .should('not.exist');
  }
}

function checkGroupsBySpirit(filterOption: number, spirit: string) {
  cy.intercept('GET', '/*?coords=*_data=routes*')
    .as('search')
    .visitAndWaitForHydration('/')

    .get('#search-button')
    .click()

    .wait('@search')
    .waitForHydration()

    .get('button[name=filters]')
    .click()

    .get(`#spirit-${filterOption}`)
    .click({ force: true })

    .get('#apply-filters')
    .click({ force: true })

    .wait('@search')

    .url()
    .should('include', `spirit=${filterOption}`)
    .waitForHydration()

    .get('div[data-cy=group-spirit]')
    .should('contain', spirit);
}
