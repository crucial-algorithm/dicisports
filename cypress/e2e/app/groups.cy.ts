describe('Groups', () => {
  beforeEach(() => {
    cy.task('db:reset');
  });

  context('General', () => {
    it('should load groups', () => {
      cy.login()
        .visit('/m/groups')
        .get('button[name=create-group]')
        .should('exist');
    });

    it('should favorite group', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .login()
        .visit('/')

        .get('#search-button')
        .click()

        .wait('@search')

        .get('#add-favorite-0')
        .click()

        .wait('@search')

        .visit('/m/groups')

        .get('button[name=groupId]')
        .should('have.length', 2);
    });

    it('should favorite a group unauthenticated: login', () => {
      cy.intercept('GET', '/*?coords=*')
        .as('search')
        .visit('/')

        .get('#search-button')
        .click()

        .wait('@search')

        .intercept('GET', '/login?a=favorite&g=*')
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

        .wait('@login', { timeout: 10000 })

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

        .intercept('GET', '/login?a=favorite&g=*')
        .as('login')

        .get('#add-favorite-0')
        .click()

        .wait('@login')

        .intercept('GET', '/signup?a=favorite&g=*')
        .as('signup')

        .get('#create-account')
        .click()

        .wait('@signup', { timeout: 7000 })

        .get('input[name=email]')
        .type('a@gmail.com')

        .get('input[name=confirmation]')
        .type('a@gmail.com')

        .get('input[name=name]')
        .type('Projeto Pedal')

        .get('input[name=password]')
        .type('pp@password1')

        .intercept('GET', '/me?*')
        .as('createAccount')

        .get('button[name=create]')
        .click()

        .wait('@createAccount', { timeout: 12000 })

        .visit('/m/groups')

        .get('button[name=groupId]')
        .should('have.length', 1);
    });

    it('should remove group from favorites', () => {
      cy.intercept('GET', '/m/groups?message=*')
        .as('removeFavorite')

        .login()
        .visit('/m/groups')

        .get('#remove-favorite-0')
        .click()

        .wait('@removeFavorite')
        .reload()

        .get('[data-cy=empty-favorites]')
        .should('exist');
    });
  });

  context('Security', () => {
    it('should not access /m/groups when not authenticated', () => {
      cy.visit('/m/groups')
        .url()
        .should('eq', `${Cypress.config().baseUrl}/login`);
    });

    it('should not allow a user from editing another user group', () => {
      cy.login()
        .visit('/m/group/d888b22b730daaf3b70e')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/m/groups`);
    });
  });

  context('Maintenance', () => {
    beforeEach(() => cy.login());

    it('should create a group', () => {
      cy.visit('/m/groups')
        .get('button[name=create-group]')
        .click()

        // fill the form
        .get('input[name=name]')
        .type('a new group')
        .should('have.value', 'a new group')

        .pickOptionFromSelect('sport', 4)
        .pickOptionFromSelect('type', 2)
        .pickOptionFromSelect('spirit', 3)

        .pickLocationInMap('open-map')

        .get('input[name=near]')
        .type('gaz station aaa')

        .get('button[name=add-new-schedule]')
        .click()
        .get('button[name="remove-schedule"]')

        .pickOptionFromSelect('dayOfWeek', 3)
        .pickOptionFromSelect('hour', 11)
        .pickOptionFromSelect('minute', 31)

        .get('input[name=whatsapp]')
        .type('https://...')

        .get('input[name="/file/image/0"]')
        .selectFile('cypress/assets/cycling.jpeg', { force: true })

        .get('textarea[name=description]')
        .type('we do things')

        // save group (prepare to wait for the redirect to happen when group is created)
        .intercept('GET', '/m/groups?message=*')
        .as('createGroup')
        .get('button[name=save-group]')
        .click()

        .wait('@createGroup', { timeout: 12000 })

        // validate that form was properly created
        .get('div[data-cy="group-entry"]')
        .should('exist')

        .visit('/group/a-new-group')
        .wasImageLoaded('img[data-cy=image1]')
        .get('p[data-cy=schedule]')
        .contains('Terça-Feira, 10:30 | Domingo, 09:00');
    });

    it('should update group', () => {
      const description = 'Grupo organizado pela bikebrothers';

      cy.visit('/m/group/FkoxmH5db6RXqBpExion')
        .get('textarea')
        .type(description)
        .intercept('GET', '/m/groups?message=*')
        .as('createGroup')
        .get('button[name=save-group]')
        .click()
        .wait('@createGroup')
        .visit('/group/bike-brothers-domingueira')
        .get('[data-cy=description]')
        .contains(description);
    });

    it('should delete group', () => {
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.visitAndWaitForHydration('/m/group/FkoxmH5db6RXqBpExion')
        .get('button[name=delete]')
        .click()

        .get('[data-cy=delete-dialog]')

        .intercept('GET', '/m/groups?message=*')
        .as('deleteGroup')
        .get('button[name=confirm-delete]')
        .click()

        .wait('@deleteGroup')

        .visit('/group/bike-brothers-domingueira')
        .get('p[data-cy=group-not-found]');
    });
  });
});

export {};
