describe('Search', () => {
  before(() => {
    cy.task('db:reset');
  });

  context('General', () => {
    it('should load groups', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .visitAndWaitForHydration('/')

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

        .get('#search-box')
        .type('Porto', { delay: 1 })

        .wait('@mapBoxSearchResult')

        .get('ul[data-headlessui-state="open"] li:first')
        .click()

        .get('#search-button')
        .click({ force: true })

        .wait('@search')
        .waitForHydration()

        .get('div[data-cy=group-entry]')
        .should('have.length', 2);
    });

    it('should redirect to create group: authenticated', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .login()
        .visitAndWaitForHydration('/')

        .get('#search-button')
        .click()

        .wait('@search')
        .waitForHydration()

        .url()
        .should(
          'include',
          '/?coords=&search=&page=0&dow=&sport=&g=&actionId=search'
        )

        .get('#create-your-group')
        .click()

        .waitForHydration()

        .url()
        .should('include', `${Cypress.config().baseUrl}/g/group/`);
    });

    it('should favorite a group unauthenticated: login', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .visitAndWaitForHydration('/?actionId=search&sport=6')

        .intercept('GET', '/login?a=favorite&g=*_data=routes*')
        .as('loadLoginPage')

        .get('#add-favorite-05b72760f9674a2abdcc')
        .click()

        .wait('@loadLoginPage')
        .waitForHydration()

        .get('[name=email]')
        .type('regular@gmail.com', { delay: 1 })

        .get('[name=password]')
        .type('Password1', { delay: 1 })

        .intercept('POST', '/login*')
        .as('login')

        .get('button[name=login]')
        .click()

        .wait('@login')
        .waitForHydration()

        .url()
        .should('eq', `${Cypress.config().baseUrl}/`)

        .visitAndWaitForHydration('/g/groups')

        .get('button[name=groupId]')
        .should('have.length', 2);
    });

    it('should favorite a group unauthenticated: signup', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .visitAndWaitForHydration('/?actionId=search&sport=6')

        .intercept('GET', '/login?*_data=routes*')
        .as('loginPage')

        .get('#add-favorite-05b72760f9674a2abdcc')
        .click()

        .wait('@loginPage')

        .intercept('GET', '/signup?*_data=routes*')
        .as('signupPage')

        .get('#create-account')
        .click()

        .wait('@signupPage')
        .waitForHydration()

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
        .waitForHydration()

        .visitAndWaitForHydration('/g/groups')

        .get('button[name=groupId]')
        .should('have.length', 1);
    });

    it('should copy to clipboard', { browser: 'chrome' }, () => {
      cy.wrap(
        Cypress.automation('remote:debugger:protocol', {
          command: 'Browser.grantPermissions',
          params: {
            permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
            origin: window.location.origin
          }
        })
      ).then(() => {
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
    });

    it('should have whatsapp link', () => {
      cy.intercept('GET', '/?actionId=search*_data=routes*')
        .as('selectSport')
        .visitAndWaitForHydration('/')

        .get('[data-cy=4]')
        .click()

        .wait('@selectSport')
        .waitForHydration()

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
        .waitForHydration()

        .intercept('GET', '/login?a=*_data=routes*')
        .as('whatsappLink')

        .get('#whatsapp-GkoxmH5db6RXqBpExion')
        .should('be.visible')
        .click()

        .wait('@whatsappLink')
        .waitForHydration()

        .get('input[name=email]')
        .type('abcd@gmail.com')

        .intercept('GET', '/?actionId=*message=*_data=routes*')
        .as('sendEmail')

        .get('button[name=login]')
        .click()

        .wait('@sendEmail');
    });

    it('should order by closest location', () => {
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
        .waitForHydration()

        .url()
        .should('include', '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search')

        .get('#sort-location')
        .click()

        .wait('@order')
        .waitForHydration()

        .url()
        .should('include', '/?coords=&search=&page=0&dow=&sport=&g=&order=proximity&actionId=sort')

        .get('#sort-location')
        .click()

        .wait('@order')
        .waitForHydration()

        .reload()
        .waitForHydration()

        .url()
        .should('include', '/?coords=&search=&page=0&dow=&sport=&g=&order=proximity&actionId=sort')

        .get('div[data-cy=distance]')
        .should('exist').and('have.length', 10)

        // Check if the values are correct
        .get('div[data-cy=distance]:nth(0)').should('contain', '10 km')
        .get('div[data-cy=distance]:nth(1)').should('contain', '12 km')
        .get('div[data-cy=distance]:nth(2)').should('contain', '42 km')
        .get('div[data-cy=distance]:nth(3)').should('contain', '46 km')
        .get('div[data-cy=distance]:nth(4)').should('contain', '46 km')
        .get('div[data-cy=distance]:nth(5)').should('contain', '46 km')
        .get('div[data-cy=distance]:nth(6)').should('contain', '51 km')
        .get('div[data-cy=distance]:nth(7)').should('contain', '57 km')
        .get('div[data-cy=distance]:nth(8)').should('contain', '65 km')
        .get('div[data-cy=distance]:nth(9)').should('contain', '71 km');
    });

    context('Test all filters', () => {
      it('should hide groups', () => {
        cy.intercept('GET', '*g=hide*')
          .as('applyFilters')
          .visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          )

          .get('button[name=filters]')
          .click()

          .get('#g-hide')
          .click({ force: true })

          .get('#apply-filters')
          .click({ force: true })

          .wait('@applyFilters')

          .waitForHydration()

          .url()
          .should('include', 'g=hide')

          .get('[data-cy=event-entry]')
          .should('have.length', 2);
      });

      it('should return Morning groups', () => {
        cy.visitAndWaitForHydration(
          '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
        )

          // Morning groups < 12H:00min
          .get('button[name=filters]')
          .click()

          .get('#daypart-Morning')
          .click()

          .get('#apply-filters')
          .click({ force: true })

          .waitForHydration()

          .location()
          .should((loc) => {
            expect(loc.search).to.contain('daypart=Morning');
            expect(loc.pathname).to.eq('/');
          })

          .get('#see-more')
          .click()

          .location()
          .should((loc) => {
            expect(loc.search).to.contain('page=0');
            expect(loc.pathname).to.eq('/');
          })
          .waitForHydration()

          .get('#see-more')
          .click()

          .location()
          .should((loc) => {
            expect(loc.search).to.contain('page=1');
            expect(loc.pathname).to.eq('/');
          })
          .waitForHydration()

          .get('[data-cy=group-schedule]')
          .should('have.length', 21);
      });

      it('should return Afternoon groups', () => {
        cy.visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          )

          // Afternoon groups > 13H:00min and < 20H:00min
          .get('button[name=filters]')
          .click()

          .get('#daypart-Afternoon')
          .click()

          .get('#apply-filters')
          .click({ force: true })

          .waitForHydration()

          .location()
          .should((loc) => {
            expect(loc.search).to.contain('daypart=Afternoon');
            expect(loc.pathname).to.eq('/');
          })

          .get('#see-more')
          .click()

          .location()
          .should((loc) => {
            expect(loc.search).to.contain('page=0');
            expect(loc.pathname).to.eq('/');
          })
          .waitForHydration()

          .get('[data-cy=group-schedule]')
          .should('have.length', 13);
      });

      it('should return Evening groups', () => {
        cy.visitAndWaitForHydration(
            '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
          )

          // Night groups > 20H:00min and < 23H:00min
          .get('button[name=filters]')
          .click()

          .get('#daypart-Evening')
          .click()

          .get('#apply-filters')
          .click({ force: true })

          .waitForHydration()

          .location()
          .should((loc) => {
            expect(loc.search).to.contain('daypart=Evening');
            expect(loc.pathname).to.eq('/');
          })

          .get('[data-cy=group-schedule]')
          .should('have.length', 5);
      });

      it('should return groups from each day of the week', () => {
        cy.visitAndWaitForHydration(
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

      context('should keep filters after new search', () => {
        // Switch Day of the Week and Sport, since they are combo box's and need to be tested 1 by 1
        // and repeat the process all over again

        it('Sunday - Running', () => {
          checkAllFiltersAndSelectDOWAndSport(1, 6);
        });

        it('Monday - Trail', () => {
          checkAllFiltersAndSelectDOWAndSport(2, 0);
        });

        it('Tuesday - Road', () => {
          checkAllFiltersAndSelectDOWAndSport(3, 1);
        });

        it('Wednesday - BTT', () => {
          checkAllFiltersAndSelectDOWAndSport(4, 2);
        });

        it('Thursday - E-Bike', () => {
          checkAllFiltersAndSelectDOWAndSport(5, 3);
        });

        it('Friday - Gravel', () => {
          checkAllFiltersAndSelectDOWAndSport(6, 4);
        });

        it('Saturday - Enduro', () => {
          checkAllFiltersAndSelectDOWAndSport(7, 5);
        });
      });

      context('should return groups from each sport', () => {

        it('Running', () => {
          checkGroupsBySport(1, 3);
        });

        it('Trail', () => {
          checkGroupsBySport(2, 12);
        });

        it('Road', () => {
          checkGroupsBySport(3, 5);
        });

        it('BTT', () => {
          checkGroupsBySport(4, 7);
        });

        it('E-Bike', () => {
          checkGroupsBySport(5, 3);
        });

        it('Gravel', () => {
          checkGroupsBySport(6, 5);
        });

        it('Enduro', () => {
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

      .location()
      .should((loc) => {
        expect(loc.search).to.contain(`sport=${sport}`);
        expect(loc.pathname).to.eq('/');
      })
      .waitForHydration()

      .get('#see-more')
      .click()

      .location()
      .should((loc) => {
        expect(loc.search).to.contain('page=0');
        expect(loc.pathname).to.eq('/');
      })
      .waitForHydration()

      .url()
      .should('include', 'actionId=more')

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

      .get('#apply-filters')
      .click({ force: true })

      .location()
      .should((loc) => {
        expect(loc.search).to.contain(`sport=${sport}`);
        expect(loc.pathname).to.eq('/');
      })
      .waitForHydration()

      .get('#see-more')
      .click()

      .location()
      .should((loc) => {
        expect(loc.search).to.contain('page=0');
        expect(loc.pathname).to.eq('/');
      })
      .waitForHydration()

      .get('div[data-cy=group-entry]')
      .should('have.length', length)

      .get('#see-more')
      .should('not.exist');
  } else {
    cy.visitAndWaitForHydration('/')

      .get(`[data-cy=${sport}]`)
      .click()

      .location()
      .should((loc) => {
        expect(loc.search).to.contain(`sport=${sport}`);
        expect(loc.pathname).to.eq('/');
      })
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

      .pickOptionFromSelect('sport', sport)

      .get('#apply-filters')
      .click({ force: true })

      .location()
      .should((loc) => {
        expect(loc.search).to.contain(`sport=${sport}`);
        expect(loc.pathname).to.eq('/');
      })
      .waitForHydration()

      .get('div[data-cy=group-entry]')
      .should('have.length', length)

      .get('#see-more')
      .should('not.exist');
  }
}

function checkGroupsBySpirit(filterOption: number, spirit: string) {
  cy.visitAndWaitForHydration('/?coords=&search=&page=0&dow=&sport=&g=&actionId=search')

    .get('button[name=filters]')
    .click()

    .get(`#spirit-${filterOption}`)
    .click({ force: true })

    .get('#apply-filters')
    .click({ force: true })

    .url()
    .should('include', `spirit=${filterOption}`)
    .waitForHydration()

    .get('div[data-cy=group-spirit]')
    .should('contain', spirit);
}

function checkAllFiltersAndSelectDOWAndSport(
  filterOption: number,
  dow: number
) {
  cy.visitAndWaitForHydration(
    '/?index=&coords=&search=&page=0&sport=&dow=&value=&actionId=search'
  )

    .get('button[name=filters]')
    .click()

    .pickOptionFromSelect('dow', filterOption)
    .pickOptionFromSelect('sport', filterOption)

    .get('#daypart-Morning')
    .click()
    .get('#daypart-Afternoon')
    .click()
    .get('#daypart-Evening')
    .click()

    .get('#spirit-1')
    .click({ force: true })
    .get('#spirit-2')
    .click({ force: true })
    .get('#spirit-3')
    .click({ force: true })
    .get('#spirit-4')
    .click({ force: true })
    .get('#spirit-5')
    .click({ force: true })

    .get('#apply-filters')
    .click({ force: true })

    .url()
    .should('include', `sport=${filterOption}&dow=${dow}`)

    .get('#search-button')
    .click({ force: true })

    .location()
    .should((loc) => {
      expect(loc.search).to.contain(`sport=${filterOption}`);
      expect(loc.search).to.contain(`dow=${dow}`);
    })
    .waitForHydration()

    // After a new search, check URL to see if it all previous selected filters
    .url()
    .should(
      'include',
      `/?coords=&search=&page=0&dow=${dow}&sport=${filterOption}&daypart=Morning&daypart=Afternoon&daypart=Evening&spirit=1&spirit=2&spirit=3&spirit=4&spirit=5`
    );
}
