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
      // TODO
    });

    it('should favorite a group unauthenticated', () => {
      // TODO
    });

    it('should remove group from favorites', () => {
      // TODO
    });


  });

  context('Security', () => {
    it('should not access /m/groups when not authenticated', () => {
      // TODO
    });

    it('should not allow a user from editing another user group', () => {
      // TODO
    });
  });

  context('Maintenance', () => {
    beforeEach(() => cy.login());

    it('should create a group', () => {
      cy
        .visit('/m/groups')
        .get('button[name=create-group]')
        .click()

        // fill the form
        .get('input[name=name]').type('a new group')

        .pickOptionFromSelect('sport', 4)
        .pickOptionFromSelect('type', 2)
        .pickOptionFromSelect('spirit', 3)

        .pickLocationInMap('open-map')

        .get('input[name=near]').type('gaz station aaa')

        .get('button[name=add-new-schedule]').click()
        .get('button[name="remove-schedule"]')

        .pickOptionFromSelect('dayOfWeek', 3)
        .pickOptionFromSelect('hour', 11)
        .pickOptionFromSelect('minute', 31)

        .get('input[name=whatsapp]').type('https://...')

        .get('input[name="/file/image/0"]')
        .selectFile('cypress/assets/cycling.jpeg', { force: true })

        .get('textarea[name=description]').type('we do things')

        // save group (prepare to wait for the redirect to happen when group is created)
        .intercept('GET', '/m/groups?message=*').as('createGroup')
        .get('button[name=save-group]').click()

        .wait('@createGroup', { timeout: 20000 })

        // validate that form was properly created
        .get('div[data-cy="group-entry"]')
        .should('exist')

        .visit('/group/a-new-group')
        .wasImageLoaded('img[data-cy=image1]')
        .get('p[data-cy=schedule]')
        .contains('Terça-Feira, 10:30 | Domingo, 09:00')
      ;
    });

    it('should update group', () => {
      // TODO
    });
    it('should delete group', () => {
      // TODO
    });

  });
});

export {};
