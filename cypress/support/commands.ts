declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>
    }
  }
}

function login() {
  cy.setCookie(
    'ds_root_session',
    'eyJfX3Nlc3Npb25faWRfXyI6ImM0ZTFiNTY4LTBlMzAtNDY2ZC04ZmYwLWUxMGYyMTJlM2M1ZiJ9.JjNS%2B5DEc7mf3OkCnGLesD5pPb0NFMVYMU0imAzvxKU'
  );
}

Cypress.Commands.add('login', login);

export {};
