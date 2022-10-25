describe('Event', () => {
  beforeEach(() => {
    cy.task('db:reset');
  });

  context('General', () => {
    it('should load event', () => {
      const name = 'Love Tiles Douro Granfondo 2023';
      const description =
        'O Peso da Régua será ponto de partida e de reencontro, depois de serem atravessados os concelhos de Lamego, Armamar, ' +
        'Tabuaço, Penedono, Foz Coa e São João da Pesqueira.';

      cy.login()
        .visit('/event/love-tiles-douro-granfondo-2023')
        .wasImageLoaded('img[data-cy=images]')

        .get('button[name=action]')
        .should('exist')

        .get('button[name=share]')
        .should('exist')

        .get('[data-cy=name]')
        .contains(name)

        .get('[data-cy=date]')
        .contains('30 Outubro, 2022')

        .get('[data-cy=location]')
        .contains('Chaves')

        .get('[data-cy=price-from]')
        .contains('Desde')

        .get('[data-cy=price]')
        .contains('10€')

        .get('[data-cy=races-button]')
        .should('exist')

        .get('[data-cy=about]')
        .contains('Sobre')

        .get('[data-cy=description]')
        .contains(description)

        .get('[data-cy=races]')
        .contains('Distâncias')

        .get('div[data-cy=races-list]')
        .should('exist')

        .get('[data-cy=perks]')
        .contains('Comodidades')

        .get('div[data-cy=perks-list]')
        .should('exist')

        .get('[data-cy=directions-title]')
        .contains('Como chegar')

        .get('[data-cy=directions]')
        .contains('Carro: Saida pela A3 direção a Braga')

        .get('[data-cy=documents]')
        .contains('Documentos')

        .get('div[data-cy=documents-list]')
        .should('exist');
    });
  });
});
