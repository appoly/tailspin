/**
 * The storyboard: what to click and when to capture. Kept apart from the
 * capture plumbing in capture.mjs so shots can be re-cut without touching the
 * CDP code. Selectors lean on lucide's icon classes, which are stable, rather
 * than on Tailwind utility soup.
 */
import { diagonalSplit } from "./lib/split.mjs";

const SIDEBAR = {
  files: "button:has(svg.lucide-book-open)",
  forge: "button:has(svg.lucide-hammer)",
  connections: "button:has(svg.lucide-hard-drive)",
  downloads: "button:has(svg.lucide-download)",
  settings: "button:has(svg.lucide-settings)",
};

const PRODUCTION = "Acme Widgets — Production";

export function defineScenes({ scenes, cdp, shot, record, sleep, write }) {
  // Clicking straight after a reload occasionally lands before the list has
  // settled, so retry the open rather than failing the whole run.
  const openProduction = async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      await cdp.waitFor(() => cdp.centreOfText(PRODUCTION), { what: "production card" });
      await sleep(300);
      await cdp.clickText(PRODUCTION);
      try {
        await cdp.waitFor(() => cdp.centreOfText("Severity"), { what: "log table", timeoutMs: 6000 });
        await sleep(900);
        return;
      } catch (error) {
        if (attempt === 3) throw error;
      }
    }
  };

  const filterErrors = async () => {
    await cdp.clickText("ERROR", { selector: "button" });
    await sleep(700);
  };

  const expandFirstEntry = async () => {
    await cdp.clickText("Call to a member function", { selector: "td, tr, div" });
    await sleep(700);
  };

  scenes["connections"] = async () => {
    await shot("connections");
  };

  scenes["log-viewer"] = async () => {
    await openProduction();
    await shot("log-viewer");
  };

  scenes["log-filtered"] = async () => {
    await openProduction();
    await filterErrors();
    await shot("log-filtered");
  };

  scenes["log-entry"] = async () => {
    await openProduction();
    await filterErrors();
    await expandFirstEntry();
    await shot("log-entry");
  };

  scenes["forge"] = async () => {
    await cdp.click(SIDEBAR.forge);
    await sleep(900);
    await shot("forge");
  };

  scenes["settings"] = async () => {
    await cdp.click(SIDEBAR.settings);
    await sleep(700);
    await shot("settings");
  };

  scenes["command-palette"] = async () => {
    await openProduction();
    await cdp.press("k", { meta: true });
    await sleep(700);
    await shot("command-palette");
  };

  // Same screen twice, stitched along the diagonal: light top-left, dark
  // bottom-right.
  scenes["themes"] = async () => {
    await openProduction();

    await cdp.setTheme("light");
    await sleep(700);
    const light = await cdp.screenshot({ density: 2 });

    await cdp.setTheme("dark");
    await sleep(700);
    const dark = await cdp.screenshot({ density: 2 });

    write("themes.png", diagonalSplit(light, dark, { lineWidth: 3 }));
    await cdp.setTheme("dark");
  };

  // The README's animated tour.
  scenes["tour"] = async () => {
    await record(
      "tour",
      async () => {
        await sleep(900);
        await cdp.clickText(PRODUCTION);
        await cdp.waitFor(() => cdp.centreOfText("Severity"), { what: "log table" });
        await sleep(1400);
        await filterErrors();
        await sleep(900);
        await expandFirstEntry();
        await sleep(2200);
        await cdp.click(SIDEBAR.settings);
        await sleep(1500);
      },
      { fps: 10, maxWidth: 1000 }
    );
  };
}
