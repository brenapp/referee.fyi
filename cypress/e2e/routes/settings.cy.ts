/// <reference types="cypress" />

describe("/settings", () => {
  beforeEach(() => {
    cy.configureUser();
  });

  it("has name", () => {
    cy.get("@configuredName").then((name) => {
      cy.get('[data-cy="settings-name-input"]').should("have.value", name);
    });
  });

  it("has public key", () => {
    cy.get('[data-cy="settings-key-button"]').should(($button) => {
      const text = $button.text().trim();
      expect(text.length).to.be.greaterThan(0);
    });
  });
});
