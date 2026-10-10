// Screenshot helpers: padded crops, outlines and stacked composites.
const fs = require('node:fs');

// Screenshot the box that encloses every locator, padded on each side.
async function around(ctx, locators, name, pad = 16) {
  const list = Array.isArray(locators) ? locators : [locators];
  await list[0].scrollIntoViewIfNeeded();
  await ctx.page.waitForTimeout(300);
  const boxes = await Promise.all(list.map((l) => l.boundingBox()));
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  await ctx.page.screenshot({
    path: ctx.out(name),
    clip: {
      x: Math.max(left - pad, 0),
      y: Math.max(top - pad, 0),
      width: right - left + 2 * pad,
      height: bottom - top + 2 * pad,
    },
  });
}

// Screenshot from the top of one element to the bottom of another, as
// wide as their container.
async function span(ctx, container, top, bottom, name, pad = 16) {
  await top.scrollIntoViewIfNeeded();
  await ctx.page.waitForTimeout(300);
  const c = await container.boundingBox();
  const t = await top.boundingBox();
  const b = await bottom.boundingBox();
  await ctx.page.screenshot({
    path: ctx.out(name),
    clip: {
      x: c.x,
      y: t.y - pad,
      width: c.width,
      height: b.y + b.height - t.y + 2 * pad,
    },
  });
}

// The Material UI form control that wraps a labelled input.
const field = (page, label) =>
  page
    .getByLabel(label, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"MuiFormControl-root")][1]');

// Draw a coloured outline over a rectangle of the page.
async function outline(page, rect, colour) {
  await page.evaluate(
    ([r, c]) => {
      const mark = document.createElement('div');
      mark.className = 'doc-mark';
      Object.assign(mark.style, {
        position: 'fixed',
        zIndex: 99999,
        pointerEvents: 'none',
        left: `${r.x}px`,
        top: `${r.y}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        border: `3px solid ${c}`,
      });
      document.body.appendChild(mark);
    },
    [rect, colour],
  );
}

const clearOutlines = (page) =>
  page.evaluate(() =>
    document.querySelectorAll('.doc-mark').forEach((m) => m.remove()),
  );

async function outlineElement(page, locator, colour, pad = 4) {
  const b = await locator.boundingBox();
  const rect = {
    x: b.x - pad,
    y: b.y - pad,
    width: b.width + 2 * pad,
    height: b.height + 2 * pad,
  };
  await outline(page, rect, colour);
}

// Outline the typed text of an input rather than the whole input.
async function outlineText(page, input, colour) {
  const rect = await input.evaluate((el) => {
    const style = getComputedStyle(el);
    const canvas = document.createElement('canvas').getContext('2d');
    canvas.font = `${style.fontSize} ${style.fontFamily}`;
    const width = Math.max(canvas.measureText(el.value).width, 8);
    const box = el.getBoundingClientRect();
    const left = box.left + parseFloat(style.paddingLeft) - 5;
    return {
      x: left,
      y: box.top + 6,
      width: width + 10,
      height: box.height - 12,
    };
  });
  await outline(page, rect, colour);
}

// Stack image files vertically into one screenshot, then delete them.
async function stack(ctx, files, name) {
  const images = files.map((f) => {
    const data = fs.readFileSync(f).toString('base64');
    return `<img src="data:image/png;base64,${data}">`;
  });
  const page = await ctx.page.context().newPage();
  await page.setContent(
    '<body style="margin:0;background:#fff"><div id="s" ' +
      'style="display:inline-flex;flex-direction:column">' +
      `${images.join('')}</div></body>`,
  );
  await page.locator('#s').screenshot({ path: ctx.out(name) });
  await page.close();
  files.forEach((f) => fs.unlinkSync(f));
}

// JupyterLab asks about news on first start; the prompt covers content.
async function dismissJupyterNews(scope) {
  const no = scope.getByRole('button', { name: 'No', exact: true });
  await no.click({ timeout: 3000 }).catch(() => {});
}

module.exports = {
  around,
  clearOutlines,
  dismissJupyterNews,
  field,
  outlineElement,
  outlineText,
  span,
  stack,
};
