import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config();

const app = express();
app.use(cors());

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * 단일 페이지의 블록 내용을 HTML로 변환해서 반환하는 API
 * GET /notion/:pageId
 */
app.get("/notion/:pageId", async (req, res) => {
  const { pageId } = req.params;

  try {
    const blocks = [];
    let cursor = undefined;

    // 1. 블록 전체 가져오기
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

    // 2. Notion 블록들을 매우 단순한 HTML로 변환
    const html = blocks.map(blockToHtml).join("");

    res.json({ html });
  } catch (error) {
    console.error(error.body || error);
    res.status(500).json({ error: "Failed to load Notion content" });
  }
});

// Notion 블록 → HTML 변환 (최소 버전)
function blockToHtml(block) {
  const { type } = block;

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

  // 필요한 타입 계속 추가 가능 (numbered_list_item, quote, code 등)
  return "";
}

function richTextToPlain(richTexts = []) {
  return richTexts
    .map((t) => t.plain_text.replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .join("");
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Notion proxy listening on port ${port}`);
});
