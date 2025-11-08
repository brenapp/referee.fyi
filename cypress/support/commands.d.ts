/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Configure a test user with a random name
     * @example cy.configureUser()
     */
    configureUser(): Chainable<void>;
  }
}
