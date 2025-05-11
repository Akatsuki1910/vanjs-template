import van from "vanjs-core";
import * as monaco from "monaco-editor";
import { getCssStyle } from "./ts/util";
import { p5SnippetsProvider } from "./ts/p5SnippetsProvider";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const { main, div, button, iframe, video } = van.tags;

const Hello = () => {
  let editor: monaco.editor.IStandaloneCodeEditor | null = null;

  window.addEventListener("DOMContentLoaded", () => {
    const dom = document.getElementById("container");
    if (!dom) return;
    monaco.languages.registerCompletionItemProvider(
      "javascript",
      new p5SnippetsProvider()
    );
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: true,
    });
    const p5TypeDefs = import.meta.glob("../node_modules/@types/p5/**/*.d.ts", {
      as: "raw",
      eager: true,
    });

    const files = Object.entries(p5TypeDefs).map(([path, module]) => {
      const name = path.replace("../node_modules/@types/p5/", "");
      return {
        name: `p5/${name}`,
        content: module,
      };
    });

    for (const file of files) {
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        file.content as string,
        file.name
      );
      monaco.editor.createModel(
        file.content as string,
        "typescript",
        monaco.Uri.file(file.name)
      );
    }

    editor = monaco.editor.create(dom, {
      value: `function setup() {
  createCanvas(400, 400);
  background(255);
}

function draw() {
  circle(mouseX, mouseY, 80);
}
`,
      language: "javascript",
      formatOnType: true,
      formatOnPaste: true,
      automaticLayout: true,
      theme: "vs-dark",
    });

    window.onresize = () => {
      editor?.layout();
    };

    setTimeout(() => {
      editor?.getAction("editor.action.formatDocument")?.run();
    }, 1000);
  });

  const handleRun = () => {
    if (!editor) return;
    const code = editor.getValue();
    const sandbox = document.getElementById("sandbox") as HTMLIFrameElement;
    if (sandbox) {
      sandbox.srcdoc = [
        "<script src='https://cdn.jsdelivr.net/npm/p5@2.0.1/lib/p5.min.js'></script>",
        "<script>" + code + "</script>",
        "<style>body { margin: 0; padding: 0; overflow: hidden; }</style>",
      ].join("\n");
    }
  };

  let webmUrl = van.state<string | null>(null);

  window.addEventListener("message", async (event) => {
    if (typeof event.data !== "string") return;
    const d = JSON.parse(event.data);
    if (d?.type === "webmData") {
      const { data } = d;
      console.log("webmData", data);

      const [header, base64] = data.split(",");
      const mimeMatch = header.match(/data:(.*);base64/);
      if (!mimeMatch) {
        console.error("Invalid base64 data URL");
        return;
      }

      const mime = mimeMatch[1];
      const binary = atob(base64); // base64 をバイナリにデコード
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const name = "record.webm";
      const outName = "out.gif";

      const blob = new Blob([bytes], { type: mime });
      console.log("blob", blob);
      webmUrl.val = URL.createObjectURL(blob);

      const file = new File([blob], name, {
        type: blob.type,
        lastModified: Date.now(),
      });
      // console.log("webmUrl", webmUrl);

      const ffmpeg = new FFmpeg();
      console.log("loading ffmpeg");
      const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
        workerURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.worker.js`,
          "text/javascript"
        ),
      });
      if (!ffmpeg.loaded) {
        console.error("ffmpeg not loaded");
        return;
      }
      console.log("ffmpeg loaded");

      ffmpeg.on("log", ({ message }) => {
        console.log("log:", message);
      });
      ffmpeg.on("progress", (v) => {
        console.log("progress:", v.progress, v.time);
      });

      const ffile = await fetchFile(file);
      console.log("ffile", ffile);
      await ffmpeg.writeFile(name, ffile);
      console.log("ffmpeg writeFile");
      await ffmpeg.exec(["-i", name, "fiexed.webm"]).catch((e) => {
        console.error("ffmpeg exec error:", e);
      });
      // await ffmpeg
      //   .exec([
      //     "-i",
      //     name,
      //     "-q:v",
      //     "10",
      //     "-vf",
      //     "fps=10,scale=400:-1:flags=lanczos",
      //     outName,
      //   ])
      //   .catch((e) => {
      //     console.error("ffmpeg exec error:", e);
      //   });
      // await ffmpeg.exec(["-i", "fixed.webm", outName]);

      console.log("ffmpeg exec");
      // const ffmpegData = await ffmpeg.readFile(outName);
      // console.log("data", ffmpegData);

      // const gifBlob = new Blob([ffmpegData], { type: "image/gif" });
      // const gifUrl = URL.createObjectURL(gifBlob);
      // const a = document.createElement("a");
      // a.href = gifUrl;
      // a.download = "out.gif";
      // a.click();
      // URL.revokeObjectURL(gifUrl);
    }
  });

  return main(
    {
      class: "main",
    },
    div({
      id: "container",
      class: "container",
    }),
    iframe({
      id: "sandbox",
      class: "sandbox",
      sandbox: "allow-same-origin allow-scripts allow-modals",
      style: getCssStyle({ height: "400px", width: "400px" }),
    }),
    div(
      { class: "buttons" },
      button({ onclick: handleRun }, "draw"),
      button(
        {
          onclick: () =>
            (
              document.getElementById("sandbox") as HTMLIFrameElement
            )?.contentWindow?.postMessage({ type: "saveGif" }, "*"),
        },
        "save"
      ),
      () =>
        video({
          controls: true,
          autoplay: true,
          loop: true,
          src: webmUrl.val,
          style: getCssStyle({ width: "400px", height: "400px" }),
        })
    )
  );
};

van.add(document.body, Hello());
