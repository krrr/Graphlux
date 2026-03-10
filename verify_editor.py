from playwright.sync_api import sync_playwright, expect
import time

def test_dag_editor(page):
    page.goto("http://localhost:4200/tasks")

    # Click Create New Task
    page.locator("button:has-text('Create New Task')").click()

    # Fill task name
    page.locator("input[name='name']").fill("Playwright Test Task 3")
    page.locator("button:has-text('OK')").click()

    # Wait for task to appear and click to open editor
    page.locator("h3:has-text('Playwright Test Task 3')").first.click()

    # Verify we are in the editor
    expect(page.locator("button:has-text('Add Node')")).to_be_visible()

    # Verify Start Node exists automatically
    expect(page.locator("div[data-testid='node']:has-text('StartNode')")).to_be_visible()

    # Try adding a Finish Node
    page.locator("button:has-text('Add Node')").click()
    page.locator("li:has-text('Finish / Output')").click()

    # Verify Finish Node is added
    expect(page.locator("div[data-testid='node']:has-text('FinishNode')")).to_be_visible()

    # Click on Start Node
    page.locator("div[data-testid='node']:has-text('StartNode')").click()

    # Take screenshot
    page.screenshot(path="/tmp/dag_editor.png", full_page=True)
    print("Screenshot saved to /tmp/dag_editor.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        try:
            test_dag_editor(page)
        except Exception as e:
            page.screenshot(path="/tmp/dag_editor_error.png", full_page=True)
            print(f"Error: {e}")
            raise e
        finally:
            browser.close()