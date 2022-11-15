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

    it('should allow to recover password', () => {

      cy.visitAndWaitForHydration('/recover')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/recover`)

        .get('input[name=email]')
        .should('exist')
        .type('regular@gmail.com')

        .intercept('POST', '/recover?*')
        .as('recoverPassword')

        .get('button[type=submit]')
        .click()

        .wait('@recoverPassword')

        .get('#success-message')

        .getRecoverPasswordUrl()
        .then((url) => {
          cy.visitAndWaitForHydration(url)
            .get('input[name=password]')
            .type('Password2')
            .get('input[name=confirmation]')
            .type('Password2')

            .intercept('GET', '/me?message=*')
            .as('newPassword')

            .get('button[type=submit]')
            .click()

            .wait('@newPassword')

            .url()
            .should('include', `${Cypress.config().baseUrl}/me`);
        });
    });

    it('should login user', () => {
      cy.visitAndWaitForHydration('/login')

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
      cy.visit('/login').url().should('eq', `${Cypress.config().baseUrl}/me`);
    });

    it('should be able to access it\'s profile', () => {
      cy.visit('/me').url().should('eq', `${Cypress.config().baseUrl}/me`);
    });
  });

  context('When user wants to signup', () => {
    it('should allow to create a new user', () => {
      cy.visitAndWaitForHydration('/signup')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/signup`)

        .get('input[name=signup-email]')
        .type('a@gmail.com')

        .get('input[name=confirmation]')
        .type('a@gmail.com')

        .get('input[name=name]')
        .type('Projeto Pedal')

        .get('input[name=password]')
        .type('pp@password1')

        .intercept('GET', '/me?*')
        .as('signup')

        .get('button[name=create]')
        .click()

        .wait('@signup')

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
        .should('exist');
    });

    it('should fail if user already exists', () => {
      cy.visitAndWaitForHydration('/signup')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/signup`)

        .get('input[name=signup-email]')
        .type('regular@gmail.com')

        .get('input[name=confirmation]')
        .type('regular@gmail.com')

        .get('input[name=name]')
        .type('Projeto Pedal')

        .get('input[name=password]')
        .type('pp@password1')

        .intercept('GET', '/signup?*_data=routes*')
        .as('signup')

        .get('button[name=create]')
        .click()

        .wait('@signup')

        .get('div[data-cy=email]>p[role=alert]')
        .should('exist');
    });

    it('should fail if emails don\t match', () => {
      cy.visitAndWaitForHydration('/signup')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/signup`)

        .get('input[name=signup-email]')
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
