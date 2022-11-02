Cypress.Cookies.debug(true);

describe.skip('Authentication / Authorization', () => {
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

    it('should login user', () => {
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
    beforeEach(() => cy.login());

    it('should redirect to profile when accessing login', () => {
      cy
        .visit('/login')
        .url()
        .should('eq', `${Cypress.config().baseUrl}/me`)
        ;
    });

    it('should be able to access it\'s profile', () => {
      cy
        .visit('/me')
        .url()
        .should('eq', `${Cypress.config().baseUrl}/me`)
      ;
    });

  });

  context('When user wants to signup', () => {
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

    it('should require all fields', () => {
      cy.visit('/signup')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/signup`)

        .get('button[name=create]')
        .click()

        .get('div[data-cy=email]>p[role=alert]')
        .should('exist')

        .get('div[data-cy=confirmation]>p[role=alert]')
        .should('exist')

        .get('div[data-cy=name]>p[role=alert]')
        .should('exist')

        .get('div[data-cy=password]>p[role=alert]')
        .should('exist')
      ;
    });

    it('should fail if user already exists', () => {
      cy.visit('/signup')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/signup`)

        .get('input[name=email]')
        .type('regular@gmail.com')

        .get('input[name=confirmation]')
        .type('regular@gmail.com')

        .get('input[name=name]')
        .type('Projeto Pedal')

        .get('input[name=password]')
        .type('pp@password1')

        .get('button[name=create]')
        .click()

        .get('div[data-cy=email]>p[role=alert]')
        .should('exist');
    });

    it('should fail if emails don\t match', () => {
      cy.visit('/signup')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/signup`)

        .get('input[name=email]')
        .type('a-email@gmail.com')

        .get('input[name=confirmation]')
        .type('other-email@gmail.com')

        .get('input[name=name]')
        .type('Projeto Pedal')

        .get('input[name=password]')
        .type('pp@password1')

        .get('button[name=create]')
        .click()

        .get('div[data-cy=confirmation]>p[role=alert]')
        .should('exist');
    });
  });

});

export {};
