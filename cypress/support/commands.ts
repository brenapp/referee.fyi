/// <reference types="cypress" />
/// <reference path="./commands.d.ts" />

Cypress.Commands.addAll({
  configureUser() {
    const name = `cypress-${crypto.randomUUID()}`;
    cy.visit("/settings");
    cy.get('[data-cy="settings-name-input"]')
      .as("nameInput")
      .clear()
      .type(name)
      .blur();
    cy.wrap(name).as("configuredName");
  },
});
