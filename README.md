    # Playwright SDET Lab

    [![Playwright tests](https://github.com/mukeshn/playwright-sdet-lab/actions/workflows/playwright.yml/badge.svg)](https://github.com/mukeshn/playwright-sdet-lab/actions/workflows/playwright.yml)
    [![Live report](https://img.shields.io/badge/report-live-2ea44f?logo=github)](https://mukeshn.github.io/playwright-sdet-lab/)
    ![Playwright](https://img.shields.io/badge/Playwright-1.65-2EAD33?logo=playwright&logoColor=white)
    ![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
    ![Projects](https://img.shields.io/badge/projects-16-blue)
    [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

    Sixteen short, self-contained Playwright projects. Each one demonstrates one technique on a realistic screen. All of them share a bundled system under test (storefront, retail store ops, banking portal, Lightning CRM, Fiori apps), and each folder is its own Playwright **project**:

    ```bash
    npm ci
    npx playwright test                                   # everything
    npx playwright test --project=07-salesforce-shadow-dom
    npx playwright test --ui                              # pick and debug interactively
    ```

    | # | Project | Domain | Technique |
    |---|---|---|---|
    | [01](projects/01-retail-geolocation) | Store finder with geolocation | Retail | `geolocation` + `permissions` context options, denied permission path |
| [02](projects/02-ecommerce-network-mocking) | Stubbing the product API | E-commerce | `page.route` fulfil/abort/modify, `waitForResponse` |
| [03](projects/03-ecommerce-accessibility) | Accessibility audits with axe | E-commerce | `@axe-core/playwright`, scoped scans, keyboard focus order |
| [04](projects/04-retail-file-upload-download) | Bulk inventory CSV import and export | Retail | `setInputFiles` with in-memory buffers, `download` event |
| [05](projects/05-banking-auth-setup-project) | Login once, reuse everywhere | Banking | setup project + `dependencies`, API login, sessionStorage injection |
| [06](projects/06-banking-popups-new-tabs) | Statements in a new tab | Banking | `context.waitForEvent('page')`, popups, multi-page assertions |
| [07](projects/07-salesforce-shadow-dom) | Lightning components through shadow DOM | Salesforce | role/label locators piercing open shadow roots, combobox options |
| [08](projects/08-salesforce-iframe-frames) | Visualforce inside Lightning | Salesforce | `frameLocator`, `page.frame()`, nested frames |
| [09](projects/09-sap-fiori-tables) | Fiori list report: growing table and sorting | SAP S/4HANA | custom wait for app idle, table-to-array helpers |
| [10](projects/10-sap-odata-request-assertions) | Asserting the OData calls a Fiori app makes | SAP S/4HANA | `waitForRequest`, URL/headers inspection, request interception |
| [11](projects/11-ecommerce-data-driven-markets) | One test, ten markets | E-commerce | parametrised tests from JSON, `test.describe.parallel`, soft assertions |
| [12](projects/12-retail-i18n-locale-timezone) | Locale and time-zone emulation | Retail | `locale`, `timezoneId`, `Intl` formatting checks |
| [13](projects/13-ecommerce-mobile-devices) | Responsive checks on device profiles | E-commerce | `devices[...]`, `isMobile`, touch, viewport assertions |
| [14](projects/14-banking-clock-api) | Testing time-dependent UI with page.clock | Banking | `clock.install`, `fastForward`, `setFixedTime` |
| [15](projects/15-ecommerce-custom-fixtures-reporter) | Custom fixtures and a custom reporter | E-commerce | `test.extend` (test + worker scope), auto fixtures, `Reporter` API |
| [16](projects/16-retail-api-ui-hybrid) | Create via API, verify in UI | Retail | `request` fixture for setup, UI for verification, state transitions |

    ```mermaid
    pie title Projects by domain
      "E-commerce" : 6
      "Retail" : 4
      "Banking" : 3
      "Salesforce" : 2
      "SAP S/4HANA" : 2
    ```

    The full-size suites behind these techniques: [playwright-ecommerce-e2e](https://github.com/mukeshn/playwright-ecommerce-e2e) · [playwright-banking-portal](https://github.com/mukeshn/playwright-banking-portal) · [playwright-salesforce-lightning](https://github.com/mukeshn/playwright-salesforce-lightning) · [playwright-sap-fiori-s4hana](https://github.com/mukeshn/playwright-sap-fiori-s4hana)
