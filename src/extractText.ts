import fs from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
// the final object type that the function will return
export type ExtractTextResult = {
  filePath: string;
  numPages: number;
  totalTextItems: number;
  text: string;
};
// main function to extract text
export async function extractPdfText(
  filePath: string,
): Promise<ExtractTextResult> {
  // converting the text into bytes
  const data = new Uint8Array(await fs.readFile(filePath));

  const loadingTask = getDocument({
    data,
  });

  const pdf = await loadingTask.promise;
  // the number of pages for the pdf file
  const numPages = pdf.numPages;
  // to track and debug if the extraction work or its an empty file
  let totalTextItems = 0;
  //collecting the str from each text item
  const parts: string[] = [];

  try {
    // loop into every page to get the text content and then navigate to items to get the string value
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const tc = await page.getTextContent();
      //avoid crashing while iterating in case value is null or undefined
      // using as any [] , it should most of the time return str but some cased it return beginMarkedContent as an image
      const items = (tc.items ?? []) as any[];
      // increasing the total text items for each item
      totalTextItems += items.length;

      for (const it of items) {
        //check if there is an item and the string value is actually a string
        if (it && typeof it.str === "string") {
          // trim remove white spaces from the string
          const s = it.str.trim();
          // check after removing the white spaces if there is text left and push it to parts to have the full text
          if (s) parts.push(s);
        }
      }
    }
  } finally {
    // make sure clean up always happen in case the loop failed or succeeds, to save memory usage
    await pdf.destroy();
    await loadingTask.destroy();
  }
  // it should return the object with the details , break each part into its own line
  return { filePath, numPages, totalTextItems, text: parts.join("\n") };
}
