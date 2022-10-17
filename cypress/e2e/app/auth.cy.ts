Cypress.Cookies.debug(true);

describe('Authentication / Authorization', () => {
  beforeEach(() => {
    cy.task('db:reset');
  });

  context('When user not authenticated', () => {
    it('should redirect to login when accessing groups', () => {
      cy.visit('/m/groups')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/login`);
    });

    it('should redirect to login when accessing events', () => {
      cy.visit('/organizer/')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/login`);
    });

    it('should allow to navigate to create a new account', () => {
      cy.visit('/signup')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/signup`);
    });

    it('should allow to navigate to recover password', () => {
      cy.visit('/recover')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/recover`)

        .get('input[name=email]')
        .should('exist');
    });

    it('should allow to create a new user', () => {
      cy.visit('/signup')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/signup`)

        .get('input[name=email]')
        .type('a@gmail.com')

        .get('input[name=confirmation]')
        .type('a@gmail.com')

        .get('input[name=name]')
        .type('Projeto Pedal')

        .get('input[name=password]')
        .type('pp@password1')

        .get('button[name=create]')
        .click()

        .url()
        .should('eq', `${Cypress.config().baseUrl}/me`);
    });

    it.only('should login user', () => {
      cy.visit('/login')

        .get('[name=email]')
        .type('regular@gmail.com', { delay: 1 })

        .get('[name=password]')
        .type('Password1', { delay: 1 })

        .get('button[name=login]')
        .click()

        .url()
        .should('eq', `${Cypress.config().baseUrl}/`);
    });
  });

  context('When user authenticated', () => {

    it('should redirect to profile when accessing login', () => {
      cy
        .login()
        .visit('/login')
        .url()
        .should('eq', `${Cypress.config().baseUrl}/me`)
        ;
    });
  });
});

export {};
