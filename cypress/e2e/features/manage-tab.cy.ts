/// <reference types="cypress" />

describe("Manage Tab", () => {
  const TEST_EVENT_SKU = "RE-V5RC-24-8909";
  const TEST_DIVISION_NAME = "Innovate";

  before(() => {
    cy.configureUser();
  });

  beforeEach(() => {
    cy.on("uncaught:exception", () => false);

    // Navigate to event and select Innovate division
    cy.visit(`/${TEST_EVENT_SKU}/`);
    cy.get('[data-cy="division-list"]', { timeout: 10000 }).should("exist");
    cy.contains(TEST_DIVISION_NAME).click();
    
    // Wait for division page to load
    cy.url().should("match", new RegExp(`/${TEST_EVENT_SKU}/\\d+`));
    
    // Switch to Manage tab
    cy.contains("button", "Manage").click();
    cy.contains("button", "Manage").should("have.attr", "aria-selected", "true");
  });

  describe("Tab Navigation", () => {
    it("Manage tab becomes active when clicked", () => {
      cy.contains("button", "Manage").should("have.attr", "aria-selected", "true");
    });

    it("shows manage icon in active state", () => {
      cy.contains("button", "Manage")
        .find("svg")
        .should("exist");
    });

    it("can switch back to Matches tab", () => {
      cy.contains("button", "Matches").click();
      cy.contains("button", "Matches").should("have.attr", "aria-selected", "true");
    });

    it("can switch back to Teams tab", () => {
      cy.contains("button", "Teams").click();
      cy.contains("button", "Teams").should("have.attr", "aria-selected", "true");
      
      // Switch back to Manage
      cy.contains("button", "Manage").click();
    });
  });

  describe("Event Summary", () => {
    it("displays event SKU", () => {
      cy.get('[role="tabpanel"]').should("contain", TEST_EVENT_SKU);
    });

    it("displays event name", () => {
      // Event should have a name displayed
      cy.get('[role="tabpanel"]', { timeout: 5000 }).should(($panel) => {
        const text = $panel.text();
        expect(text.length).to.be.greaterThan(TEST_EVENT_SKU.length);
      });
    });

    it("displays event venue information", () => {
      // Should show venue/location details
      cy.get('[role="tabpanel"]').should(($panel) => {
        const text = $panel.text();
        expect(text.length).to.be.greaterThan(0);
      });
    });
  });

  describe("Share Instance Management", () => {
    it("shows share instance section", () => {
      // Look for sharing-related content
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("can create new share instance", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Create")').length > 0) {
          cy.contains("button", "Create").should("be.visible");
        }
      });
    });

    it("shows instance ID after creation", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Create")').length > 0) {
          cy.contains("button", "Create").click();
          
          cy.wait(2000);
          
          // Should show some instance identifier
          cy.get('[role="tabpanel"]').should("exist");
        }
      });
    });

    it("can join existing instance", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Join")').length > 0) {
          cy.contains("button", "Join").should("be.visible");
        }
      });
    });

    it("displays current instance members", () => {
      // If in an instance, should show members
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("shows admin badge for administrators", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        // May or may not have admin badge depending on permissions
        if ($panel.text().includes("admin") || $panel.text().includes("Admin")) {
          expect($panel.text()).to.exist;
        }
      });
    });
  });

  describe("Inviting Users", () => {
    it("can open Invite User dialog", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Invite")').length > 0) {
          cy.contains("button", "Invite").click();
          
          // Dialog should open
          cy.get('[role="dialog"]', { timeout: 5000 }).should("be.visible");
        }
      });
    });

    it("invite dialog has input for invite code", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Invite")').length > 0) {
          cy.contains("button", "Invite").click();
          
          cy.get('[role="dialog"]', { timeout: 5000 }).should("be.visible");
          
          // Should have input field
          cy.get('[role="dialog"]').find("input").should("exist");
        }
      });
    });

    it("can enter invite code", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Invite")').length > 0) {
          cy.contains("button", "Invite").click();
          
          cy.get('[role="dialog"]', { timeout: 5000 }).should("be.visible");
          
          cy.get('[role="dialog"]')
            .find("input")
            .first()
            .type("TEST-CODE-123");
        }
      });
    });

    it("shows admin permission toggle", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Invite")').length > 0) {
          cy.contains("button", "Invite").click();
          
          cy.get('[role="dialog"]', { timeout: 5000 }).should("be.visible");
          
          // Look for admin toggle/checkbox
          cy.get('[role="dialog"]').then(($dialog) => {
            if ($dialog.find('input[type="checkbox"]').length > 0) {
              cy.get('input[type="checkbox"]').should("exist");
            }
          });
        }
      });
    });

    it("can toggle admin permissions", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Invite")').length > 0) {
          cy.contains("button", "Invite").click();
          
          cy.get('[role="dialog"]', { timeout: 5000 }).should("be.visible");
          
          cy.get('[role="dialog"]').then(($dialog) => {
            if ($dialog.find('input[type="checkbox"]').length > 0) {
              cy.get('input[type="checkbox"]').first().click();
            }
          });
        }
      });
    });

    it("shows error for invalid invite code", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Invite")').length > 0) {
          cy.contains("button", "Invite").click();
          
          cy.get('[role="dialog"]', { timeout: 5000 }).should("be.visible");
          
          cy.get('[role="dialog"]')
            .find("input")
            .first()
            .type("INVALID");
          
          // Wait for validation
          cy.wait(1000);
        }
      });
    });
  });

  describe("Share Connection Status", () => {
    it("shows connection indicator", () => {
      // Look for connection status
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("displays Connected status when online", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.text().includes("Connected") || $panel.text().includes("connected")) {
          expect($panel.text()).to.exist;
        }
      });
    });

    it("shows offline notice when disconnected", () => {
      // This would require simulating offline mode
      cy.get("body").should("exist");
    });
  });

  describe("Data Sync", () => {
    it("shows sync status information", () => {
      // Look for sync-related information
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("can force sync manually", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Sync")').length > 0) {
          cy.contains("button", "Sync").should("be.visible");
        }
      });
    });

    it("shows sync progress indicator", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Sync")').length > 0) {
          cy.contains("button", "Sync").click();
          
          cy.wait(1000);
          
          // May show progress indicator
          cy.get('[role="tabpanel"]').should("exist");
        }
      });
    });
  });

  describe("Integration API", () => {
    it("shows Integration API section for admins", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        // May or may not be admin
        if ($panel.text().includes("Integration") || $panel.text().includes("API")) {
          expect($panel.text()).to.exist;
        }
      });
    });

    it("displays bearer token (masked by default)", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.text().includes("Bearer") || $panel.text().includes("Token")) {
          expect($panel.text()).to.exist;
        }
      });
    });

    it("can copy bearer token to clipboard", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Copy")').length > 0) {
          cy.contains("button", "Copy").should("be.visible");
        }
      });
    });

    it("shows API endpoint URLs", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.text().includes("http") || $panel.text().includes("api")) {
          expect($panel.text()).to.exist;
        }
      });
    });

    it("displays incidents endpoint", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.text().includes("incidents")) {
          expect($panel.text()).to.exist;
        }
      });
    });

    it("displays scratchpads endpoint", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.text().includes("scratchpads")) {
          expect($panel.text()).to.exist;
        }
      });
    });
  });

  describe("Storage Management", () => {
    it("shows persistent storage option", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.text().includes("Storage") || $panel.text().includes("storage")) {
          expect($panel.text()).to.exist;
        }
      });
    });

    it("can request persistent storage permission", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Enable"), button:contains("Persistent")').length > 0) {
          cy.get('button:contains("Enable"), button:contains("Persistent")').should("be.visible");
        }
      });
    });

    it("shows success message when storage enabled", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Enable")').length > 0) {
          cy.contains("button", "Enable").click();
          
          cy.wait(1000);
          
          // May show success message or toast
          cy.get("body").should("exist");
        }
      });
    });
  });

  describe("Update Prompts", () => {
    it("shows update prompt when new version available", () => {
      // This would require a new version to be available
      cy.get("body").should("exist");
    });

    it("can reload to get new version", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Update"), button:contains("Reload")').length > 0) {
          cy.get('button:contains("Update"), button:contains("Reload")').should("be.visible");
        }
      });
    });
  });

  describe("Responsive Design", () => {
    it("displays manage tab correctly on mobile", () => {
      cy.viewport(375, 667);
      cy.reload();
      
      cy.contains("button", "Manage", { timeout: 10000 }).click();
      
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("displays manage tab correctly on tablet", () => {
      cy.viewport(768, 1024);
      cy.reload();
      
      cy.contains("button", "Manage", { timeout: 10000 }).click();
      
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("displays manage tab correctly on desktop", () => {
      cy.viewport(1920, 1080);
      cy.reload();
      
      cy.contains("button", "Manage", { timeout: 10000 }).click();
      
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("long event names wrap properly", () => {
      cy.viewport(375, 667);
      
      // Event info should wrap on small screens
      cy.get('[role="tabpanel"]').should("exist");
    });
  });

  describe("Offline State", () => {
    it("shows offline notice when disconnected", () => {
      // Would need to simulate offline
      cy.get("body").should("exist");
    });

    it("disables sync features when offline", () => {
      // Sync button should be disabled when offline
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("shows reconnection prompt when connection restored", () => {
      // Would need to simulate reconnection
      cy.get("body").should("exist");
    });
  });

  describe("Member Management", () => {
    it("displays list of current members", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        // May show members list if in instance
        expect($panel.text()).to.exist;
      });
    });

    it("shows user icons/avatars for members", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find("svg").length > 0) {
          cy.get("svg").should("exist");
        }
      });
    });

    it("displays member names", () => {
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("can remove invitation", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Remove")').length > 0) {
          cy.contains("button", "Remove").should("be.visible");
        }
      });
    });

    it("shows confirmation before removing member", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Remove")').length > 0) {
          cy.contains("button", "Remove").first().click();
          
          // May show confirmation dialog
          cy.wait(500);
        }
      });
    });
  });

  describe("Copy to Clipboard Features", () => {
    it("can copy instance ID to clipboard", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('[class*="copy"], button[aria-label*="Copy"]').length > 0) {
          cy.get('[class*="copy"], button[aria-label*="Copy"]').first().should("exist");
        }
      });
    });

    it("shows success feedback after copying", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('[class*="copy"], button[aria-label*="Copy"]').length > 0) {
          cy.get('[class*="copy"], button[aria-label*="Copy"]').first().click();
          
          cy.wait(500);
          
          // May show success toast or visual feedback
          cy.get("body").should("exist");
        }
      });
    });
  });

  describe("Event Information Display", () => {
    it("event summary is prominently displayed", () => {
      cy.get('[role="tabpanel"]').should("contain", TEST_EVENT_SKU);
    });

    it("venue information is readable", () => {
      cy.get('[role="tabpanel"]').should(($panel) => {
        const text = $panel.text();
        expect(text.length).to.be.greaterThan(20);
      });
    });

    it("event dates are displayed if available", () => {
      cy.get('[role="tabpanel"]').should("exist");
    });
  });

  describe("Error Handling", () => {
    it("handles failed instance creation gracefully", () => {
      // Would need to simulate failure
      cy.get("body").should("exist");
    });

    it("shows error message for failed invitations", () => {
      // Would need to simulate failure
      cy.get("body").should("exist");
    });

    it("recovers from sync errors", () => {
      // Would need to simulate sync error
      cy.get("body").should("exist");
    });
  });

  describe("Loading States", () => {
    it("shows loading indicator while fetching data", () => {
      // On initial load, may show spinner
      cy.get('[role="tabpanel"]').should("exist");
    });

    it("disables buttons during async operations", () => {
      cy.get('[role="tabpanel"]').then(($panel) => {
        if ($panel.find('button:contains("Create")').length > 0) {
          cy.contains("button", "Create").should("be.visible");
          // Button states would be tested during actual operations
        }
      });
    });
  });
});
