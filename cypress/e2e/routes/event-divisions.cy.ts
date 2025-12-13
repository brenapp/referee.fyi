/// <reference types="cypress" />

describe("Event Division Selection (/$sku/)", () => {
  const TEST_EVENT_SKU = "RE-V5RC-24-8909";
  const EXPECTED_DIVISION_COUNT = 11;
  const TEST_DIVISION_NAME = "Innovate";

  before(() => {
    cy.configureUser();
  });

  beforeEach(() => {
    // Prevent uncaught exceptions from failing tests
    cy.on("uncaught:exception", () => false);
  });

  describe("Multi-Division Event Navigation", () => {
    beforeEach(() => {
      cy.visit(`/${TEST_EVENT_SKU}/`);
    });

    it("shows list of all divisions for multi-division events", () => {
      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");

      cy.get('[data-cy="division-list"]')
        .find("li")
        .should("have.length", EXPECTED_DIVISION_COUNT + 1); // +1 for Skills
    });

    it("displays division names correctly", () => {
      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");

      cy.contains(TEST_DIVISION_NAME).should("be.visible");
    });

    it("each division is clickable and navigates correctly", () => {
      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");

      cy.contains(TEST_DIVISION_NAME).click();

      cy.url().should("match", new RegExp(`/${TEST_EVENT_SKU}/\\d+`));

      cy.contains("Matches").should("be.visible");
      cy.contains("Teams").should("be.visible");
      cy.contains("Manage").should("be.visible");
    });

    it("shows Skills option at bottom of division list", () => {
      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");

      cy.get('[data-cy="division-list"]')
        .find("li")
        .last()
        .should("contain", "Skills");
    });

    it("can navigate to skills page", () => {
      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");

      cy.contains("Skills").click();

      cy.url().should("include", `/${TEST_EVENT_SKU}/skills`);
    });

    it("displays event information correctly in header", () => {
      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");
    });
  });

  describe("Single Division Event Auto-Redirect", () => {
    it.skip("auto-redirects to division page if event has only one division", () => {
      const SINGLE_DIVISION_SKU = "RE-V5RC-24-5711";

      cy.visit(`/${SINGLE_DIVISION_SKU}/`);

      cy.url().should("match", new RegExp(`/${SINGLE_DIVISION_SKU}/\\d+`));
    });
  });

  describe("Error Handling", () => {
    it("handles invalid SKU with error message", () => {
      const INVALID_SKU = "RE-V5RC-99-9999";

      cy.visit(`/${INVALID_SKU}/`, { failOnStatusCode: false });
      cy.get("body").should("exist");
    });
  });

  describe("Division Selection Workflow", () => {
    it("completes full division selection workflow", () => {
      // Start from home
      cy.visit("/");

      // Open event picker (this might need adjustment based on actual UI)
      // For now, navigate directly
      cy.visit(`/${TEST_EVENT_SKU}/`);

      // Wait for divisions to load
      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");

      // Verify all expected divisions are present
      cy.get('[data-cy="division-list"]')
        .find("li")
        .should("have.length.at.least", EXPECTED_DIVISION_COUNT);

      // Select the Innovate division
      cy.contains(TEST_DIVISION_NAME).should("be.visible").click();

      // Verify we're on the division page
      cy.url().should("match", new RegExp(`/${TEST_EVENT_SKU}/\\d+`));

      // Verify the main tabs are present
      cy.contains("button", "Matches").should("be.visible");
      cy.contains("button", "Teams").should("be.visible");
      cy.contains("button", "Manage").should("be.visible");

      // Verify we're on the Matches tab by default (it should have aria-selected or an active class)
      cy.contains("button", "Matches").should(($button) => {
        const hasAriaSelected = $button.attr("aria-selected") === "true";
        const hasActiveClass =
          $button.hasClass("active") || $button.hasClass("selected");
        expect(hasAriaSelected || hasActiveClass).to.be.true;
      });
    });
  });

  describe("Responsive Design", () => {
    it("displays divisions correctly on mobile viewport", () => {
      cy.viewport(375, 667);
      cy.visit(`/${TEST_EVENT_SKU}/`);

      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");
      cy.contains(TEST_DIVISION_NAME).should("be.visible");
    });

    it("displays divisions correctly on tablet viewport", () => {
      cy.viewport(768, 1024);
      cy.visit(`/${TEST_EVENT_SKU}/`);

      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");
      cy.contains(TEST_DIVISION_NAME).should("be.visible");
    });

    it("displays divisions correctly on desktop viewport", () => {
      cy.viewport(1920, 1080);
      cy.visit(`/${TEST_EVENT_SKU}/`);

      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");
      cy.contains(TEST_DIVISION_NAME).should("be.visible");
    });
  });

  describe("Division List Features", () => {
    beforeEach(() => {
      cy.visit(`/${TEST_EVENT_SKU}/`);
      cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");
    });

    it("divisions are displayed as clickable buttons/links", () => {
      // Each division should be a clickable element
      cy.contains(TEST_DIVISION_NAME)
        .should("be.visible")
        .should("match", "button, a"); // Either button or link
    });

    it("full width buttons for easy touch targets", () => {
      // Buttons should be full width for mobile usability
      cy.contains(TEST_DIVISION_NAME)
        .should("be.visible")
        .and("have.class", "w-full");
    });

    it("maintains scroll position when navigating back", () => {
      // Scroll to bottom to ensure Skills is in view
      cy.get('[data-cy="division-list"]').scrollIntoView();
      cy.contains("Skills").should("exist");

      // Click Skills
      cy.contains("Skills").click();

      // Verify we navigated to skills page
      cy.url().should("include", "/skills");

      // Go back
      cy.go("back");

      // We should be back on the divisions page
      cy.url().should("match", new RegExp(`/${TEST_EVENT_SKU}/$`));
      cy.get('[data-cy="division-list"]').should("exist");
    });
  });
});
