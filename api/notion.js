const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// 리치 텍스트 → HTML 변환 간단 버전
function richTextToPlain(richTexts = []) {
  return richTexts
    .map((t) =>
      t.plain_text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    )
    .join("");
}

// 블록 → HTML 변환
function blockToHtml(block) {
  const type = block.type;

  if (type === "paragraph") {
    const text = richTextToPlain(block.paragraph.rich_text);
    return `<p>${text}</p>`;
  }

  if (type === "heading_1") {
    const text = richTextToPlain(block.heading_1.rich_text);
    return `<h1>${text}</h1>`;
  }

  if (type === "heading_2") {
    const text = richTextToPlain(block.heading_2.rich_text);
    return `<h2>${text}</h2>`;
  }

  if (type === "heading_3") {
    const text = richTextToPlain(block.heading_3.rich_text);
    return `<h3>${text}</h3>`;
  }

  if (type === "bulleted_list_item") {
    const text = richTextToPlain(block.bulleted_list_item.rich_text);
    return `<li>${text}</li>`;
  }

  return ""; // 추가 블록 타입은 추후 확장 가능
}

async function getBlocksHtml(pageId) {
  const blocks = [];
  let cursor;

  while (true) {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 50,
    });

    blocks.push(...response.results);

    if (!response.has_more) break;
    cursor = response.next_cursor;
  }

  // HTML 조합
  return blocks.map(blockToHtml).join("");
}

module.exports = async (req, res) => {
  const { pageId } = req.query;

  if (!pageId) {
    res.status(400).json({ error: "pageId query parameter is required" });
    return;
  }

  try {
    const html = await getBlocksHtml(pageId);
    res.status(200).json({ html });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load Notion content" });
  }
};
