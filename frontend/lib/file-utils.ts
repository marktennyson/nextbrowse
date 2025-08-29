import {
  DocumentTextIcon,
  CodeBracketIcon,
  PhotoIcon,
  FilmIcon,
  DocumentIcon,
  CubeTransparentIcon,
} from "@heroicons/react/24/outline";

export function getFileLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",

    // Web
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",

    // Python
    py: "python",
    pyx: "python",
    pyi: "python",

    // Java/C/C++
    java: "java",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    h: "c",
    hpp: "cpp",

    // C#
    cs: "csharp",

    // Go
    go: "go",

    // Rust
    rs: "rust",

    // PHP
    php: "php",

    // Ruby
    rb: "ruby",

    // Shell
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    fish: "shell",

    // Config/Data
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    ini: "ini",

    // Markdown
    md: "markdown",
    markdown: "markdown",

    // SQL
    sql: "sql",

    // Dockerfile
    dockerfile: "dockerfile",

    // Other
    txt: "plaintext",
    log: "plaintext",
  };

  return languageMap[ext || ""] || "plaintext";
}

export function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  // Programming files
  if (
    [
      "js",
      "jsx",
      "ts",
      "tsx",
      "py",
      "java",
      "c",
      "cpp",
      "cs",
      "go",
      "rs",
      "php",
      "rb",
      "html",
      "css",
      "scss",
      "sass",
    ].includes(ext || "")
  ) {
    return CodeBracketIcon;
  }

  // Images
  if (
    ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"].includes(
      ext || ""
    )
  ) {
    return PhotoIcon;
  }

  // Videos
  if (["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"].includes(ext || "")) {
    return FilmIcon;
  }

  // Documents
  if (["pdf", "doc", "docx", "txt", "md", "rtf"].includes(ext || "")) {
    return DocumentTextIcon;
  }

  // 3D/Models
  if (["obj", "fbx", "dae", "3ds", "blend", "max", "stl"].includes(ext || "")) {
    return CubeTransparentIcon;
  }

  return DocumentIcon;
}

export function isTextFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase();

  const textExtensions = [
    // Programming
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "java",
    "c",
    "cpp",
    "cc",
    "cxx",
    "h",
    "hpp",
    "cs",
    "go",
    "rs",
    "php",
    "rb",
    "sh",
    "bash",
    "zsh",
    "fish",

    // Web
    "html",
    "htm",
    "css",
    "scss",
    "sass",
    "less",

    // Config/Data
    "json",
    "xml",
    "yaml",
    "yml",
    "toml",
    "ini",
    "env",

    // Documentation
    "md",
    "markdown",
    "txt",
    "rst",
    "asciidoc",

    // Others
    "sql",
    "dockerfile",
    "gitignore",
    "log",
    "csv",
    "tsv",
  ];

  return textExtensions.includes(ext || "") || !ext;
}

export function isEditableFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase();

  const editableExtensions = [
    // Programming languages
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "pyx",
    "pyi",
    "java",
    "c",
    "cpp",
    "cc",
    "cxx",
    "h",
    "hpp",
    "cs",
    "go",
    "rs",
    "php",
    "rb",
    "sh",
    "bash",
    "zsh",
    "fish",
    "kt",
    "swift",

    // Web development
    "html",
    "htm",
    "css",
    "scss",
    "sass",
    "less",
    "vue",
    "svelte",

    // Config and data files
    "json",
    "xml",
    "yaml",
    "yml",
    "toml",
    "ini",
    "env",
    "conf",
    "config",

    // Documentation and text
    "md",
    "markdown",
    "txt",
    "rst",
    "asciidoc",
    "org",

    // Database and query files
    "sql",
    "sqlite",

    // Docker and deployment
    "dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",

    // Version control and project files
    "gitignore",
    "gitattributes",
    "readme",
    "license",
    "changelog",

    // Log and data files
    "log",
    "csv",
    "tsv",
    "properties",

    // Other common text files
    "makefile",
    "cmakelists.txt",
    "rakefile",
    "gemfile",
    "requirements.txt",
  ];

  // Check extension or if file has no extension (could be a config file)
  return (
    editableExtensions.includes(ext || "") ||
    (!ext &&
      Boolean(
        fileName
          .toLowerCase()
          .match(/^(readme|license|dockerfile|makefile|gemfile|rakefile)$/)
      ))
  );
}

export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
