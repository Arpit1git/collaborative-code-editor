/**
 * commandBuilder.js
 * Translates programming language identifiers into the correct file extension,
 * file naming convention, and executable shell command.
 */

export const getLanguageConfig = (language, content = "") => {
    const lang = (language || "").toLowerCase().trim();

    switch (lang) {
        case "python":
        case "py":
            return {
                fileName: "code.py",
                // -u forces unbuffered stdout/stderr, guaranteeing prompt flushes
                command: "python3 -u code.py"
            };

        case "javascript":
        case "js":
        case "node":
            return {
                fileName: "code.js",
                command: "node code.js"
            };

        case "cpp":
        case "c++":
            return {
                fileName: "code.cpp",
                command: "g++ code.cpp -o output && ./output"
            };

        case "c":
            return {
                fileName: "code.c",
                command: "gcc code.c -o output && ./output"
            };

        case "java": {
            let fileName = "Main.java";
            const match = content.match(/public\s+class\s+([A-Za-z0-9_]+)/);
            if (match && match[1]) {
                fileName = `${match[1]}.java`;
            } else {
                fileName = "code.java";
            }
            return {
                fileName,
                command: `java ${fileName}`
            };
        }

        default:
            throw new Error(`Unsupported language: "${language}". Supported: python, cpp, c, javascript, java.`);
    }
};

export const getExtensionForLanguage = (language) => {
    const extensions = {
        python: '.py',
        javascript: '.js',
        cpp: '.cpp',
        'c++': '.cpp',
        c: '.c',
        java: '.java',
        bash: '.sh'
    };
    return extensions[language.toLowerCase()] || '.txt';
};
