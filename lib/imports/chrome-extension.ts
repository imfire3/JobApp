export const CHROME_EXTENSION_ZIP_URL = "/downloads/jobtracker-chrome-extension.zip"
export const CHROME_EXTENSION_DOWNLOAD_NAME = "jobtracker-chrome-extension.zip"
export const CHROME_EXTENSION_DOWNLOAD_APPROX_SIZE = "~ 16 KB"
export const CHROME_EXTENSIONS_URL = "chrome://extensions"

export const CHROME_EXTENSION_CSV_COLUMNS = [
  "source",
  "title",
  "company",
  "location",
  "remote",
  "salary",
  "posted_at",
  "url",
  "apply_url",
  "description",
] as const

export const CHROME_EXTENSION_UNZIPPED_TREE: Array<{
  name: string
  type: "folder" | "file"
  pad: string
}> = [
  { name: "jobtracker-chrome-extension/", type: "folder", pad: "" },
  { name: "manifest.json", type: "file", pad: "├── " },
  { name: "background.js", type: "file", pad: "├── " },
  { name: "content.js", type: "file", pad: "├── " },
  { name: "popup.html", type: "file", pad: "├── " },
  { name: "popup.js", type: "file", pad: "├── " },
  { name: "icons/", type: "folder", pad: "├── " },
  { name: "styles/", type: "folder", pad: "└── " },
]