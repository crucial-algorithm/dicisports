describe('Groups', () => {
  beforeEach(() => {
    cy.task('db:reset');
  });

  context('General', () => {
    it('should load groups in mobile', () => {
      cy.login()
        .visitAndWaitForHydration('/')
        .get('[data-cy=mobile-menu]')
        .click()
        .get('[data-cy=m-groups]')
        .click()
        .get('button[name=create-group]')
        .should('exist');
    });

    it.skip('should load groups in desktop', () => {
      cy.viewport(1024, 768)
        .login()
        .visitAndWaitForHydration('/')
        .get('[data-cy=groups]')
        .click()
        .get('button[name=create-group]')
        .should('exist');
    });

    it('should favorite group', () => {
      cy.intercept('GET', '/?actionId=search*')
        .as('search')
        .login()
        .visitAndWaitForHydration('/?actionId=search&sport=6')

        .get('#add-favorite-05b72760f9674a2abdcc')
        .click()

        .wait('@search')

        .get('#remove-favorite')
        .should('exist')

        .visitAndWaitForHydration('/g/groups')

        .get('button[name=groupId]')
        .should('have.length', 2);
    });

    it('should remove group from favorites', () => {
      cy.intercept('GET', '/g/groups?message=*')
        .as('removeFavorite')

        .login()
        .visitAndWaitForHydration('/g/groups')

        .get('#remove-favorite-0')
        .click()

        .wait('@removeFavorite')
        .reload()

        .get('[data-cy=empty-favorites]')
        .should('exist');
    });
  });

  context('Security', () => {
    it('should not access /g/groups when not authenticated', () => {
      cy.visitAndWaitForHydration('/g/groups')
        .url()
        .should('eq', `${Cypress.config().baseUrl}/login`);
    });

    it('should not allow a user from editing another user group', () => {
      cy.login()
        .visitAndWaitForHydration('/g/group/d888b22b730daaf3b70e')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/g/groups`);
    });
  });

  context('Maintenance', () => {
    beforeEach(() => cy.login());

    it('should create a group', () => {
      cy.visitAndWaitForHydration('/g/groups')
        .get('button[name=create-group]')
        .click()

        .waitForHydration()

        .url()
        .should('include', '/g/group/')

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

        .get('input[name=whatsapp]')
        .type('https://...')

        .get('input[name="/file/image/0"]')
        .selectFile('cypress/assets/cycling.jpeg', { force: true })

        .get('textarea[name=description]')
        .type('we do things')

        // save group (prepare to wait for the redirect to happen when group is created)
        .intercept('GET', '/g/groups?message=*')
        .as('createGroup')
        .get('button[name=save-group]')
        .click()

        .wait('@createGroup')

        // validate that form was properly created
        .get('div[data-cy="group-entry"]')
        .should('exist')

        .visitAndWaitForHydration('/group/a-new-group')
        .wasImageLoaded('img[data-cy=image1]')
        .get('p[data-cy=schedule]')
        .contains('Terça-Feira, 10:00 | Domingo, 09:00');
    });

    it('should update group', () => {
      const description = 'Grupo organizado pela bikebrothers';

      cy.visitAndWaitForHydration('/g/group/FkoxmH5db6RXqBpExion')
        .get('textarea[name=description]')
        .type(description)
        .intercept('GET', '/g/groups?message=*')
        .as('createGroup')
        .get('button[name=save-group]')
        .click()
        .wait('@createGroup')

        .url()
        .should('include', '/g/groups')

        .visitAndWaitForHydration('/group/bike-brothers-domingueira')
        .get('[data-cy=description]')
        .contains(description);
    });

    it('should delete group', () => {
      cy.intercept('GET', '/g/groups?message=*')
        .as('deleteGroup')

        .visitAndWaitForHydration('/g/group/FkoxmH5db6RXqBpExion')
        .get('button[name=delete]')
        .click()

        .get('.cy-delete-dialog')

        .get('button.cy-primary')
        .click()

        .wait('@deleteGroup')

        .visitAndWaitForHydration('/group/bike-brothers-domingueira')
        .get('p[data-cy=group-not-found]');
    });
  });
});

export {};
