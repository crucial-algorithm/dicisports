describe('Checkout', () => {
  context('Maintenance: unauthenticated', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.task('clearDownloadFolder');
      clearHttpCatcher();
    });

    it('Should add race to cart and redirect to form route from event page', () => {
      cy.intercept('GET', '/checkout/create*')
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

    it('Should fill form and save participant', () => {
      registerParticipant('love-tiles-douro-granfondo-2023', 'AhowRdNWCBQWSuivSt7h');
    });

    it('should book a race', () => {
      bookParticipant('love-tiles-douro-granfondo-2023', 'AhowRdNWCBQWSuivSt7h');
    });

    it('should send automated email after completing booking', () => {
      bookParticipant('love-tiles-douro-granfondo-2023', 'AhowRdNWCBQWSuivSt7h');
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
            'Informações da tua inscrição no evento Love Tiles Douro Granfondo 2023.'
          );
        });
    });

    it('should access booking with PIN', () => {
      cy.visitAndWaitForHydration('/qa/e8pHPLNjnNxKTzoGwtLh/1234/info')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/checkout/info/e8pHPLNjnNxKTzoGwtLh');
        })

        .get('[data-cy=total-price]')
        .should('exist')
        .and('contain', '20€');
    });

    it('should not be able to access booking with invalid PIN', () => {
      cy.visitAndWaitForHydration('/qa/e8pHPLNjnNxKTzoGwtLh/1235/info')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/');
        });
    });

    it('should be able to access booking from a shortned URL', () => {
      cy.visitAndWaitForHydration('/s/gqMp7')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/checkout/info/e8pHPLNjnNxKTzoGwtLh');
        })

        .get('[data-cy=total-price]')
        .should('exist')
        .and('contain', '20€');
    });

    it('should display checkbox for organizer campaign and corresponding validations', () => {
      bookParticipant('love-tiles-douro-granfondo-2023', 'AhowRdNWCBQWSuivSt7h');

      cy.location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/confirmation/');
        })

        .waitForHydration()

        .get('[type="checkbox"]')
        .check()

        .get('input[name=add-to-mail-list]')
        .should('be.checked')

        .get('input[name=email]')
        .should('exist')
        .type('a@gmail.com')

        .intercept('POST', '/checkout/confirmation/*')
        .as('AddToMailList')

        .get('button[name=send-confirmation]')
        .should('exist');
    });

    context('authenticate and keep booking', () => {
      it('should redirect to existing booking payment route if there is an ongoing payment', () => {
        cy.visitAndWaitForHydration('/pt/event/viana-granfondo')

          .intercept('GET', '/checkout/create*')
          .as('CreateBooking')

          .get('button[name=race-WRT9GHQKTEgHXfbWk32i]')
          .click()

          .wait('@CreateBooking')

          .location()
          .should((l) => {
            expect(l.pathname).to.include('/checkout/info/');
          })

          .get('input[name=email]')
          .should('exist')
          .type('regular@gmail.com')

          .get('input[name=password]')
          .type('Password1')

          .intercept('POST', '/login*')
          .as('Login')

          .get('button[name=login]')
          .click()

          .wait('@Login')

          .location()
          .should((l) => {
            expect(l.pathname).to.eq('/checkout/payment/qR4nqWpTdQy8QZu29ANu');
          });
      });

      it('should keep booking if there are no pending payment or ongoing bookings', () => {
        cy.visitAndWaitForHydration('/pt/event/trail-do-zezere')

          .intercept('GET', '/checkout/create*')
          .as('CreateBooking')

          .get('button[name=race-Rd9SETi59X9ava6CPhkY]')
          .click()

          .wait('@CreateBooking')

          .location()
          .should((l) => {
            expect(l.pathname).to.include('/checkout/info');
          })
          .then((l) => {
            const bookingId = l.pathname.split('/').pop();

            cy.get('input[name=email]')
              .should('exist')
              .type('regular@gmail.com')

              .get('input[name=password]')
              .type('Password1')

              .intercept('POST', '/login*')
              .as('Login')

              .get('button[name=login]')
              .click()

              .wait('@Login')

              .location()
              .should((l) => {
                expect(l.pathname).to.eq(`/checkout/info/${bookingId}`);
              })

              .visitAndWaitForHydration('/me')
              .get('[data-cy=event-trail-do-zezere]')
              .should('have.length', 1);
          });
      });

      it('should redirect to existing booking info route if there is an ongoing booking', () => {
        cy.visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

          .intercept('GET', '/checkout/create*')
          .as('CreateBooking')

          .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
          .click()

          .wait('@CreateBooking')

          .location()
          .should((l) => {
            expect(l.pathname).to.include('/checkout/info/');
          })

          .get('input[name=email]')
          .should('exist')
          .type('regular@gmail.com')

          .get('input[name=password]')
          .type('Password1')

          .intercept('POST', '/login*')
          .as('Login')

          .get('button[name=login]')
          .click()

          .wait('@Login')

          .location()
          .should((l) => {
            expect(l.pathname).to.eq('/checkout/info/iZrqWniNHZba9n4WQTmb');
          });
      });

      it('should be able to login and keep booking after completing booking process', () => {
        bookParticipant('trail-do-zezere', 'Rd9SETi59X9ava6CPhkY')
          .get('[data-cy=authenticate-login]')
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

      it('should be able to signup and keep booking after completing booking process', () => {
        bookParticipant('trail-do-zezere', 'Rd9SETi59X9ava6CPhkY')
          .get('[data-cy=authenticate-signup]')
          .should('exist')
          .click()

          .location()
          .should((l) => {
            expect(l.pathname).to.eq('/signup');
            expect(l.search).to.contain('a=checkout&b=');
          })

          .waitForHydration()

          .get('input[name=signup-email]')
          .type('a@gmail.com')

          .get('input[name=confirmation]')
          .type('a@gmail.com')

          .get('input[name=name]')
          .type('Projeto Pedal')

          .get('input[name=password]')
          .type('pp@password1')

          .intercept('POST', '/signup*')
          .as('signup')

          .get('button[name=create]')
          .click()

          .wait('@signup')

          .location()
          .should((l) => {
            expect(l.pathname).to.include('/checkout/confirmation/');
          });
      });
    });
  });

  context('Maintenance: authenticated', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.task('clearDownloadFolder');
      clearHttpCatcher();
      cy.login();
    });

    it('Should add race to cart and redirect to form route from event page', () => {
      cy.intercept('GET', '/checkout/create*')
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

    it('Should add/remove race', () => {
      cy.intercept('POST', '/checkout/cart/iZrqWniNHZba9n4WQTmb*')
        .as('ManageRace')

        .visitAndWaitForHydration('/checkout/cart/iZrqWniNHZba9n4WQTmb')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@ManageRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qty]')
        .contains('2')

        .get('#remove-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@ManageRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qty]')
        .contains('1');
    });

    it('should apply regular price to booking', () => {
      cy.visitAndWaitForHydration('/pt/event/event-2-verify-dates')

      .intercept('GET', '/checkout/create*')
      .as('CreateBooking')

      .get('button[name=race-a-regular-race-price]')
      .click()

      .wait('@CreateBooking')

      .location()
      .should((l) => {
        expect(l.pathname).to.include('/checkout/info');
      })
      .get('[data-cy=total-price]')
      .contains('15€');
    });

    it('should apply early bird price to booking', () => {
      cy.visitAndWaitForHydration('/pt/event/event-2-verify-dates')

      .intercept('GET', '/checkout/create*')
      .as('CreateBooking')

      .get('button[name=race-a-early-bird-pricexx]')
      .click()

      .wait('@CreateBooking')

      .location()
      .should((l) => {
        expect(l.pathname).to.include('/checkout/info');
      })
      .get('[data-cy=total-price]')
      .contains('10€');
    });

    it('should apply late bird price to booking', () => {
      cy.visitAndWaitForHydration('/pt/event/event-2-verify-dates')

      .intercept('GET', '/checkout/create*')
      .as('CreateBooking')

      .get('button[name=race-a-penalty-price-to-u]')
      .click()

      .wait('@CreateBooking')

      .location()
      .should((l) => {
        expect(l.pathname).to.include('/checkout/info');
      })
      .get('[data-cy=total-price]')
      .contains('20€');
    });


    it('Should fill form and save participant', () => {
      registerParticipant('trail-do-zezere', 'Rd9SETi59X9ava6CPhkY');
    });

    it('should contain right amount of races', () => {
      cy.visitAndWaitForHydration('/checkout/cart/iZrqWniNHZba9n4WQTmb')

        .intercept('POST', '/checkout/cart/iZrqWniNHZba9n4WQTmb*')
        .as('ManageRace')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@ManageRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qty]')
        .contains(2)

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@ManageRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qty]')
        .contains(3)

        .get('#checkout')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('[data-cy=participant]')
        .should('have.length', 3);
    });

    it('should fill form with saved participant info', () => {
      cy.visitAndWaitForHydration('/checkout/info/TYFurhEhNFSRZAj5DewZ')
        .get('button[name=select-userSavedParticipants]')
        .should('exist')
        .and('be.visible')
        .pickOptionFromSelect('userSavedParticipants', 1)

        .get('input[name=first-name]')
        .should('have.length.at.least', 1)

        .get('input[name=last-name]')
        .should('have.length.at.least', 1)
        .and('have.value', 'Rego');
    });

    it('should book a race', () => {
      bookParticipant('trail-do-zezere', 'Rd9SETi59X9ava6CPhkY');
    });

    it('should send automated email after completing booking', () => {
      cy.visitAndWaitForHydration('/checkout/payment/qR4nqWpTdQy8QZu29ANu')

        .get('button[name=pay-cc]')
        .should('exist')
        .then((b) => {
          b.click();
        })

        .location()
        .should((l) => {
          expect(l.pathname).to.eq(
            '/checkout/confirmation/qR4nqWpTdQy8QZu29ANu'
          );
        })

        .request({ method: 'GET', url: Cypress.env('HTTP_CATCHER') })
        .then(({ body }) => {
          expect(body.subject).to.eq(
            'Informações da tua inscrição no evento Viana Granfondo.'
          );
        });
    });

    it('should display error when a Portuguese submitts form without identity card filled', () => {
      cy.visitAndWaitForHydration('/checkout/info/iZrqWniNHZba9n4WQTmb')

        .intercept('POST', '/checkout/info/*')
        .as('saveParticipant')

        .get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .pickDate('birthdate', '20031021')

        .get('input[name=phone-number]')
        .type('937654321')

        .get('input[name=vat-number]')
        .type('123456789')

        .pickOptionFromSelect('nationality', 1)

        .get('#save-button')
        .click()

        .wait('@saveParticipant')

        .get('#identity-card-error')
        .should('exist');
    });

    it('should display error when a Portuguese submitts form without vat number filled', () => {
      cy.visitAndWaitForHydration('/checkout/info/iZrqWniNHZba9n4WQTmb')

        .intercept('POST', '/checkout/info/*')
        .as('saveParticipant')

        .get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .pickDate('birthdate', '20031021')

        .get('input[name=phone-number]')
        .type('937654321')

        .inputMaskWorkaround('input[name=identity-card]', '00000000-0-zz4')
        .should('have.value', '00000000-0-zz4')

        .pickOptionFromSelect('nationality', 1)

        .get('#save-button')
        .click()

        .wait('@saveParticipant')

        .get('#vat-number-error')
        .should('exist');
    });

    it('should not display error when missing a identity card if user is not Portuguese, but should require VAT number', () => {
      cy.visitAndWaitForHydration('/checkout/info/iZrqWniNHZba9n4WQTmb')

        .intercept('POST', '/checkout/info/*')
        .as('saveParticipant')

        .get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .pickDate('birthdate', '20031001')

        .get('input[name=phone-number]')
        .type('937654321')

        .pickOptionFromSelect('nationality', 2)

        .get('input[name=postal-code]')
        .type('4730-454')

        .get('input[name=regulation]')
        .first()
        .check()

        .get('input[name=terms]')
        .first()
        .check()

        .get('#save-button')
        .click()

        .wait('@saveParticipant')

        .get('#form-submission-error')
        .should('exist');
    });

    it('should have correct bib numbers', () => {
      cy.visitAndWaitForHydration('/checkout/payment/qR4nqWpTdQy8QZu29ANu')

        .get('button[name=pay-cc]')
        .should('exist')
        .then((b) => {
          b.click();
        })

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

    it('should have correct bib numbers after updating initial bib number', () => {
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

        .visitAndWaitForHydration('/checkout/payment/qR4nqWpTdQy8QZu29ANu')

        .get('button[name=pay-cc]')
        .should('exist')

        .click()

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
      cy.visitAndWaitForHydration('/checkout/info/iZrqWniNHZba9n4WQTmb')
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

        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq(
            '/checkout/confirmation/qR4nqWpTdQy8QZu29ANu'
          );
        })

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

    it('should skip payment step if booking is free - applied 100% discount', () => {
      cy.visitAndWaitForHydration('/checkout/info/iZrqWniNHZba9n4WQTmb')

        .intercept('POST', '/checkout/info/*')
        .as('ApplyDiscount')

        .get('input[name=discount-code]')
        .clear()
        .type('GET-FIT-100%')

        .get('#apply-discount')
        .click()

        .wait('@ApplyDiscount')

        .get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .pickDate('birthdate', '20031021')

        .get('input[name=phone-number]')
        .type('937654321')

        .inputMaskWorkaround('input[name=identity-card]', '00000000-0-zz4')
        .should('have.value', '00000000-0-zz4')

        .get('input[name=vat-number]')
        .type('123456789')

        .get('input[name=federation-number]')
        .type('8165238')

        .pickOptionFromSelect('nationality', 188)

        .get('input[name=postal-code]')
        .type('4730-454')

        .get('[data-cy=total-price]')
        .contains('0€')

        .get('input[name=regulation]')
        .first()
        .check()

        .get('input[name=terms]')
        .first()
        .check()

        .intercept('POST', '/checkout/info/*')
        .as('saveParticipant')

        .get('#save-button')
        .click()

        .wait('@saveParticipant')

        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/confirmation/');
        });
    });

    it('should be able to book same race multiple times', () => {
      bookParticipant(
        'love-tiles-douro-granfondo-2023',
        'xaXaCzs2t7D8DpRNnffM'
      );
      bookParticipant(
        'love-tiles-douro-granfondo-2023',
        'xaXaCzs2t7D8DpRNnffM'
      );
    });

    it('Should remove race', () => {
      cy.visitAndWaitForHydration('/checkout/cart/iZrqWniNHZba9n4WQTmb')

        .intercept('POST', '/checkout/cart/*')
        .as('removeParticipant')

        .get('#remove-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@removeParticipant')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qty]')
        .contains('0')

        .get('#checkout')
        .should('have.prop', 'disabled');
    });

    it('should not exist list of participants if there is only one', () => {
      cy.visitAndWaitForHydration('/checkout/info/iZrqWniNHZba9n4WQTmb')
        .get('[data-cy=participant]')
        .should('not.exist');
    });

    it('should be able to update cart', () => {
      cy.visitAndWaitForHydration('/checkout/cart/iZrqWniNHZba9n4WQTmb')

        .intercept('POST', '/checkout/cart/iZrqWniNHZba9n4WQTmb*')
        .as('addParticipant')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@addParticipant')

        .get('#checkout')
        .click()

        .wait('@addParticipant')

        .location()
        .should((location) => {
          expect(location.pathname).to.eq(
            '/checkout/info/iZrqWniNHZba9n4WQTmb'
          );
        })

        .get('[data-cy=participant]')
        .should('exist')
        .and('have.length', 2);
    });

    it('should remove race participant', () => {
      cy.visitAndWaitForHydration('/checkout/info/TYFurhEhNFSRZAj5DewZ')
        .intercept('POST', '/checkout/manage/*')
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

    it('should redirect to event if last race participant is removed', () => {
      cy.visitAndWaitForHydration('/checkout/cart/iZrqWniNHZba9n4WQTmb')
        .intercept('POST', '/checkout/cart/iZrqWniNHZba9n4WQTmb*')
        .as('removeParticipant')

        .get('#remove-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@removeParticipant')

        .get('#checkout')
        .should('be.disabled')

        .visitAndWaitForHydration('/checkout/info/iZrqWniNHZba9n4WQTmb')

        .location()
        .should((l) => {
          expect(l.pathname).to.include(
            '/pt/event/love-tiles-douro-granfondo-2023'
          );
        });
    });

    it('should show validation error if there are registrations with empty participant info', () => {
      cy.visitAndWaitForHydration('/checkout/info/TYFurhEhNFSRZAj5DewZ')

        .get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .pickDate('birthdate', '20031021')

        .get('input[name=phone-number]')
        .type('937654321')

        .inputMaskWorkaround('input[name=identity-card]', '00000000-0-zz4')
        .should('have.value', '00000000-0-zz4')

        .get('input[name=vat-number]')
        .type('123456789')

        .get('input[name=federation-number]')
        .type('8165238')

        .pickOptionFromSelect('nationality', 188)

        .get('input[name=postal-code]')
        .type('4730-454')

        .get('input[data-cy=regulation]')
        .click()

        .get('input[data-cy=terms]')
        .click()

        .intercept('POST', '/checkout/info/*')
        .as('checkout')

        .get('#checkout')
        .click()

        .wait('@checkout')
        .waitForHydration()

        .get('#checkout-error')
        .should('exist');
    });

    it('should show validation terms and conditions error', () => {
      cy.visitAndWaitForHydration('/checkout/info/iZrqWniNHZba9n4WQTmb')
        .get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .pickDate('birthdate', '20031021')

        .get('input[name=phone-number]')
        .type('937654321')

        .inputMaskWorkaround('input[name=identity-card]', '00000000-0-zz4')
        .should('have.value', '00000000-0-zz4')

        .get('input[name=vat-number]')
        .type('123456789')

        .get('input[name=federation-number]')
        .type('8165238')

        .pickOptionFromSelect('nationality', 188)

        .get('input[name=postal-code]')
        .type('4730-454')

        .intercept('POST', '/checkout/info/*')
        .as('checkout')

        .get('#checkout')
        .click()

        .wait('@checkout')
        .waitForHydration()

        .get('#form-submission-error')
        .should('exist');
    });

    it('should display current booked teams', () => {
      cy.visitAndWaitForHydration('/checkout/info/iZrqWniNHZba9n4WQTmb')
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
      cy.visitAndWaitForHydration('/checkout/info/iZrqWniNHZba9n4WQTmb')
        .get('#creatable-team')
        .clear()
        .type('Marretas')

        .get('ul[data-headlessui-state="open"] li:first')
        .contains('Criar: Marretas');
    });

    it('should save team', () => {
      cy.visitAndWaitForHydration('/checkout/info/TYFurhEhNFSRZAj5DewZ')
        .get('div[data-cy=participant-1]')
        .click()

        .get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .pickDate('birthdate', '20031021')

        .get('input[name=phone-number]')
        .type('937654321')

        .get('input[name=identity-card]')
        .type('87654321')

        .get('input[name=vat-number]')
        .type('123456789')

        .get('input[name=federation-number]')
        .type('8165238')

        .get('#creatable-team')
        .clear()
        .type('Marretas')

        .get('ul[data-headlessui-state="open"] li:first')
        .contains('Criar: Marretas')
        .click()

        .pickOptionFromSelect('nationality', 188)

        .get('input[name=postal-code]')
        .type('4730-454')

        .intercept('POST', '/checkout/info/*')
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

    it('should remove participant and select the first one from participants list', () => {
      cy.visitAndWaitForHydration('/checkout/info/4RzB8TRoXhEteTWtLMs6')

        .intercept('POST', '/checkout/manage/4RzB8TRoXhEteTWtLMs6*')
        .as('RemoveParticipant')

        .get('[data-cy=participant-3]')
        .click()

        .get('button[data-cy=remove-participant-3]')
        .should('exist')
        .click()

        .wait('@RemoveParticipant')

        .get('[data-cy=participant]')
        .should('exist')
        .and('have.length', 2)

        .get('input[name=first-name]')
        .should('have.value', 'António')

        .get('[data-cy=participant-2]')
        .click()

        .get('button[data-cy=remove-participant-2]')
        .should('exist')
        .click()

        .wait('@RemoveParticipant')

        .get('[data-cy=participant]')
        .should('not.exist')

        .get('input[name=first-name]')
        .should('have.value', 'António');
    });

    it('should keep same participant selected after submitting form', () => {
      cy.visitAndWaitForHydration('/checkout/info/4RzB8TRoXhEteTWtLMs6')

        .intercept('POST', '/checkout/manage/4RzB8TRoXhEteTWtLMs6*')
        .as('RemoveParticipant')

        .get('[data-cy=participant-2]')
        .click()

        .get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .pickDate('birthdate', '2003-10-21')

        .get('input[name=phone-number]')
        .type('937654321')

        .inputMaskWorkaround('input[name=identity-card]', '00000000-0-zz4')

        .get('input[name=vat-number]')
        .type('123456789')

        .get('input[name=federation-number]')
        .type('8165238')

        .pickOptionFromSelect('nationality', 188)

        .get('input[name=postal-code]')
        .type('4730-454')

        .intercept('POST', '/checkout/info/*')
        .as('SaveParticipant')
        .intercept('GET', '/checkout/info/*')
        .as('LoadRoute')

        .get('#save-button')
        .click()

        .wait('@SaveParticipant')
        .wait('@LoadRoute')

        .get('input[name=first-name]')
        .should('have.value', 'Nuno');
    });
  });

  context('Security', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.task('clearDownloadFolder');
      clearHttpCatcher();
    });


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

    it('should have link to Event regulation and Dici terms', () => {
      cy.visitAndWaitForHydration('/pt/event/trilho-dos-moinhos')
        .intercept('GET', '/checkout/create*')
        .as('CreateBooking')

        .get('button[name=race-LoDjLz7dWQTWk6Th4dRC]')
        .click()

        .wait('@CreateBooking')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('div[data-cy=login]')
        .should('have.attr', 'data-show-login')
        .then((isSupposedToShow) => {
          // @ts-ignore (WS thinks this is a JQuery element, not a string)
          isSupposedToShow === 'true' && cy.get('#checkout-anonymously').click();
        })

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
      const formData = new FormData();

      formData.append('actionId', 'add');

      cy.login()
        .visitAndWaitForHydration('/checkout/cart/e8pHPLNjnNxKTzoGwtLh')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq(
            '/checkout/confirmation/e8pHPLNjnNxKTzoGwtLh'
          );
        })

        .request({
          url: '/checkout/cart/e8pHPLNjnNxKTzoGwtLh',
          method: 'POST',
          body: formData
        })
        .then((l) => {
          expect(l.redirects[0]).to.include(
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

    it('should not be able to book a race if event is outdated', () => {
      cy.visitAndWaitForHydration('/pt/event/monco-e-melgaco-granfondo-by-trek-2023')

        .get('button[name=race-Q7SpSTn9oszeSPhG9CaQ]')
        .should('be.disabled')

        .get('[data-cy=booking-closed]')
        .should('exist');
    });

    it('should be able to keep multiple bookings of same event', () => {
      cy.visitAndWaitForHydration('/pt/event/love-tiles-douro-granfondo-2023')

        .intercept('GET', '/checkout/create*')
        .as('selectRace')

        .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
        .click()

        .wait('@selectRace')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .get('div[data-cy=login]')
        .should('have.attr', 'data-show-login')

        .get('input[name=email]')
        .type('regular@gmail.com')

        .get('input[name=password]')
        .type('Password1')

        .intercept('POST', '/login*')
        .as('Login')

        .get('button[name=login]')
        .click()

        .wait('@Login')

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/checkout/info/');
        })

        .visitAndWaitForHydration('/me')
        .get('[data-cy=event-love-tiles-douro-granfondo-2023]')
        .should('have.length', 5);
    });

    context('add/remove race participants when', () => {
      it('does not own booking', () => {
        const formData = new FormData();

        formData.append('actionId', 'removeParticipant');

        cy.request({
          url: '/checkout/manage/e8pHPLNjnNxKTzoGwtLh',
          method: 'POST',
          body: formData,
          failOnStatusCode: false
        }).then((res) => {
          expect(res.status).to.eq(401);
        });
      });

      it('booking is already payed', () => {
        const formData = new FormData();

        formData.append('actionId', 'removeParticipant');

        cy.login()
          .request({
            url: '/checkout/manage/e8pHPLNjnNxKTzoGwtLh',
            method: 'POST',
            body: formData,
            failOnStatusCode: false
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
      cy.task('clearDownloadFolder');
      clearHttpCatcher();
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
            },
            failOnStatusCode: false
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
              .visitAndWaitForHydration(
                '/o/event/5n8epZbHczqAQtQaAh5R/dashboard'
              )
              .get('#participant-TrqeXCggKuzB3T9Nr4C5')
              .contains('Pendente');
          });
        });
    });

    context('Test error handling to SIBS gateway get status calls', () => {
      it('should show handled error when get-status fails 500', () => {
        cy.request({
          url: '/checkout/submitted/sGDw53Nv27kbi4SkY500',
          method: 'GET',
          failOnStatusCode: false
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
              expect(l.pathname).to.eq(
                '/checkout/payment/MNT9Keq82E3Tbag5tPjw'
              );
            })

            .get('button[name=pay-reference]')
            .should('exist');
        });
      });

      it('should handle a fetch to failed status through the normal flow', () => {
        cy.login()
          .visitAndWaitForHydration('/checkout/payment/uj3tsN7auCRx8citYiA2')

          .get('button[name=fail-to-fetch-status]')
          .should('exist')
          .click()

          .get('#mock-payment-header')
          .should('not.exist')

          .get('[data-cy=gateway-error]')
          .should('exist');
      });
    });

    context('should pay booking', () => {
      beforeEach(() => {
        cy.login();
      });

      it('MB Way', () => {
        cy.visitAndWaitForHydration('/checkout/payment/uj3tsN7auCRx8citYiA2')
          .get('button[name=pay-mbway]')
          .should('exist')
          .click()

          .location({ timeout: 10000 })
          .should((l) => {
            expect(l.pathname).to.eq(
              '/checkout/confirmation/uj3tsN7auCRx8citYiA2'
            );
          });
      });

      it('Credit Card', () => {
        cy.visitAndWaitForHydration('/checkout/payment/uj3tsN7auCRx8citYiA2')

          .get('button[name=pay-cc]')
          .should('exist')
          .click()

          .location({ timeout: 10000 })
          .should((l) => {
            expect(l.pathname).to.eq(
              '/checkout/confirmation/uj3tsN7auCRx8citYiA2'
            );
          });
      });

      it('MB', () => {
        cy.visitAndWaitForHydration('/checkout/payment/uj3tsN7auCRx8citYiA2')

          .get('button[name=pay-reference]')
          .should('exist')
          .click()


          .location({ timeout: 10000 })
          .should((l) => {
            expect(l.pathname).to.eq(
              '/checkout/confirmation/uj3tsN7auCRx8citYiA2'
            );
          });
      });
    });
  });
});

function registerParticipant(
  slug: string,
  raceId: string
) {
  cy.visitAndWaitForHydration(`/pt/event/${slug}`)

    .intercept('GET', '/checkout/create*')
    .as('CreateBooking')

    .get(`button[name=race-${raceId}]`)
    .click()

    .wait('@CreateBooking')

    .location()
    .should((l) => {
      expect(l.pathname).to.include('/checkout/info');
    })

    .get('div[data-cy=login]')
    .should('have.attr', 'data-show-login')
    .then((isSupposedToShow) => {
      // @ts-ignore (WS thinks this is a JQuery element, not a string)
      isSupposedToShow === 'true' && cy.get('#checkout-anonymously').click();
    })

    .get('input[name=first-name]')
    .type('Nuno')

    .get('input[name=last-name]')
    .type('Lopes')

    .pickOptionFromSelect('gender', 2)

    .pickDate('birthdate', '20031021')

    .get('input[name=phone-number]')
    .type('937654321')

    .inputMaskWorkaround('input[name=identity-card]', '00000000-0-zz4')

    .get('input[name=vat-number]')
    .type('123456789')

    .get('input[name=federation-number]')
    .type('8165238')

    .pickOptionFromSelect('nationality', 188)

    .get('input[name=postal-code]')
    .type('4730-454')

    .intercept('POST', '/checkout/info/*')
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

function bookParticipant(slug: string, raceId: string) {
  return cy
    .intercept('GET', '/checkout/create*')
    .as('selectRace')

    .visitAndWaitForHydration(`/event/${slug}`)

    .location()
    .should((loc) => {
      expect(loc.pathname).to.eq(`/event/${slug}`);
    })

    .get(`button[name=race-${raceId}]`)
    .click()

    .wait('@selectRace')

    .location()
    .should((l) => {
      expect(l.pathname).to.include('/checkout/info/');
    })
    .then((l) => {
      const bookingId = l.pathname.split('/')[3];

      cy.get('div[data-cy=login]')
        .should('have.attr', 'data-show-login')
        .then((isSupposedToShow) => {
          // @ts-ignore (WS thinks this is a JQuery element, not a string)
          isSupposedToShow === 'true' &&
            cy.get('#checkout-anonymously').click();
        })
        .get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .pickDate('birthdate', '20031021')

        .get('input[name=phone-number]')
        .type('937654321')

        .inputMaskWorkaround('input[name=identity-card]', '00000000-0-zz4')
        .should('have.value', '00000000-0-zz4')

        .get('input[name=vat-number]')
        .type('123456789')

        .get('input[name=federation-number]')
        .type('8165238')

        .pickOptionFromSelect('nationality', 188)

        .get('input[name=postal-code]')
        .type('4730-454')

        .get('input[name=regulation]')
        .first()
        .check()

        .get('input[name=terms]')
        .first()
        .check()

        .intercept('POST', '/checkout/info/*')
        .as('saveParticipant')

        .get('#save-button')
        .click()

        .wait('@saveParticipant')

        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq(`/checkout/payment/${bookingId}`);
        })

        .get('button[name=pay-cc]')
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

function clearHttpCatcher() {
  const url = Cypress.env('HTTP_CATCHER').replace(/\/$/, '');

  cy.request('GET', `${url}/clear-all`);
}