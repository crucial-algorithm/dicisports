describe('Checkout', () => {
  before(() => {
    cy.task('db:reset');
    cy.task('clearDownloadFolder');
  });

  context('Maintenance: unauthenticated', () => {
    beforeEach(() => {
      cy.task('db:reset');
    });

    it('Should add race to cart and redirect to form route from event page', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
        .click()

        .wait('@selectRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        });
    });

    it('Should remove race', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
        .click()

        .wait('@selectRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('[data-cy=update-cart]')
        .should('exist')

        .click({ force: true })

        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/checkout/cart/MY4bvgxDbMtGv8rbYe5d');
          expect(l.search).to.contain('a=update');
        })

        .intercept(
          'POST',
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d?a=update*&_data=routes*checkout*'
        )
        .as('removeParticipant')

        .get('#remove-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@removeParticipant')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qty]')
        .contains('0')

        .get('#checkout')
        .should('have.prop', 'disabled');
    });

    it('Should fill form and save participant', () => {
      registerParticipant('MY4bvgxDbMtGv8rbYe5d', 'AhowRdNWCBQWSuivSt7h');
    });

    it('should contain right amount of races', () => {
      cy.visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()
        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qty]')
        .contains(1)

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()
        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qty]')
        .contains(2)

        .get('#checkout')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('[data-cy=participant]')
        .should('have.length', 2);
    });

    it('should not exist list of participants if there is only one', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')
        .waitForHydration()

        .get('[data-cy=participant]')
        .should('not.exist');
    });

    it('should be able to update cart', () => {
      cy.intercept(
        'GET',
        '/checkout/cart/MY4bvgxDbMtGv8rbYe5d*?_data=routes*checkout*'
      )
        .as('selectRace')

        .intercept(
          'POST',
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d*?_data=routes*checkout*'
        )
        .as('addRace')

        .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@addRace')
        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@addRace')

        .waitForHydration()

        .url()
        .should('include', '/checkout/info/')

        .intercept(
          'POST',
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d?a=update*?_data=routes*'
        )
        .as('addParticipant')

        .get('[data-cy=update-cart]')
        .should('exist')

        .click({ force: true })

        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/checkout/cart/MY4bvgxDbMtGv8rbYe5d');
          expect(l.search).to.contain('a=update');
        })

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@addParticipant')

        .get('#checkout')
        .click()

        .waitForHydration()

        .get('[data-cy=participant]')
        .should('exist')
        .and('have.length', 2);
    });

    it('should remove race participant', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')
        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/checkout/cart/MY4bvgxDbMtGv8rbYe5d');
        })

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')
        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/checkout/cart/MY4bvgxDbMtGv8rbYe5d');
        })

        .intercept('GET', '*?data=routes*info*')
        .as('registrationsCheckout')

        .get('#checkout')
        .click()

        .wait('@registrationsCheckout')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .intercept('POST', '/checkout/manage*?_data=routes*')
        .as('removeParticipant')

        .get('[data-cy=participant]')
        .first()
        .click()

        .get('button[name=remove]')
        .click()

        .wait('@removeParticipant')

        .get('[data-cy=participant]')
        .should('not.exist');
    });

    it('should redirect to cart if last race participant is removed', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')

        .intercept(
          'POST',
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d?a=update*?_data=routes*'
        )
        .as('removeParticipant')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })
        .then((l) => {
          const bookingId = l.pathname.split('/')[3];

          cy.get('[data-cy=update-cart]')
            .click({ force: true })

            .waitForHydration()

            .location()
            .should((l) => {
              expect(l.pathname).to.eq('/checkout/cart/MY4bvgxDbMtGv8rbYe5d');
              expect(l.search).to.contain('a=update');
            })

            .get('#remove-race-AhowRdNWCBQWSuivSt7h')
            .click()

            .wait('@removeParticipant')

            .get('#checkout')
            .should('be.disabled')

            .visitAndWaitForHydration(`/checkout/info/${bookingId}`)

            .location()
            .should((l) => {
              expect(l.pathname).to.eq('/checkout/cart/MY4bvgxDbMtGv8rbYe5d');
            });
        });
    });

    it('should show validation error if there are registrations with empty participant info - missing participants', () => {
      cy.intercept('GET', '/checkout/cart/*?_data=routes*checkout*')
        .as('selectRace')

        .intercept('GET', '/checkout/info/*?_data=routes*checkout*')
        .as('checkout')

        .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@checkout')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('input[data-cy=regulation]')
        .click()

        .get('input[data-cy=terms]')
        .click()

        .get('#checkout')
        .click()

        .wait('@checkout')
        .waitForHydration()

        .get('#checkout-error')
        .should('exist');
    });

    it('should show validation error if there are registrations with empty participant info - terms and conditions', () => {
      cy.intercept('GET', '/checkout/cart/*?_data=routes*checkout*')
        .as('selectRace')

        .intercept('GET', '/checkout/info/*?_data=routes*checkout*')
        .as('checkout')

        .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@checkout')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('#checkout')
        .click()

        .wait('@checkout')
        .waitForHydration()

        .get('#terms-error')
        .should('exist');
    });

    it.skip('should book a race', () => {
      bookParticipant('MY4bvgxDbMtGv8rbYe5d', 'AhowRdNWCBQWSuivSt7h');
    });

    it.skip('should be able to authenticate and keep booking after completing booking process', () => {
      bookParticipant('bQmGXYkbhJetjk6mniMt', 'Rd9SETi59X9ava6CPhkY')
        .get('[data-cy=authenticate]')
        .should('exist')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/login');
          expect(l.search).to.contain('a=checkout&b=');
        })

        .get('body[data-cy=ready]')

        .get('[name=email]')
        .type('regular@gmail.com', { delay: 10 })

        .get('[name=password]')
        .type('Password1', { delay: 10 })

        .intercept('POST', '/login?*')
        .as('login')

        .get('button[name=login]')
        .click()

        .wait('@login')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/confirmation/');
        });
    });

    it.skip('should send automated email after completing booking', () => {
      bookParticipant('MY4bvgxDbMtGv8rbYe5d', 'AhowRdNWCBQWSuivSt7h');
      cy.get('input[name=email]')
        .type('asd@gmail.com')

        .intercept('POST', '/checkout/confirmation/*')
        .as('SendEmail')

        .get('button[name=send-confirmation]')
        .click()

        .wait('@SendEmail')

        .request({ method: 'GET', url: Cypress.env('HTTP_CATCHER') })
        .then(({ body }) => {
          expect(body.to).to.eq('asd@gmail.com');
          expect(body.subject).to.eq(
            'Informações do teu booking no evento Love Tiles Douro Granfondo 2023.'
          );
        });
    });

    it('should access booking with PIN', () => {
      cy.visitAndWaitForHydration('/checkout/info/e8pHPLNjnNxKTzoGwtLh?p=1234')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/checkout/info/e8pHPLNjnNxKTzoGwtLh');
          expect(l.search).to.eq('?p=1234');
        })

        .get('[data-cy=total-price]')
        .should('exist')
        .and('contain', '20€');
    });
  });

  context('Maintenance: authenticated', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.login();
    });

    it.skip('Should add race to cart and redirect to form route from event page', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/event/trail-do-zezere')

        .get('button[name=race-Rd9SETi59X9ava6CPhkY]')
        .click()

        .wait('@selectRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        });
    });

    it.skip('Should add/remove race', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/checkout/cart/bQmGXYkbhJetjk6mniMt')

        .get('#add-race-Rd9SETi59X9ava6CPhkY')
        .click()

        .wait('@selectRace')

        .get('[data-cy=race-Rd9SETi59X9ava6CPhkY-qty]')
        .contains('1')

        .get('#remove-race-Rd9SETi59X9ava6CPhkY')
        .click()

        .wait('@selectRace')

        .get('[data-cy=race-Rd9SETi59X9ava6CPhkY-qty]')
        .contains('0');
    });

    it.skip('Should fill form and save participant', () => {
      registerParticipant('bQmGXYkbhJetjk6mniMt', 'Rd9SETi59X9ava6CPhkY');
    });

    it.skip('should contain right amount of races', () => {
      cy.visitAndWaitForHydration('/checkout/cart/bQmGXYkbhJetjk6mniMt')

        .get('#add-race-Rd9SETi59X9ava6CPhkY')
        .click()
        .get('[data-cy=race-Rd9SETi59X9ava6CPhkY-qty]')
        .contains(1)

        .get('#add-race-Rd9SETi59X9ava6CPhkY')
        .click()
        .get('[data-cy=race-Rd9SETi59X9ava6CPhkY-qty]')
        .contains(2)

        .get('#checkout')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('[data-cy=participant]')
        .should('have.length', 2);
    });

    it('should fill form with saved participant info', () => {
      cy.intercept(
        'POST',
        '/checkout/cart/gLqrDfMx6qkTHn6hoZqA*?_data=routes*checkout*'
      )
        .as('addRace')

        .visitAndWaitForHydration('/checkout/cart/gLqrDfMx6qkTHn6hoZqA')

        .login()

        .get('#add-race-LoDjLz7dWQTWk6Th4dRC')
        .click()

        .wait('@addRace')

        .get('#checkout')
        .click()

        .wait('@addRace')

        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('button[name=select-userSavedParticipants]')
        .should('exist')
        .pickOptionFromSelect('userSavedParticipants', 1)

        .get('input[name=first-name]')
        .should('have.length.at.least', 1)

        .get('input[name=last-name]')
        .should('have.length.at.least', 1)
        .and('have.value', 'Lopes');
    });

    it.skip('should book a race', () => {
      bookParticipant('bQmGXYkbhJetjk6mniMt', 'Rd9SETi59X9ava6CPhkY');
    });

    it.skip('should send automated email after completing booking', () => {
      bookParticipant('bQmGXYkbhJetjk6mniMt', 'Rd9SETi59X9ava6CPhkY');
      cy.request({ method: 'GET', url: Cypress.env('HTTP_CATCHER') }).then(
        ({ body }) => {
          expect(body.subject).to.eq(
            'Informações do teu booking no evento Trail do Zêzere.'
          );
        }
      );
    });
  });

  context('Security', () => {
    it('should not access info/payment/confirmation route without a booking', () => {
      cy.visitAndWaitForHydration('/checkout/info/MY4bvgxDbMtGv8rbYe5d')
        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/');
        })

        .visitAndWaitForHydration('/checkout/payment/MY4bvgxDbMtGv8rbYe5d')
        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/');
        })

        .visitAndWaitForHydration('/checkout/confirmation/MY4bvgxDbMtGv8rbYe5d')
        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/');
        });
    });

    it.skip('should not allow user to pay if he does not accept terms and conditions', () => {
      cy.login()

        .visitAndWaitForHydration('/checkout/payment/HJtAk2sSktodKez744mt')

        .intercept('POST', '/checkout/payment/HJtAk2sSktodKez744mt*')
        .as('pay')

        .get('button[name=pay]')
        .click()

        .wait('@pay')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/checkout/payment/HJtAk2sSktodKez744mt');
        })

        .get('#terms-error')
        .should('exist');
    });

    it.skip('should have link to Event regulation and Dici terms', () => {
      cy.login()

        .visitAndWaitForHydration('/checkout/payment/HJtAk2sSktodKez744mt')

        .get('[data-cy=terms-link]')
        .should('exist')
        .then((link) => {
          cy.request(link.prop('href'))
            .its('status')
            .should('eq', 200)

            .request(link.prop('href'))
            .its('body')
            .should('include', 'Termos e Condições');
        })

        .get('[data-cy=regulation-link]')
        .should('exist')
        .then((link) => {
          cy.request(link.prop('href'))
            .its('status')
            .should('eq', 200)

            .request(link.prop('href'))
            .its('body')
            .should('include', 'Regulamento');
        });
    });

    it('should not add participant if booking is already confirmed', () => {
      cy.login()
        .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .get('#add-race-AhowRdNWCBQWSuivSt7s')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/checkout/confirmation/e8pHPLNjnNxKTzoGwtLh');
        });
    });
  });
});

function registerParticipant(eventId: string, raceId: string) {
  cy.intercept('GET', '*?_data=routes*checkout*')
    .as('selectRace')

    .visitAndWaitForHydration(`/checkout/cart/${eventId}`)

    .get(`#add-race-${raceId}`)
    .click()
    .get(`[data-cy=race-${raceId}-qty]`)
    .contains(1)

    .wait('@selectRace')
    .waitForHydration()

    .get(`#add-race-${raceId}`)
    .click()
    .get(`[data-cy=race-${raceId}-qty]`)
    .contains(2)

    .wait('@selectRace')
    .waitForHydration()

    .get('#checkout')
    .click()

    .wait('@selectRace')
    .waitForHydration()

    .get('div[data-cy=participant-1]')
    .click()

    .get('input[name=first-name]')
    .type('Nuno')

    .get('input[name=last-name]')
    .type('Lopes')

    .pickOptionFromSelect('gender', 2)

    .pickDate('birthdate', '2001-09-21')

    .get('input[name=phone-number]')
    .type('937654321')

    .get('input[name=identity-card]')
    .type('987654321')

    .get('input[name=federation-number]')
    .type('8165238')

    .pickOptionFromSelect('shirt', 2)

    .pickOptionFromSelect('nationality', 188)

    .get('input[name=postal-code]')
    .type('4730-454')

    .intercept('POST', '*?_data=routes*checkout*')
    .as('saveParticipant')

    .get('#save-button')
    .click()

    .wait('@saveParticipant')
    .waitForHydration()

    .reload()
    .waitForHydration()

    .get('input[name=first-name]')
    .should('have.value', 'Nuno');
}

function bookParticipant(eventId: string, raceId: string) {
  return cy
    .intercept('GET', '*?_data=routes*checkout*')
    .as('selectRace')

    .visitAndWaitForHydration(`/checkout/cart/${eventId}`)

    .location()
    .should((loc) => {
      expect(loc.pathname).to.eq(`/checkout/cart/${eventId}`);
    })

    .get(`#add-race-${raceId}`)
    .click()

    .wait('@selectRace')

    .get('#checkout')
    .click()

    .wait('@selectRace')

    .location()
    .should((l) => {
      expect(l.pathname).to.include('/checkout/info/');
    })
    .then((l) => {
      const bookingId = l.pathname.split('/')[3];

      cy.get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .pickDate('birthdate', '2001-09-21')

        .get('input[name=phone-number]')
        .type('937654321')

        .get('input[name=identity-card]')
        .type('987654321')

        .get('input[name=federation-number]')
        .type('8165238')

        .pickOptionFromSelect('shirt', 2)

        .pickOptionFromSelect('nationality', 188)

        .get('input[name=postal-code]')
        .type('4730-454')

        .intercept('POST', '*?_data=routes*checkout*')
        .as('saveParticipant')

        .get('#save-button')
        .click()

        .wait('@saveParticipant')

        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq(`/checkout/payment/${bookingId}`);
        })

        .get('input[name=regulation]')
        .click()
        .get('input[name=terms]')
        .click()

        .get('button[name=pay]')
        .click()

        .get('[data-cy=waiting-payment-confirmation')
        .should('exist');
    });
}
