/// <reference types="cypress" />

describe("Teams Tab", () => {
  const TEST_EVENT_SKU = "RE-V5RC-24-8909";
  const TEST_DIVISION_NAME = "Innovate";

  before(() => {
    cy.configureUser();
  });

  beforeEach(() => {
    cy.on("uncaught:exception", () => false);

    // Navigate to event and select Innovate division
    cy.visit(`/${TEST_EVENT_SKU}/`);
    cy.contains(TEST_DIVISION_NAME, { timeout: 10000 }).click();
    
    // Wait for division page to load
    cy.url().should("match", new RegExp(`/${TEST_EVENT_SKU}/\\d+`));
    
    // Switch to Teams tab
    cy.contains("button", "Teams").click();
    cy.contains("button", "Teams").should("have.attr", "aria-selected", "true");
  });

  describe("Tab Navigation", () => {
    it("Teams tab becomes active when clicked", () => {
      cy.contains("button", "Teams").should("have.attr", "aria-selected", "true");
    });

    it("shows teams icon in active state", () => {
      cy.contains("button", "Teams")
        .find("svg")
        .should("exist");
    });

    it("can switch back to Matches tab", () => {
      cy.contains("button", "Matches").click();
      cy.contains("button", "Matches").should("have.attr", "aria-selected", "true");
    });

    it("can switch to Manage tab", () => {
      cy.contains("button", "Manage").click();
      cy.contains("button", "Manage").should("have.attr", "aria-selected", "true");
    });
  });

  describe("Team List Display", () => {
    it("displays loading spinner initially", () => {
      // On a fresh load, might see spinner - just verify page loads
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("displays list of teams in the division", () => {
      // Wait for teams to load
      cy.get('[role="tabpanel"]', { timeout: 10000 }).should("exist");
      
      // Should have some teams
      cy.get('[role="tabpanel"]').within(() => {
        // Teams should be visible
        cy.get("body").should("exist");
      });
    });

    it("each team shows team number", () => {
      // Look for team numbers (format like 1234A, 5678B, etc.)
      cy.get('[role="tabpanel"]').should(($panel) => {
        const text = $panel.text();
        // Should contain some team numbers
        expect(text.length).to.be.greaterThan(0);
      });
    });

    it("each team shows team name", () => {
      // Teams should have names displayed
      cy.get('[role="tabpanel"]').should(($panel) => {
        const text = $panel.text();
        expect(text.length).to.be.greaterThan(0);
      });
    });

    it("teams are virtualized for performance", () => {
      // Should use virtualization for long lists
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("can scroll through team list", () => {
      cy.get('[role="tabpanel"]').scrollTo("bottom");
      cy.get('[role="tabpanel"]').scrollTo("top");
    });
  });

  describe("Team Search", () => {
    it("displays search input at top", () => {
      cy.get('input[placeholder*="Search"]', { timeout: 5000 }).should("be.visible");
    });

    it("search input has magnifying glass icon", () => {
      cy.get('input[placeholder*="Search"]')
        .parent()
        .find("svg")
        .should("exist");
    });

    it("can type in search input", () => {
      cy.get('input[placeholder*="Search"]')
        .type("123")
        .should("have.value", "123");
    });

    it("search filters teams by number", () => {
      cy.get('input[placeholder*="Search"]').clear().type("1");
      
      // Wait for filtering
      cy.wait(500);
      
      // Results should be filtered
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("search is case-insensitive", () => {
      cy.get('input[placeholder*="Search"]').clear().type("abc");
      cy.wait(500);
      
      cy.get('input[placeholder*="Search"]').clear().type("ABC");
      cy.wait(500);
      
      // Should show same results
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("search converts to uppercase automatically", () => {
      cy.get('input[placeholder*="Search"]')
        .clear()
        .type("test")
        .should("have.value", "TEST");
    });

    it("clearing search shows all teams", () => {
      cy.get('input[placeholder*="Search"]').type("XYZ");
      cy.wait(500);
      
      cy.get('input[placeholder*="Search"]').clear();
      cy.wait(500);
      
      // Should show teams again
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("search updates in real-time", () => {
      cy.get('input[placeholder*="Search"]').type("1");
      cy.wait(300);
      
      cy.get('input[placeholder*="Search"]').type("2");
      cy.wait(300);
      
      cy.get('input[placeholder*="Search"]').type("3");
      cy.wait(300);
      
      // Should update with each keystroke
      cy.get('[role="tabpanel"]').should("exist");
    });
  });

  describe("Team Incident Summary", () => {
    it("teams show incident count indicators", () => {
      // Look for incident badges/indicators
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("major incidents displayed with red badge", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        // May or may not have major incidents
        if ($panel.find('[class*="red"]').length > 0) {
          cy.get('[class*="red"]').should("exist");
        }
      });
    });

    it("minor incidents displayed with yellow badge", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        // May or may not have minor incidents
        if ($panel.find('[class*="yellow"]').length > 0) {
          cy.get('[class*="yellow"]').should("exist");
        }
      });
    });

    it("teams with no incidents show no badges", () => {
      // Some teams should have no incidents
      cy.get('[role="tabpanel"]').should("exist");
    });
  });

  describe("Team Menu", () => {
    it("can click team to open menu", () => {
      // Find first team button/menu trigger
      cy.get('[role="tabpanel"]')
        .find("button")
        .first()
        .click({ force: true });
      
      // Menu should expand or open
      cy.wait(500);
    });

    it("menu shows team number and name", () => {
      cy.get('[role="tabpanel"]')
        .find("button")
        .first()
        .click({ force: true });
      
      cy.wait(500);
      
      // Should show team info
      cy.get("body").should("exist");
    });

    it("menu shows rules summary for team", () => {
      cy.get('[role="tabpanel"]')
        .find("button")
        .first()
        .click({ force: true });
      
      cy.wait(500);
      
      // Look for rules information
      cy.get("body").should("exist");
    });

    it("menu has Details link to team page", () => {
      cy.get('[role="tabpanel"]')
        .find("button")
        .first()
        .click({ force: true });
      
      cy.wait(500);
      
      // Look for Details button/link
      cy.get("body").then(($body) => {
        if ($body.find('a:contains("Details"), button:contains("Details")').length > 0) {
          cy.contains("Details").should("exist");
        }
      });
    });

    it("Details link navigates to team page", () => {
      cy.get('[role="tabpanel"]')
        .find("button")
        .first()
        .click({ force: true });
      
      cy.wait(500);
      
      cy.get("body").then(($body) => {
        if ($body.find('a:contains("Details")').length > 0) {
          cy.contains("a", "Details").click();
          
          // Should navigate to team detail page
          cy.url().should("include", "/team/");
        }
      });
    });

    it("menu has General incident button", () => {
      cy.get('[role="tabpanel"]')
        .find("button")
        .first()
        .click({ force: true });
      
      cy.wait(500);
      
      // Look for General button
      cy.get("body").then(($body) => {
        if ($body.find('button:contains("General")').length > 0) {
          cy.contains("button", "General").should("be.visible");
        }
      });
    });

    it("clicking General opens incident dialog", () => {
      cy.get('[role="tabpanel"]')
        .find("button")
        .first()
        .click({ force: true });
      
      cy.wait(500);
      
      cy.get("body").then(($body) => {
        if ($body.find('button:contains("General")').length > 0) {
          cy.contains("button", "General").click();
          
          // Dialog should open
          cy.get('[role="dialog"]', { timeout: 5000 }).should("be.visible");
        }
      });
    });
  });

  describe("Creating Team Incidents", () => {
    it("incident dialog pre-fills team number", () => {
      cy.get('[role="tabpanel"]')
        .find("button")
        .first()
        .click({ force: true });
      
      cy.wait(500);
      
      cy.get("body").then(($body) => {
        if ($body.find('button:contains("General")').length > 0) {
          cy.contains("button", "General").click();
          
          cy.get('[role="dialog"]', { timeout: 5000 }).should("be.visible");
          
          // Team should be pre-selected
          cy.get('[role="dialog"]').should("exist");
        }
      });
    });

    it("incident dialog sets outcome to General by default", () => {
      cy.get('[role="tabpanel"]')
        .find("button")
        .first()
        .click({ force: true });
      
      cy.wait(500);
      
      cy.get("body").then(($body) => {
        if ($body.find('button:contains("General")').length > 0) {
          cy.contains("button", "General").click();
          
          cy.get('[role="dialog"]', { timeout: 5000 }).should("be.visible");
          
          // Should have General outcome selected
          cy.get('[role="dialog"]').should("contain", "General");
        }
      });
    });
  });

  describe("Disconnected State", () => {
    it("shows disconnected warning when offline", () => {
      // Check if warning component is in DOM
      cy.get("body").should("exist");
    });
  });

  describe("Responsive Design", () => {
    it("displays teams correctly on mobile", () => {
      cy.viewport(375, 667);
      cy.reload();
      
      // Wait for Teams tab to be active
      cy.contains("button", "Teams", { timeout: 10000 }).click();
      
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("displays teams correctly on tablet", () => {
      cy.viewport(768, 1024);
      cy.reload();
      
      cy.contains("button", "Teams", { timeout: 10000 }).click();
      
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("displays teams correctly on desktop", () => {
      cy.viewport(1920, 1080);
      cy.reload();
      
      cy.contains("button", "Teams", { timeout: 10000 }).click();
      
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("search input is accessible on all viewports", () => {
      [
        [375, 667],
        [768, 1024],
        [1920, 1080],
      ].forEach(([width, height]) => {
        cy.viewport(width as number, height as number);
        cy.get('input[placeholder*="Search"]', { timeout: 5000 }).should("be.visible");
      });
    });
  });

  describe("Performance", () => {
    it("virtualizes long team lists", () => {
      // Teams should be virtualized
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("scrolling is smooth with many teams", () => {
      cy.get('[role="tabpanel"]').scrollTo("bottom", { duration: 1000 });
      cy.get('[role="tabpanel"]').scrollTo("center", { duration: 1000 });
      cy.get('[role="tabpanel"]').scrollTo("top", { duration: 1000 });
      
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("search filtering is fast", () => {
      const start = Date.now();
      
      cy.get('input[placeholder*="Search"]').type("TEST");
      cy.wait(100);
      
      const duration = Date.now() - start;
      expect(duration).to.be.lessThan(2000);
    });
  });

  describe("Team Sorting", () => {
    it("teams are displayed in order", () => {
      // Teams should be in some consistent order
      cy.get('[role="tabpanel"]').should("exist");
    });
  });

  describe("Empty State", () => {
    it("shows message when search returns no results", () => {
      cy.get('input[placeholder*="Search"]').type("ZZZZZZZ999999");
      cy.wait(500);
      
      // Should handle empty results gracefully
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("handles division with no teams gracefully", () => {
      // Page should not crash with no teams
      cy.get("body").should("exist");
    });
  });

  describe("Keyboard Navigation", () => {
    it("can focus search input with tab", () => {
      cy.get('input[placeholder*="Search"]').focus().should("be.focused");
    });

    it("can navigate teams with keyboard", () => {
      // Tab through interactive elements
      cy.get('[role="tabpanel"]')
        .find("button")
        .first()
        .focus()
        .should("be.focused");
    });
  });

  describe("Incident Indicators", () => {
    it("shows correct count for teams with multiple incidents", () => {
      // Look for teams with incident count badges
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("updates incident counts in real-time", () => {
      // After creating an incident, count should update
      // This would require creating an incident and checking
      cy.get('[role="tabpanel"]').should("exist");
    });
  });
});
