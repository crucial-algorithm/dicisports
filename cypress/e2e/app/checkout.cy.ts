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
      cy.waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/confirmation/');
        })

        .get('input[name=email]')
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

    // TODO: finish test as soon as we re-instate booking payment flow e2e tests
    it.skip('should display checkbox for organizer campaign and corresponding validations', () => {});

    it('should display current booked teams', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .location()
        .should((loc) => {
          expect(loc.pathname).to.eq('/checkout/cart/MY4bvgxDbMtGv8rbYe5d');
        })

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('button[name=creatable-button]')
        .should('exist')
        .click()

        .get('ul[data-headlessui-state="open"] li:first')
        .contains('Individual')

        .get('ul[data-headlessui-state="open"] li')
        .eq(1)
        .contains('Amigos do BTT de Barcelos');
    });

    it('should display cta to add team if it does not exist', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .location()
        .should((loc) => {
          expect(loc.pathname).to.eq('/checkout/cart/MY4bvgxDbMtGv8rbYe5d');
        })

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('#creatable-team')
        .clear()
        .type('Marretas')

        .get('ul[data-headlessui-state="open"] li:first')
        .contains('Criar: Marretas');
    });

    it('should save team', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

        .location()
        .should((loc) => {
          expect(loc.pathname).to.eq('/checkout/cart/MY4bvgxDbMtGv8rbYe5d');
        })

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

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
        .type('87654321')

        .get('input[name=federation-number]')
        .type('8165238')

        .get('#creatable-team')
        .clear()
        .type('Marretas')

        .get('ul[data-headlessui-state="open"] li:first')
        .contains('Criar: Marretas')
        .click()

        .pickOptionFromSelect('shirt', 2)

        .pickOptionFromSelect('nationality', 188)

        .get('input[name=postal-code]')
        .type('4730-454')

        .intercept('POST', '*?_data=routes*checkout*')
        .as('saveParticipant')

        .get('#save-button')
        .click()

        .wait('@saveParticipant')
        .reload()
        .waitForHydration()

        .get('div[data-cy=participant-2]')
        .click()

        .get('#creatable-team')
        .clear()
        .type('Marretas')

        .get('ul[data-headlessui-state="open"] li:first')
        .contains('Marretas');
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
        .and('have.value', 'Rego');
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

    it('should display error when submitting form without indetity card filled', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/event/trail-do-zezere')

        .get('button[name=race-Rd9SETi59X9ava6CPhkY]')
        .click()

        .wait('@selectRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .intercept('POST', '*?_data=routes*checkout*')
        .as('saveParticipant')

        .get('#save-button')
        .click()

        .wait('@saveParticipant')

        .get('#identity-card-error')
        .should('exist');
    });

    it('should have correct bib numbers', () => {
      cy.intercept('GET', '/payment-status/*')
        .as('GetPaymentStatus')

        .visitAndWaitForHydration('/checkout/payment/qR4nqWpTdQy8QZu29ANu')

        .get('button[name=pay-reference]')
        .should('exist')
        .then((b) => {
          b.click();
        })

        .waitForHydration()
        .location()
        .should((l) => {
          expect(l.pathname).to.eq(
            '/checkout/confirmation/qR4nqWpTdQy8QZu29ANu'
          );
        })

        // Logging in as Organiser to check if bib numbers where assigned
        .loginOrganizer()

        .reload()
        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/');
        })

        .visitAndWaitForHydration('/o/event/5n8epZbHczqAQtQaAh5R/dashboard')

        .get('#participant-b2ytMsXPtQMcLxfLJyQm > td')
        .eq(4)
        .contains('Confirmado')

        .get('#participant-b2ytMsXPtQMcLxfLJyQm > td')
        .eq(5)
        .should('contain', '1');
    });

    it.skip('should have correct bib numbers after updating initial bib number', () => {
      // Update initial bib number
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/event/5n8epZbHczqAQtQaAh5R')

        .get('input[name=bib-number]')
        .should('exist')
        .clear()
        .type('20')

        .intercept('POST', '/o/event/5n8epZbHczqAQtQaAh5R*')
        .as('UpdateEvent')

        .get('button[name=update-event]')
        .click()

        .wait('@UpdateEvent')

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/o/event/5n8epZbHczqAQtQaAh5R');
        })

        // login as regular to finish booking process
        .login()
        .reload()
        .waitForHydration()

        .location()
        .should((loc) => {
          expect(loc.pathname).to.contain('/');
        })

        .intercept('GET', '/payment-status/*')
        .as('GetPaymentStatus')

        .visitAndWaitForHydration('/checkout/payment/qR4nqWpTdQy8QZu29ANu')

        .get('button[name=pay]')
        .should('exist')

        .click()

        .location()
        .then((l) => {
          if (l.pathname === '/checkout/payment/qR4nqWpTdQy8QZu29ANu') {
            cy.get('.sibs > h5')
              .should('exist')
              .and('contain', 'Pagamento por Multibanco ou Homebanking')

              .wait('@GetPaymentStatus');
          }
        })

        .waitForHydration()
        .location()
        .should((l) => {
          expect(l.pathname).to.eq(
            '/checkout/confirmation/qR4nqWpTdQy8QZu29ANu'
          );
        })

        // Logging in as Organiser to check if bib numbers where assigned
        .loginOrganizer()

        .reload()
        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/');
        })

        .visitAndWaitForHydration('/o/event/5n8epZbHczqAQtQaAh5R/dashboard')

        .get('#participant-b2ytMsXPtQMcLxfLJyQm > td')
        .eq(4)
        .contains('Confirmado')

        .get('#participant-b2ytMsXPtQMcLxfLJyQm > td')
        .eq(5)
        .should('contain', '20');
    });

    it('should display checkbox to enroll in organizer mailing list', () => {
      cy.intercept('GET', '/checkout/cart/*?_data=routes*checkout*')
        .as('selectRace')

        .intercept('GET', '/checkout/info/*?_data=routes*checkout*')
        .as('checkout')

        .visitAndWaitForHydration('/checkout/cart/bQmGXYkbhJetjk6mniMt')

        .get('#add-race-Rd9SETi59X9ava6CPhkY')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@checkout')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('input[name=add-to-mail-list]')
        .first()
        .should('exist')
        .and('be.visible')
        .click()

        .get('input[name=add-to-mail-list]')
        .should('be.checked');
    });

    it('should apply discount', () => {
      cy.intercept('POST', '/checkout/payment/qR4nqWpTdQy8QZu29ANu*')
        .as('ApplyDiscount')

        .visitAndWaitForHydration('/checkout/payment/qR4nqWpTdQy8QZu29ANu')

        .get('input[name=discount-code]')
        .clear()
        .type('GET-FIT-5')

        .get('#apply-discount')
        .click()

        .wait('@ApplyDiscount')

        .get('[data-cy=total-price]')
        .contains('40€');
    });

    it('should show applied discount information', () => {
      cy.intercept('POST', '/checkout/payment/qR4nqWpTdQy8QZu29ANu*')
        .as('ApplyDiscount')

        .visitAndWaitForHydration('/checkout/payment/qR4nqWpTdQy8QZu29ANu')

        .get('input[name=discount-code]')
        .clear()
        .type('GET-FIT-5')

        .get('#apply-discount')
        .click()

        .wait('@ApplyDiscount')

        .get('div[data-cy=discount-info]')
        .should('exist')

        .get('[data-cy=subtotal-price]')
        .contains('45€');
    });

    it('should show 0€ when applying 100% discount', () => {
      cy.intercept('POST', '/checkout/payment/qR4nqWpTdQy8QZu29ANu*')
        .as('ApplyDiscount')

        .visitAndWaitForHydration('/checkout/payment/qR4nqWpTdQy8QZu29ANu')

        .get('input[name=discount-code]')
        .clear()
        .type('GET-FIT-100%')

        .get('#apply-discount')
        .click()

        .wait('@ApplyDiscount')

        .get('div[data-cy=discount-info]')
        .should('exist')

        .get('[data-cy=subtotal-price]')
        .contains('45€')

        .get('[data-cy=total-price]')
        .contains('0€');
    });

    it('should not be able to update booking when having an ongoing payment', () => {
      const formData = new FormData();

      formData.append('actionId', 'update-info');

      cy.visitAndWaitForHydration('/checkout/payment/HJtAk2sSktodKez744mt')
        .get('#update-info')
        .should('not.exist')

        // We should also test for users trying to make a POST request searching for exploits
        .request({
          url: '/checkout/payment/HJtAk2sSktodKez744mt',
          method: 'POST',
          body: formData,
          // This prevents cypress from returning test as failed because of status 400
          failOnStatusCode: false
        })
        .then((res) => {
          // If he tries to do it while having an ongoing payment, we should return a bad request
          expect(res.status).to.eq(400);
        });
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
          expect(l.pathname).to.eq(
            '/checkout/confirmation/e8pHPLNjnNxKTzoGwtLh'
          );
        });
    });

    context('should not be able to update booking', () => {
      it('/info', () => {
        const formData = new FormData();

        cy.login()
          .request({
            url: '/checkout/info/e8pHPLNjnNxKTzoGwtLh',
            method: 'POST',
            body: formData
          })
          .then((l) => {
            expect(l.redirects[0]).to.include(
              '/checkout/confirmation/e8pHPLNjnNxKTzoGwtLh'
            );
          });
      });

      it('/payment', () => {
        const formData = new FormData();

        cy.login()
          .request({
            url: '/checkout/payment/e8pHPLNjnNxKTzoGwtLh',
            method: 'POST',
            body: formData
          })
          .then((l) => {
            expect(l.redirects[0]).to.include(
              '/checkout/confirmation/e8pHPLNjnNxKTzoGwtLh'
            );
          });
      });
    });
  });

  context('Payments Gateway', () => {
    beforeEach(() => {
      cy.task('db:reset');
    });

    it('Should keep booking state if payment fails (MBWay Rejected)', () => {
      const secret = Cypress.env('SIBS_WEBHOOK_SECRET');

      cy.wrap(null)
        .then(() =>
          encryptMessage(
            secret,
            JSON.stringify({
              token: {
                value: '351#931111111',
                tokenType: 'MobilePhone'
              },
              amount: {
                value: 1,
                currency: 'EUR'
              },
              merchant: {
                terminalId: 1111111,
                merchantName: 'CRUCIAL ALGORITHM - UNIPESSOAL LDA',
                transactionId: 'n6TRk6zAzWDjc3pKoxvN'
              },
              paymentType: 'PURS',
              returnStatus: {
                statusMsg: 'Declined',
                statusCode: '01.106.0001',
                statusDescription:
                  'After the operation was successful, was refused by the cardholder.'
              },
              paymentMethod: 'MBWAY',
              paymentStatus: 'Declined',
              transactionID: 'G8YzvKqT7xfXu37zdsDJ',
              notificationID: 'd787b6bc-09c1-4e9c-a9ed-3353e51d7b81',
              transactionDateTime: new Date().toISOString()
            })
          )
        )
        .then((payload) => {
          cy.request({
            url: '/wh/sibs',
            method: 'POST',
            body: payload.message,
            headers: {
              'x-authentication-tag': payload.at,
              'x-initialization-vector': payload.iv
            }
          }).then((response) => {
            cy.login()
              .visitAndWaitForHydration('/me')
              .get('td[data-cy=status-HJtAk2sSktodKez744mt')
              .contains('Pendente');
          });
        });
    });

    it('Should update booking state if payment succeeds (MBWAy Accepted)', () => {
      const secret = Cypress.env('SIBS_WEBHOOK_SECRET');

      cy.wrap(null)
        .then(() =>
          encryptMessage(
            secret,
            JSON.stringify({
              token: {
                value: '351#931111111',
                tokenType: 'MobilePhone'
              },
              amount: {
                value: 1,
                currency: 'EUR'
              },
              merchant: {
                terminalId: 1111111,
                merchantName: 'CRUCIAL ALGORITHM - UNIPESSOAL LDA',
                transactionId: 'n6TRk6zAzWDjc3pKoxvN'
              },
              paymentType: 'PURS',
              returnStatus: {
                statusMsg: 'Success',
                statusCode: '000'
              },
              paymentMethod: 'MBWAY',
              paymentStatus: 'Success',
              transactionID: 'G8YzvKqT7xfXu37zdsDJ',
              notificationID: '70293d16-c4ed-4da2-924a-f19c6c4e3f81',
              transactionDateTime: new Date().toISOString()
            })
          )
        )
        .then((payload) => {
          cy.request({
            url: '/wh/sibs',
            method: 'POST',
            body: payload.message,
            headers: {
              'x-authentication-tag': payload.at,
              'x-initialization-vector': payload.iv
            }
          }).then((response) => {
            cy.login()
              .visitAndWaitForHydration('/me')
              .get('td[data-cy=status-HJtAk2sSktodKez744mt')
              .contains('Confirmado');
          });
        });
    });

    it('should update booking state of an failed payment if we get a success call', () => {
      const secret = Cypress.env('SIBS_WEBHOOK_SECRET');

      cy.wrap(null)
        .then(() =>
          encryptMessage(
            secret,
            JSON.stringify({
              amount: {
                value: 10,
                currency: 'EUR'
              },
              merchant: {
                terminalId: 1000000,
                transactionId: '5h9g4ZFmcLhWJoZYt4oe'
              },
              paymentType: 'PURS',
              returnStatus: {
                statusMsg: 'Success',
                statusCode: '000'
              },
              paymentMethod: 'REFERENCE',
              paymentStatus: 'Success',
              transactionID: '5h9g4ZFmcLhWJoZYt4oe',
              notificationID: '9077ab06-586c-449e-ba8a-93ffac1c258e'
            })
          )
        )
        .then((payload) => {
          cy.request({
            url: '/wh/sibs/',
            method: 'POST',
            body: payload.message,
            headers: {
              'x-authentication-tag': payload.at,
              'x-initialization-vector': payload.iv
            }
          }).then(() => {
            cy.login()
              .visitAndWaitForHydration('/me')
              .get('td[data-cy=status-qR4nqWpTdQy8QZu29ANu]')
              .contains('Confirmado');
          });
        });
    });
    
    it('should update booking state of an failed expired if we get a success call', () => {
      const secret = Cypress.env('SIBS_WEBHOOK_SECRET');

      cy.wrap(null)
        .then(() =>
          encryptMessage(
            secret,
            JSON.stringify({
              amount: {
                value: 10,
                currency: 'EUR'
              },
              merchant: {
                terminalId: 1000000,
                transactionId: 'stXph3iqss9ZJPn2Nrdh'
              },
              paymentType: 'PURS',
              returnStatus: {
                statusMsg: 'Success',
                statusCode: '000'
              },
              paymentMethod: 'REFERENCE',
              paymentStatus: 'Success',
              transactionID: 'stXph3iqss9ZJPn2Nrdh',
              notificationID: '9077ab06-586c-449e-ba8a-93ffac1c258e'
            })
          )
        )
        .then((payload) => {
          cy.request({
            url: '/wh/sibs/',
            method: 'POST',
            body: payload.message,
            headers: {
              'x-authentication-tag': payload.at,
              'x-initialization-vector': payload.iv
            }
          }).then(() => {
            cy.loginOrganizer()
              .visitAndWaitForHydration(
                '/o/event/nGhb8Lu8xdg3oJk4N4g6/dashboard'
              )
              .get('#participant-fayTnrqT4dRg5KAH7HXz')
              .contains('Confirmado');
          });
        });
    });

    it('should not update booking state if payment is rejected (CCard Rejected)', () => {
      const secret = Cypress.env('SIBS_WEBHOOK_SECRET');

      cy.wrap(null)
        .then(() =>
          encryptMessage(
            secret,
            JSON.stringify({
              amount: {
                value: 45,
                currency: 'EUR'
              },
              merchant: {
                terminalId: 1000000,
                transactionId: '9Lgx42DbNj5nYHcC6iEb'
              },
              paymentType: 'PURS',
              returnStatus: {
                statusMsg: 'Declined',
                statusCode: '01.106.0001',
                statusDescription:
                  'After the operation was successful, was refused by the cardholder.'
              },
              paymentMethod: 'CARD',
              paymentStatus: 'Declined',
              transactionID: '9Lgx42DbNj5nYHcC6iEb',
              notificationID: '9077ab06-586c-449e-ba8a-93ffac1c258e'
            })
          )
        )
        .then((payload) => {
          cy.request({
            url: '/wh/sibs/',
            method: 'POST',
            body: payload.message,
            headers: {
              'x-authentication-tag': payload.at,
              'x-initialization-vector': payload.iv
            }
          }).then(() => {
            cy.loginOrganizer()
              .visitAndWaitForHydration('/o/event/5n8epZbHczqAQtQaAh5R/dashboard')
              .get('#participant-TrqeXCggKuzB3T9Nr4C5')
              .contains('Pendente');
          });
        });
    });

    context.only('failed get-status', () => {
      it('should show handled error when get-status fails 500', () => {
        cy.request({
          url: '/checkout/submitted/sGDw53Nv27kbi4SkY500',
          method: 'GET'
        }).then(() => {
          cy.login()
            .visitAndWaitForHydration('/checkout/payment/MNT9Keq82E3Tbag5tPjw')

            .get('[data-cy=gateway-error]')
            .should('exist')
            .and('be.visible');
        });
      });

      it('should show handled error when get-status fails 502', () => {
        cy.request({
          url: '/checkout/submitted/sGDw53Nv27kbi4SkY502',
          method: 'GET'
        }).then(() => {
          cy.login()
            .visitAndWaitForHydration('/checkout/payment/MNT9Keq82E3Tbag5tPjw')

            .get('[data-cy=gateway-error]')
            .should('exist')
            .and('be.visible');
        });
      });

      it('should show handled error when get-status fails 503', () => {
        cy.request({
          url: '/checkout/submitted/sGDw53Nv27kbi4SkY503',
          method: 'GET'
        }).then(() => {
          cy.login()
            .visitAndWaitForHydration('/checkout/payment/MNT9Keq82E3Tbag5tPjw')

            .get('[data-cy=gateway-error]')
            .should('exist')
            .and('be.visible');
        });
      });

      it('should pay booking after getting a success call', () => {
        const secret = Cypress.env('SIBS_WEBHOOK_SECRET');

        cy.request({
          url: '/checkout/submitted/sGDw53Nv27kbi4SkY500',
          method: 'GET'
        }).then(() => {
          cy.login()
            .visitAndWaitForHydration('/checkout/payment/MNT9Keq82E3Tbag5tPjw')

            .get('[data-cy=gateway-error]')
            .should('exist')
            .and('be.visible');
        });

        cy.wrap(null)
          .then(() =>
            encryptMessage(
              secret,
              JSON.stringify({
                token: {
                  value: '351#931111111',
                  tokenType: 'MobilePhone'
                },
                amount: {
                  value: 40,
                  currency: 'EUR'
                },
                merchant: {
                  terminalId: 1111111,
                  merchantName: 'CRUCIAL ALGORITHM - UNIPESSOAL LDA',
                  transactionId: 'sGDw53Nv27kbi4SkY500'
                },
                paymentType: 'PURS',
                returnStatus: {
                  statusMsg: 'Success',
                  statusCode: '000'
                },
                paymentMethod: 'MBWAY',
                paymentStatus: 'Success',
                transactionID: 'sGDw53Nv27kbi4SkY500',
                notificationID: '70293d16-c4ed-4da2-924a-f19c6c4e3f81',
                transactionDateTime: new Date().toISOString()
              })
            )
          )
          .then((payload) => {
            cy.request({
              url: '/wh/sibs/',
              method: 'POST',
              body: payload.message,
              headers: {
                'x-authentication-tag': payload.at,
                'x-initialization-vector': payload.iv
              }
            }).then(() => {
              cy.get('button[name=get-payment-status]')
                .should('exist')
                .click()

                .location()
                .should((l) => {
                  expect(l.pathname).to.eq(
                    '/checkout/confirmation/MNT9Keq82E3Tbag5tPjw'
                  );
                });
            });
          });
      });

      it('should show sibs form after getting a fail call', () => {
        const secret = Cypress.env('SIBS_WEBHOOK_SECRET');

        cy.request({
          url: '/checkout/submitted/sGDw53Nv27kbi4SkY500',
          method: 'GET'
        }).then(() => {
          cy.login()
            .visitAndWaitForHydration('/checkout/payment/MNT9Keq82E3Tbag5tPjw')

            .get('[data-cy=gateway-error]')
            .should('exist')
            .and('be.visible');
        });

        cy.wrap(null)
          .then(() =>
            encryptMessage(
              secret,
              JSON.stringify({
                token: {
                  value: '351#931111111',
                  tokenType: 'MobilePhone'
                },
                amount: {
                  value: 1,
                  currency: 'EUR'
                },
                merchant: {
                  terminalId: 1111111,
                  merchantName: 'CRUCIAL ALGORITHM - UNIPESSOAL LDA',
                  transactionId: 'sGDw53Nv27kbi4SkY500'
                },
                paymentType: 'PURS',
                returnStatus: {
                  statusMsg: 'Declined',
                  statusCode: '01.106.0001',
                  statusDescription:
                    'After the operation was successful, was refused by the cardholder.'
                },
                paymentMethod: 'MBWAY',
                paymentStatus: 'Declined',
                transactionID: 'sGDw53Nv27kbi4SkY500',
                notificationID: 'd787b6bc-09c1-4e9c-a9ed-3353e51d7b81',
                transactionDateTime: new Date().toISOString()
              })
            )
          )
          .then((payload) => {
            cy.request({
              url: '/wh/sibs/',
              method: 'POST',
              body: payload.message,
              headers: {
                'x-authentication-tag': payload.at,
                'x-initialization-vector': payload.iv
              }
            }).then(() => {
              cy.get('button[name=get-payment-status]')
                .should('exist')
                .click()

                .location()
                .should((l) => {
                  expect(l.pathname).to.eq(
                    '/checkout/payment/MNT9Keq82E3Tbag5tPjw'
                  );
                });
            });
          });
      });

      it('should start new payment process', () => {
        cy.request({
          url: '/checkout/submitted/sGDw53Nv27kbi4SkY500',
          method: 'GET'
        }).then(() => {
          cy.login()
              .visitAndWaitForHydration('/checkout/payment/MNT9Keq82E3Tbag5tPjw')

              .get('[data-cy=gateway-error]')
              .should('exist')
              .and('be.visible')

              .get('button[name=actionId]')
              .should('exist')
              .click()

              .location()
              .should((l) => {
                expect(l.pathname).to.eq('/checkout/payment/MNT9Keq82E3Tbag5tPjw');
              })

              .get('button[name=pay-reference]')
              .should('exist');
        });
      });
    });

    context('should pay booking', () => {
      beforeEach(() => {
        cy.login();
      });

      it('MB Way', () => {
        cy.visitAndWaitForHydration('/checkout/payment/uj3tsN7auCRx8citYiA2')

          .intercept('/checkout/payment/uj3tsN7auCRx8citYiA2')
          .as('ConfirmationRoute')

          .get('button[name=pay-mbway]')
          .should('exist')
          .click()

          .wait('@ConfirmationRoute')

          .location()
          .should((l) => {
            expect(l.pathname).to.eq(
              '/checkout/confirmation/uj3tsN7auCRx8citYiA2'
            );
          });
      });

      it('Credit Card', () => {
        cy.visitAndWaitForHydration('/checkout/payment/uj3tsN7auCRx8citYiA2')

          .intercept('/checkout/payment/uj3tsN7auCRx8citYiA2')
          .as('ConfirmationRoute')

          .get('button[name=pay-cc]')
          .should('exist')
          .click()

          .wait('@ConfirmationRoute')

          .location()
          .should((l) => {
            expect(l.pathname).to.eq(
              '/checkout/confirmation/uj3tsN7auCRx8citYiA2'
            );
          });
      });

      it('MB', () => {
        cy.visitAndWaitForHydration('/checkout/payment/uj3tsN7auCRx8citYiA2')

          .intercept('/checkout/payment/uj3tsN7auCRx8citYiA2')
          .as('ConfirmationRoute')

          .get('button[name=pay-reference]')
          .should('exist')
          .click()

          .wait('@ConfirmationRoute')

          .location()
          .should((l) => {
            expect(l.pathname).to.eq(
              '/checkout/confirmation/uj3tsN7auCRx8citYiA2'
            );
          });
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
    .type('000000000ZZ4')

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
        .type('000000000zz4')
        .should('have.value', '00000000-0-zz4')

        .get('input[name=federation-number]')
        .type('8165238')

        .pickOptionFromSelect('shirt', 2)

        .pickOptionFromSelect('nationality', 188)

        .get('input[name=postal-code]')
        .type('4730-454')

        .get('input[name=regulation]')
        .first()
        .check()

        .get('input[name=terms]')
        .first()
        .check()

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

        .get('button[name=pay-reference]')
        .click();
    });
}

async function encryptMessage(secret, value) {
  const key = await window.crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(secret),
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );

  const encoded = new TextEncoder().encode(value);
  // The iv must never be reused with a given key.
  const iv = window.crypto.getRandomValues(new Uint8Array(6));
  const additionalData = new TextEncoder().encode(String(Date.now()));
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData // believe this is not being used for anything, but...
    },
    key,
    encoded
  );

  return {
    at: arrayBufferToBase64(additionalData),
    iv: arrayBufferToBase64(iv),
    message: arrayBufferToBase64(
      ciphertext.slice(0, ciphertext.byteLength - 16)
    )
  };
}

// https://stackoverflow.com/a/21797381/9014097
function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
