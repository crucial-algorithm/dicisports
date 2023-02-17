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

        .url()
        .should(
          'eq',
          `${Cypress.config().baseUrl}/checkout/info/MY4bvgxDbMtGv8rbYe5d`
        );
    });

    it('Should add/remove race', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration(
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains('1')

        .get('#remove-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains('0');
    });

    it('Should fill form and save participant', () => {
      registerParticipant();
    });

    it('should contain right amount of races', () => {
      cy.login()
        .intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .intercept('POST', '*?_data=route*checkout*registrations*')
        .as('addRace')

        .visitAndWaitForHydration(
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@addRace')
        .wait('@selectRace')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@addRace')
        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')

        .get('[data-cy=participant]')
        .should('have.length', 2);
    });

    it('should not exist list of participants if there is only one', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration(
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d'
        )

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
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration(
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')
        .waitForHydration()

        .intercept(
          'POST',
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d?a=update*?_data=routes*'
        )
        .as('addParticipant')

        .get('[data-cy=update-cart]')
        .click()

        .waitForHydration()

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/registrations/MY4bvgxDbMtGv8rbYe5d?a=update`
        )

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

    it('should fill form with saved participant info', () => {
      registerParticipant();

      cy.visitAndWaitForHydration('/checkout/info/MY4bvgxDbMtGv8rbYe5d')

        .get('div[data-cy=participant-1]')
        .click()

        .get('[data-cy=participant-name-1]')
        .contains('Nuno')

        .get('input[name=first-name]')
        .should('have.value', 'Nuno');
    });

    it('should remove race participant', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration(
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .intercept('GET', '*?data=routes*info*')
        .as('registrationsCheckout')

        .get('#checkout')
        .click()

        .wait('@registrationsCheckout')

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

    it('should redirect to registration if last race participant is removed', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration(
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')

        .intercept(
          'POST',
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d?a=update*?_data=routes*'
        )
        .as('removeParticipant')

        .get('[data-cy=update-cart]')
        .click()

        .waitForHydration()

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/registrations/MY4bvgxDbMtGv8rbYe5d?a=update`
        )

        .get('#remove-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@removeParticipant')

        .get('#checkout')
        .should('be.disabled')

        .visitAndWaitForHydration('/checkout/info/MY4bvgxDbMtGv8rbYe5d')

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/registrations/MY4bvgxDbMtGv8rbYe5d`
        );
    });

    it('should show validation error If there are registrations with empty participant info', () => {
      cy.intercept('GET', '/checkout/registrations/*?_data=routes*checkout*')
        .as('selectRace')

        .intercept('GET', '/checkout/info/*?_data=routes*checkout*')
        .as('checkout')

        .visitAndWaitForHydration(
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@checkout')

        .reload()
        .waitForHydration()

        .get('#checkout')
        .click()

        .wait('@checkout')
        .waitForHydration()

        .get('#checkout-error')
        .should('exist');
    });

    it('should book a race', () => {
      bookParticipant();
    });

    it('should be able to authenticate and keep booking after completing booking process', () => {
      bookParticipant();

      cy.get('[data-cy=authenticate]')
        .should('exist')
        .click()

        .url()
        .should('include', 'login?a=checkout')

        .get('body[data-cy=ready]')

        .get('[name=email]')
        .type('regular@gmail.com', { delay: 10 })

        .get('[name=password]')
        .type('Password1', { delay: 10 })

        .intercept('GET', '/?_data=routes*')
        .as('login')

        .get('button[name=login]')
        .click()

        .wait('@login')

        .visitAndWaitForHydration(
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d'
        )

        .url()
        .should('include', '/checkout/confirmation/');
    });
  });

  context('Maintenance: authenticated', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.login();
    });

    it('Should  add race to cart  and redirect to form route from event page', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
        .click()

        .wait('@selectRace')

        .url()
        .should(
          'eq',
          `${Cypress.config().baseUrl}/checkout/info/MY4bvgxDbMtGv8rbYe5d`
        );
    });

    it('Should add/remove race', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration(
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains('1')

        .get('#remove-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains('0');
    });

    it('Should fill form and save participant', () => {
      registerParticipant();
    });

    it('should contain right amount of races', () => {
      cy.login()
        .intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .intercept('POST', '*?_data=route*checkout*registrations*')
        .as('addRace')

        .visitAndWaitForHydration(
          '/checkout/registrations/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@addRace')
        .wait('@selectRace')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@addRace')
        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')

        .get('[data-cy=participant]')
        .should('have.length', 2);
    });

    it('should fill form with saved participant info', () => {
      registerParticipant();

      cy.visitAndWaitForHydration('/checkout/info/MY4bvgxDbMtGv8rbYe5d')

        .get('div[data-cy=participant-1]')
        .click()

        .get('[data-cy=participant-name-1]')
        .contains('Nuno')

        .get('input[name=first-name]')
        .should('have.value', 'Nuno');
    });

    it('should book a race', () => {
      bookParticipant();
    });
  });
});

function registerParticipant() {
  cy.intercept('GET', '*?_data=routes*checkout*')
    .as('selectRace')

    .visitAndWaitForHydration('/checkout/registrations/MY4bvgxDbMtGv8rbYe5d')

    .get('#add-race-AhowRdNWCBQWSuivSt7h')
    .click()

    .wait('@selectRace')
    .waitForHydration()

    .get('#add-race-AhowRdNWCBQWSuivSt7h')
    .click()

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

    .get('input[name=birthday]')
    .type('2001-09-21')

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

function bookParticipant() {
  cy.intercept('GET', '*?_data=routes*checkout*')
    .as('selectRace')

    .visitAndWaitForHydration('/checkout/registrations/MY4bvgxDbMtGv8rbYe5d')

    .get('#add-race-AhowRdNWCBQWSuivSt7h')
    .click()

    .wait('@selectRace')

    .get('#checkout')
    .click()

    .wait('@selectRace')

    .get('input[name=first-name]')
    .type('Nuno')

    .get('input[name=last-name]')
    .type('Lopes')

    .pickOptionFromSelect('gender', 2)

    .get('input[name=birthday]')
    .type('2001-09-21')

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

    .reload()
    .waitForHydration()

    .get('button[name=pay]')
    .click()

    .get('[data-cy=confirmation-label]')
    .should('exist')

    .url()
    .should('include', '/confirmation/MY4bvgxDbMtGv8rbYe5d');
}
